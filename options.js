document.addEventListener('DOMContentLoaded', function() {
  // デフォルトのモデル定義
  const defaultModels = {
    'openai': {
      'gpt-4o-mini-2024-07-18': 'GPT-4o mini',
      'gpt-4o-2024-08-06': 'GPT-4o',
      'gpt-4.1-2025-04-14': 'GPT-4.1'
    },
    'claude': {
      'claude-3-haiku-20240307': 'Claude 3 Haiku',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet'
    },
    'gemini': {
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
      'gemini-2.5-pro-preview-03-25': 'Gemini 2.5 Pro プレビュー',
      'gemini-2.5-flash-preview-04-17': 'Gemini 2.5 Flash プレビュー版 04-17',

    }
  };
  
  // カスタムモデルを含む全モデルの保存用データ
  let allModels = {
    'openai': {...defaultModels['openai']},
    'claude': {...defaultModels['claude']},
    'gemini': {...defaultModels['gemini']}
  };

  // 保存されている設定を読み込む
  chrome.storage.sync.get([
    'openai_api_key', 
    'claude_api_key',
    'gemini_api_key',
    'target_lang', 
    'llm_service', 
    'openai_model', 
    'claude_model', 
    'gemini_model',
    'custom_models' // カスタムモデルデータ
  ], function(result) {
    // OpenAI APIキー
    if (result.openai_api_key) {
      document.getElementById('openai-key').value = result.openai_api_key;
    }
    
    // Claude APIキー
    if (result.claude_api_key) {
      document.getElementById('claude-key').value = result.claude_api_key;
    }
    
    // Gemini APIキー
    if (result.gemini_api_key) {
      document.getElementById('gemini-key').value = result.gemini_api_key;
    }
    
    if (result.target_lang) {
      document.getElementById('target-lang').value = result.target_lang;
    } else {
      // デフォルトは日本語
      document.getElementById('target-lang').value = 'ja';
    }
    
    // カスタムモデルがあれば読み込む
    if (result.custom_models) {
      // ストレージから読み込んだカスタムモデルをマージ
      for (const service in result.custom_models) {
        Object.assign(allModels[service], result.custom_models[service]);
      }
      
      // カスタムモデルを各サービスのselectに追加
      updateModelSelectOptions();
    }
    
    // モデルリストを表示
    updateModelLists();
    
    if (result.llm_service) {
      document.getElementById('llm-service').value = result.llm_service;
      // モデル選択メニューを更新
      updateModelOptions(result.llm_service);
      // APIキー入力欄を更新
      updateApiKeyInput(result.llm_service);
    } else {
      // デフォルトではOpenAIのAPIキー入力欄を表示
      updateApiKeyInput('openai');
    }
    
    // モデルの設定を復元
    if (result.openai_model) {
      document.getElementById('openai-model').value = result.openai_model;
    }
    
    if (result.claude_model) {
      document.getElementById('claude-model').value = result.claude_model;
    }
    
    if (result.gemini_model) {
      document.getElementById('gemini-model').value = result.gemini_model;
    }
  });

  // モデル追加ボタンのイベントリスナーを設定
  document.getElementById('openai-add-model').addEventListener('click', function() {
    addCustomModel('openai');
  });
  
  document.getElementById('claude-add-model').addEventListener('click', function() {
    addCustomModel('claude');
  });
  
  document.getElementById('gemini-add-model').addEventListener('click', function() {
    addCustomModel('gemini');
  });

  // LLMサービス選択のイベントリスナー
  document.getElementById('llm-service').addEventListener('change', function() {
    const serviceId = this.value;
    updateModelOptions(serviceId);
    updateApiKeyInput(serviceId);
  });

  // 保存ボタンのイベントリスナー
  document.getElementById('save-btn').addEventListener('click', function() {
    // 各サービスのAPIキーを取得
    const openaiKey = document.getElementById('openai-key').value.trim();
    const claudeKey = document.getElementById('claude-key').value.trim();
    const geminiKey = document.getElementById('gemini-key').value.trim();
    console.log('OpenAI API Key:', openaiKey);
    console.log('Claude API Key:', claudeKey);
    console.log('Gemini API Key:', geminiKey);
    const targetLang = document.getElementById('target-lang').value;
    const llmService = document.getElementById('llm-service').value;
    const status = document.getElementById('status');
    
    // 選択されたサービスに応じたモデルを取得
    const openaiModel = document.getElementById('openai-model').value;
    const claudeModel = document.getElementById('claude-model').value;
    const geminiModel = document.getElementById('gemini-model').value;
    
    // 現在選択中のサービスのAPIキーをチェック
    let currentApiKey = '';
    if (llmService === 'openai') {
      currentApiKey = openaiKey;
    } else if (llmService === 'claude') {
      currentApiKey = claudeKey;
    } else if (llmService === 'gemini') {
      currentApiKey = geminiKey;
    }
    
    if (!currentApiKey) {
      status.textContent = '選択中のサービスのAPIキーを入力してください';
      status.className = 'error';
      status.style.display = 'block';
      return;
    }
    
    // カスタムモデルデータを作成
    const customModels = extractCustomModels();
    
    // 設定を保存
    chrome.storage.sync.set({
      'openai_api_key': openaiKey,
      'claude_api_key': claudeKey,
      'gemini_api_key': geminiKey,
      'target_lang': targetLang,
      'llm_service': llmService,
      'openai_model': openaiModel,
      'claude_model': claudeModel,
      'gemini_model': geminiModel,
      'custom_models': customModels // カスタムモデル情報を保存
    }, function() {
      // 使用するサービス名とモデル名を取得
      const serviceName = getLLMServiceName(llmService);
      
      // 現在選択されているモデル名を取得
      let modelName = "";
      if (llmService === 'openai') {
        modelName = allModels['openai'][openaiModel] || openaiModel;
      } else if (llmService === 'claude') {
        modelName = allModels['claude'][claudeModel] || claudeModel;
      } else if (llmService === 'gemini') {
        modelName = allModels['gemini'][geminiModel] || geminiModel;
      }
      
      status.textContent = `設定を保存しました (${serviceName} - ${modelName})`;
      status.className = 'success';
      status.style.display = 'block';
      
      // 3秒後にステータスメッセージを消す
      setTimeout(function() {
        status.style.display = 'none';
      }, 3000);
    });
  });
  
  // カスタムモデルを追加する関数
  function addCustomModel(serviceId) {
    const modelIdElement = document.getElementById(`${serviceId}-model-id`);
    const modelNameElement = document.getElementById(`${serviceId}-model-name`);
    
    const modelId = modelIdElement.value.trim();
    const modelName = modelNameElement.value.trim();
    
    if (!modelId || !modelName) {
      alert('モデルIDと表示名の両方を入力してください');
      return;
    }
    
    // モデルIDが既に存在する場合は上書きの確認
    if (allModels[serviceId][modelId]) {
      if (!confirm(`モデル "${modelId}" は既に存在します。上書きしますか？`)) {
        return;
      }
    }
    
    // モデルを追加
    allModels[serviceId][modelId] = modelName;
    
    // 入力欄をクリア
    modelIdElement.value = '';
    modelNameElement.value = '';
    
    // モデルのセレクトオプションを更新
    updateModelSelectOptions();
    
    // モデルリストを更新
    updateModelLists();
  }
  
  // カスタムモデルを削除する関数（イベントリスナーとして使用）
  function removeCustomModel(serviceId, modelId) {
    // デフォルトモデルは削除できない
    if (defaultModels[serviceId] && defaultModels[serviceId][modelId]) {
      alert('デフォルトモデルは削除できません');
      return;
    }
    
    // 確認ダイアログ
    if (confirm(`モデル "${allModels[serviceId][modelId]}" を削除しますか？`)) {
      // モデルを削除
      delete allModels[serviceId][modelId];
      
      // モデルのセレクトオプションを更新
      updateModelSelectOptions();
      
      // モデルリストを更新
      updateModelLists();
    }
  }
  
  // カスタムモデルのみを抽出する関数
  function extractCustomModels() {
    const customModels = {
      'openai': {},
      'claude': {},
      'gemini': {}
    };
    
    // 各サービスごとにカスタムモデルを抽出
    for (const serviceId in allModels) {
      for (const modelId in allModels[serviceId]) {
        // デフォルトモデルではない場合のみ追加
        if (!defaultModels[serviceId][modelId]) {
          customModels[serviceId][modelId] = allModels[serviceId][modelId];
        }
      }
    }
    
    return customModels;
  }
  
  // モデルのセレクトオプションを更新する関数
  function updateModelSelectOptions() {
    const services = ['openai', 'claude', 'gemini'];
    
    services.forEach(serviceId => {
      const selectElement = document.getElementById(`${serviceId}-model`);
      
      // 既存のオプションをクリア（デフォルトモデル以外）
      Array.from(selectElement.options).forEach(option => {
        if (!defaultModels[serviceId][option.value]) {
          selectElement.removeChild(option);
        }
      });
      
      // カスタムモデルを追加
      for (const modelId in allModels[serviceId]) {
        // デフォルトモデルではない場合のみ追加
        if (!defaultModels[serviceId][modelId]) {
          const option = document.createElement('option');
          option.value = modelId;
          option.textContent = allModels[serviceId][modelId];
          selectElement.appendChild(option);
        }
      }
    });
  }
  
  // モデルリストを更新する関数
  function updateModelLists() {
    const services = ['openai', 'claude', 'gemini'];
    
    services.forEach(serviceId => {
      const listElement = document.getElementById(`${serviceId}-model-list`);
      
      // リストをクリア
      listElement.innerHTML = '';
      
      // モデルをリストに追加
      for (const modelId in allModels[serviceId]) {
        const modelName = allModels[serviceId][modelId];
        
        const item = document.createElement('div');
        item.className = 'model-item';
        
        // モデル情報
        const modelInfo = document.createElement('span');
        modelInfo.textContent = `${modelName} (${modelId})`;
        item.appendChild(modelInfo);
        
        // 削除ボタン（デフォルトモデルの場合は表示しない）
        if (!defaultModels[serviceId][modelId]) {
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '削除';
          removeBtn.onclick = function() {
            removeCustomModel(serviceId, modelId);
          };
          item.appendChild(removeBtn);
        }
        
        listElement.appendChild(item);
      }
    });
  }
  
  // 選択されたLLMサービスに応じてAPIキー入力欄を表示/非表示にする関数
  function updateApiKeyInput(serviceId) {
    // すべてのAPIキー入力欄を一旦非表示
    document.querySelectorAll('.api-service-key').forEach(el => {
      el.style.display = 'none';
    });
    
    // 選択されたサービスのAPIキー入力欄を表示
    if (serviceId === 'openai') {
      document.getElementById('openai-api-key').style.display = 'block';
    } else if (serviceId === 'claude') {
      document.getElementById('claude-api-key').style.display = 'block';
    } else if (serviceId === 'gemini') {
      document.getElementById('gemini-api-key').style.display = 'block';
    }
  }
  
  // LLMサービスに応じてモデル選択オプションを表示/非表示にする関数
  function updateModelOptions(serviceId) {
    // すべてのモデル選択メニューを一旦非表示
    document.querySelectorAll('.model-options').forEach(el => {
      el.style.display = 'none';
    });
    
    // 選択されたサービスのモデル選択メニューを表示
    if (serviceId === 'openai') {
      document.getElementById('openai-models').style.display = 'block';
    } else if (serviceId === 'claude') {
      document.getElementById('claude-models').style.display = 'block';
    } else if (serviceId === 'gemini') {
      document.getElementById('gemini-models').style.display = 'block';
    }
  }
  
  // LLMサービス名を取得する関数
  function getLLMServiceName(serviceId) {
    const serviceNames = {
      'openai': 'ChatGPT',
      'claude': 'Claude',
      'gemini': 'Gemini'
    };
    
    return serviceNames[serviceId] || 'ChatGPT';
  }
});