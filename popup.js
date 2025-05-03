document.addEventListener('DOMContentLoaded', function() {
  // API Keyが設定されているか確認
  chrome.storage.sync.get(['openai_api_key', 'llm_service'], function(result) {
    const status = document.getElementById('status');
    
    if (result.openai_api_key) {
      // LLMサービスの名前を取得
      const serviceName = getLLMServiceName(result.llm_service || 'openai');
      status.textContent = `APIキーが設定されています（${serviceName}）`;
    } else {
      status.textContent = 'APIキーが設定されていません。設定画面から設定してください。';
    }
  });
  
  // 設定ボタンのイベントリスナー
  document.getElementById('options-btn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // 履歴ボタンのイベントリスナー
  document.getElementById('history-btn').addEventListener('click', function() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("history.html")
    });
  });
  
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