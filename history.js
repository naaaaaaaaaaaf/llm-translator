document.addEventListener('DOMContentLoaded', function() {
  // グローバル変数
  let historyData = [];
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let filteredData = [];
  let availableModels = []; // 利用可能なモデルのリスト
  
  // 翻訳履歴を読み込む
  loadHistory();
  
  // 設定ボタンのイベントリスナー
  document.getElementById('options-btn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // 履歴クリアボタンのイベントリスナー
  document.getElementById('clear-history-btn').addEventListener('click', function() {
    if (confirm('翻訳履歴をすべて削除してもよろしいですか？この操作は元に戻せません。')) {
      chrome.storage.local.set({ translationHistory: [] }, function() {
        loadHistory();
      });
    }
  });
  
  // 検索ボックスのイベントリスナー
  document.getElementById('search-box').addEventListener('input', function() {
    filterHistory();
  });
  
  // 言語フィルターのイベントリスナー
  document.getElementById('language-filter').addEventListener('change', function() {
    filterHistory();
  });
  
  // LLMサービスフィルターのイベントリスナー
  document.getElementById('service-filter').addEventListener('change', function() {
    updateModelFilterOptions(); // サービスが変更されたらモデルフィルターの選択肢を更新
    filterHistory();
  });
  
  // モデルフィルターのイベントリスナー
  document.getElementById('model-filter').addEventListener('change', function() {
    filterHistory();
  });
  
  // 履歴データを読み込む関数
  function loadHistory() {
    chrome.storage.local.get(['translationHistory'], function(result) {
      historyData = result.translationHistory || [];
      
      // 利用可能なモデルリストを抽出
      extractAvailableModels();
      
      // モデルフィルターのオプションを更新
      updateModelFilterOptions();
      
      filterHistory();
    });
  }
  
  // 利用可能なモデルを抽出する関数
  function extractAvailableModels() {
    availableModels = {};
    
    // 各サービスで使用されているモデルを抽出
    historyData.forEach(function(item) {
      const service = item.service || 'unknown';
      const model = item.model || 'unknown';
      
      if (!availableModels[service]) {
        availableModels[service] = new Set();
      }
      
      availableModels[service].add(model);
    });
  }
  
  // モデルフィルターのオプションを更新する関数
  function updateModelFilterOptions() {
    const modelFilter = document.getElementById('model-filter');
    const serviceFilter = document.getElementById('service-filter').value;
    
    // 現在の選択を保存
    const currentSelection = modelFilter.value;
    
    // オプションをクリア (最初の「すべてのモデル」オプションは保持)
    while (modelFilter.options.length > 1) {
      modelFilter.remove(1);
    }
    
    // 選択されたサービスのモデルのみ表示するか、すべてのモデルを表示
    const modelsToShow = (serviceFilter === 'all') ? availableModels : { [serviceFilter]: availableModels[serviceFilter] };
    
    // モデルオプションを追加
    for (const service in modelsToShow) {
      if (modelsToShow[service]) {
        // Set を配列に変換して並べ替え
        const models = Array.from(modelsToShow[service]).sort();
        
        models.forEach(function(model) {
          if (model && model !== 'unknown') {
            const option = document.createElement('option');
            option.value = model;
            
            // モデル名とサービス名の組み合わせを表示（サービスフィルターが「すべて」の場合）
            if (serviceFilter === 'all') {
              const serviceNames = {
                'openai': 'ChatGPT',
                'claude': 'Claude',
                'gemini': 'Gemini',
                'unknown': '不明'
              };
              option.textContent = `${model} (${serviceNames[service] || service})`;
            } else {
              option.textContent = model;
            }
            
            modelFilter.appendChild(option);
          }
        });
      }
    }
    
    // 前回の選択を復元（可能な場合）
    if (currentSelection !== 'all') {
      const optionExists = Array.from(modelFilter.options).some(option => option.value === currentSelection);
      if (optionExists) {
        modelFilter.value = currentSelection;
      } else {
        modelFilter.value = 'all'; // 前回の選択が無効なら「すべて」にリセット
      }
    }
  }
  
  // 特定の履歴アイテムを削除する関数
  function deleteHistoryItem(index) {
    if (confirm('この翻訳履歴を削除してもよろしいですか？')) {
      // フィルターされたデータから元のデータのインデックスを取得
      const itemToDelete = filteredData[index];
      const originalIndex = historyData.findIndex(item => 
        item.timestamp === itemToDelete.timestamp && 
        item.original === itemToDelete.original &&
        item.translated === itemToDelete.translated
      );
      
      if (originalIndex !== -1) {
        // 履歴から項目を削除
        historyData.splice(originalIndex, 1);
        
        // ストレージを更新
        chrome.storage.local.set({ translationHistory: historyData }, function() {
          // 利用可能なモデルリストを再抽出
          extractAvailableModels();
          
          // モデルフィルターのオプションを更新
          updateModelFilterOptions();
          
          // 画面を更新
          filterHistory();
        });
      }
    }
  }
  
  // 履歴データをフィルタリングする関数
  function filterHistory() {
    const searchText = document.getElementById('search-box').value.toLowerCase();
    const languageFilter = document.getElementById('language-filter').value;
    const serviceFilter = document.getElementById('service-filter').value;
    const modelFilter = document.getElementById('model-filter').value;
    
    // 検索テキストと各種フィルターを適用
    filteredData = historyData.filter(function(item) {
      const matchesSearch = !searchText || 
        item.original.toLowerCase().includes(searchText) || 
        item.translated.toLowerCase().includes(searchText);
      
      const matchesLanguage = languageFilter === 'all' || item.language === languageFilter;
      
      // LLMサービスフィルター
      const matchesService = serviceFilter === 'all' || item.service === serviceFilter;
      
      // モデルバージョンフィルター
      const matchesModel = modelFilter === 'all' || item.model === modelFilter;
      
      return matchesSearch && matchesLanguage && matchesService && matchesModel;
    });
    
    // 最初のページを表示
    currentPage = 1;
    displayHistory();
  }
  
  // 履歴データを表示する関数
  function displayHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '';
    
    // データがない場合
    if (filteredData.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'history-empty';
      emptyMessage.textContent = '翻訳履歴がありません';
      container.appendChild(emptyMessage);
      
      // ページネーションを非表示
      document.getElementById('pagination').innerHTML = '';
      return;
    }
    
    // ページネーションの計算
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length);
    const pageItems = filteredData.slice(startIndex, endIndex);
    
    // 言語名のマッピング
    const langNames = {
      'ja': '日本語',
      'en': '英語',
      'fr': 'フランス語',
      'es': 'スペイン語',
      'de': 'ドイツ語',
      'zh': '中国語',
      'ko': '韓国語'
    };
    
    // LLMサービス名のマッピング
    const serviceNames = {
      'openai': 'ChatGPT',
      'claude': 'Claude',
      'gemini': 'Gemini'
    };
    
    // 各履歴アイテムを表示
    pageItems.forEach(function(item, index) {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      // ヘッダー部分
      const header = document.createElement('div');
      header.className = 'history-header';
      
      // タイムスタンプ
      const timestamp = document.createElement('div');
      timestamp.className = 'history-timestamp';
      let dateStr = '日時不明';
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        dateStr = date.toLocaleString();
      }
      timestamp.textContent = dateStr;
      
      // バッジとアクションボタンのコンテナ
      const headerRightContainer = document.createElement('div');
      headerRightContainer.style.display = 'flex';
      headerRightContainer.style.alignItems = 'center';
      headerRightContainer.style.gap = '15px';
      
      // バッジのコンテナ
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'history-badges';
      badgesContainer.style.display = 'flex';
      badgesContainer.style.gap = '8px';
      
      // 言語バッジ
      const languageBadge = document.createElement('div');
      languageBadge.className = 'history-language';
      languageBadge.textContent = langNames[item.language] || item.language || '言語不明';
      
      // LLMサービスバッジ
      const serviceBadge = document.createElement('div');
      serviceBadge.className = 'history-service';
      serviceBadge.style.display = 'inline-block';
      serviceBadge.style.backgroundColor = '#e6f4ea';
      serviceBadge.style.padding = '3px 8px';
      serviceBadge.style.borderRadius = '20px';
      serviceBadge.style.fontSize = '12px';
      serviceBadge.style.color = '#137333';
      serviceBadge.textContent = serviceNames[item.service] || item.service || 'AI不明';
      
      // モデルバージョンバッジ
      if (item.model) {
        const modelBadge = document.createElement('div');
        modelBadge.className = 'history-model';
        modelBadge.style.display = 'inline-block';
        modelBadge.style.backgroundColor = '#fef7e0'; // 薄い黄色
        modelBadge.style.padding = '3px 8px';
        modelBadge.style.borderRadius = '20px';
        modelBadge.style.fontSize = '12px';
        modelBadge.style.color = '#b06000'; // 茶色
        modelBadge.textContent = item.model;
        badgesContainer.appendChild(modelBadge);
      }
      
      badgesContainer.appendChild(languageBadge);
      badgesContainer.appendChild(serviceBadge);
      
      // 削除ボタン
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-danger';
      deleteButton.style.padding = '4px 10px';
      deleteButton.style.fontSize = '12px';
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation(); // イベントの伝播を止める
        deleteHistoryItem(startIndex + index);
      });
      
      headerRightContainer.appendChild(badgesContainer);
      headerRightContainer.appendChild(deleteButton);
      
      header.appendChild(timestamp);
      header.appendChild(headerRightContainer);
      
      // コンテンツ部分
      const content = document.createElement('div');
      content.className = 'history-content';
      
      // 元のテキスト
      const original = document.createElement('div');
      original.className = 'history-original';
      
      const originalLabel = document.createElement('div');
      originalLabel.className = 'history-label';
      originalLabel.textContent = '元のテキスト';
      
      const originalText = document.createElement('div');
      originalText.className = 'history-text';
      originalText.textContent = item.original;
      
      original.appendChild(originalLabel);
      original.appendChild(originalText);
      
      // 翻訳されたテキスト
      const translated = document.createElement('div');
      translated.className = 'history-translated';
      
      const translatedLabel = document.createElement('div');
      translatedLabel.className = 'history-label';
      translatedLabel.textContent = '翻訳';
      
      const translatedText = document.createElement('div');
      translatedText.className = 'history-text';
      translatedText.textContent = item.translated;
      
      // コピーボタン
      const copyButton = document.createElement('button');
      copyButton.className = 'btn btn-secondary';
      copyButton.style.marginTop = '10px';
      copyButton.textContent = 'コピー';
      copyButton.addEventListener('click', function() {
        navigator.clipboard.writeText(item.translated)
          .then(() => showCopySuccess())
          .catch(err => console.error('コピーに失敗しました:', err));
      });
      
      translated.appendChild(translatedLabel);
      translated.appendChild(translatedText);
      translated.appendChild(copyButton);
      
      content.appendChild(original);
      content.appendChild(translated);
      
      // アイテムを組み立て
      historyItem.appendChild(header);
      historyItem.appendChild(content);
      
      container.appendChild(historyItem);
    });
    
    // ページネーションを更新
    updatePagination();
  }
  
  // ページネーションを更新する関数
  function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
      return;
    }
    
    // 「前へ」ボタン
    if (currentPage > 1) {
      const prevButton = document.createElement('button');
      prevButton.className = 'page-btn';
      prevButton.textContent = '前へ';
      prevButton.addEventListener('click', function() {
        currentPage--;
        displayHistory();
      });
      pagination.appendChild(prevButton);
    }
    
    // ページ番号ボタン
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = 'page-btn' + (i === currentPage ? ' active' : '');
      pageButton.textContent = i;
      pageButton.addEventListener('click', function() {
        currentPage = i;
        displayHistory();
      });
      pagination.appendChild(pageButton);
    }
    
    // 「次へ」ボタン
    if (currentPage < totalPages) {
      const nextButton = document.createElement('button');
      nextButton.className = 'page-btn';
      nextButton.textContent = '次へ';
      nextButton.addEventListener('click', function() {
        currentPage++;
        displayHistory();
      });
      pagination.appendChild(nextButton);
    }
  }
  
  // コピー成功時の表示
  function showCopySuccess() {
    const copySuccess = document.getElementById('copy-success');
    copySuccess.style.display = 'block';
    
    setTimeout(() => {
      copySuccess.style.display = 'none';
    }, 2000);
  }
});