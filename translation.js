document.addEventListener('DOMContentLoaded', function() {
  // ローカルストレージから一時保存された翻訳データを取得
  chrome.storage.local.get(['tempTranslation'], function(result) {
    if (result.tempTranslation) {
      displayTranslation(result.tempTranslation);
    } else {
      // データがない場合はエラーメッセージ
      document.getElementById('original-content').textContent = 'データが見つかりませんでした。';
      document.getElementById('translated-content').textContent = 'データが見つかりませんでした。';
    }
  });
  
  // 履歴ボタンのクリックイベント
  document.getElementById('history-btn').addEventListener('click', function() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("history.html")
    });
  });
  
  // 設定ボタンのクリックイベント
  document.getElementById('options-btn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // コピーボタンのクリックイベント
  document.getElementById('copy-btn').addEventListener('click', function() {
    const translatedContent = document.getElementById('translated-content').textContent;
    
    if (translatedContent) {
      navigator.clipboard.writeText(translatedContent)
        .then(() => showCopySuccess())
        .catch(err => console.error('コピーに失敗しました:', err));
    }
  });
});

// 翻訳データを表示する関数
function displayTranslation(data) {
  document.getElementById('original-content').textContent = data.original;
  document.getElementById('translated-content').textContent = data.translated;
  
  // 言語バッジの表示
  if (data.language) {
    const langNames = {
      'ja': '日本語',
      'en': '英語',
      'fr': 'フランス語',
      'es': 'スペイン語',
      'de': 'ドイツ語',
      'zh': '中国語',
      'ko': '韓国語'
    };
    
    const langBadge = document.getElementById('lang-badge');
    langBadge.textContent = langNames[data.language] || data.language || '言語不明';
  }
  
  // LLMサービスバッジの表示
  if (data.service) {
    const serviceNames = {
      'openai': 'ChatGPT',
      'claude': 'Claude',
      'gemini': 'Gemini'
    };
    
    const llmBadge = document.getElementById('llm-badge');
    llmBadge.textContent = serviceNames[data.service] || data.service || 'AI不明';
  }
  
  // モデルバージョンバッジの表示
  if (data.model) {
    const modelBadge = document.getElementById('model-badge');
    modelBadge.textContent = data.model;
    modelBadge.style.display = 'inline-block';
  } else {
    document.getElementById('model-badge').style.display = 'none';
  }
  
  // エラーの場合の表示調整
  if (data.isError) {
    document.querySelector('.translated-text').classList.add('error');
  }
  
  // タイムスタンプの表示
  const timestamp = document.getElementById('timestamp');
  timestamp.textContent = new Date().toLocaleString();
}

// コピー成功時の表示
function showCopySuccess() {
  const copySuccess = document.getElementById('copy-success');
  copySuccess.style.display = 'block';
  
  setTimeout(() => {
    copySuccess.style.display = 'none';
  }, 2000);
}