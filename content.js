// 選択されたテキストを翻訳するためのコンテンツスクリプト
let selectedText = '';
let translationPopup = null;

// テキスト選択時のイベントリスナー
document.addEventListener('mouseup', function() {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // 選択テキストがある場合、バックグラウンドスクリプトに通知
  if (selectedText) {
    chrome.runtime.sendMessage({
      action: 'textSelected',
      text: selectedText
    });
  }
});

// バックグラウンドスクリプトからのメッセージを受け取る
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showTranslation') {
    // 既存のポップアップがあれば削除する
    if (translationPopup && document.body.contains(translationPopup)) {
      document.body.removeChild(translationPopup);
    }
    
    // 翻訳結果を表示するポップアップを作成
    translationPopup = document.createElement('div');
    
    // ポップアップのスタイル設定
    Object.assign(translationPopup.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 15px rgba(0,0,0,0.3)',
      zIndex: '10000',
      width: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      border: '1px solid #e0e0e0',
      color: '#333'
    });
    
    // ポップアップのヘッダー部分
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      paddingBottom: '10px',
      borderBottom: '1px solid #eee'
    });
    
    const title = document.createElement('h3');
    title.textContent = 'LLM Translator';
    Object.assign(title.style, {
      margin: '0',
      color: '#4285f4'
    });
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    Object.assign(closeButton.style, {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: '#666',
      padding: '0 5px'
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // コンテンツ部分のコンテナ
    const contentContainer = document.createElement('div');
    Object.assign(contentContainer.style, {
      padding: '5px 0'
    });
    
    // 元のテキスト部分
    const originalSection = document.createElement('div');
    Object.assign(originalSection.style, {
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #e0e0e0'
    });
    
    const originalLabel = document.createElement('div');
    originalLabel.textContent = '元のテキスト:';
    Object.assign(originalLabel.style, {
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#555'
    });
    
    const originalText = document.createElement('div');
    originalText.textContent = selectedText;
    
    originalSection.appendChild(originalLabel);
    originalSection.appendChild(originalText);
    
    // 翻訳テキスト部分
    const translatedSection = document.createElement('div');
    Object.assign(translatedSection.style, {
      padding: '10px',
      backgroundColor: '#e8f0fe',
      borderRadius: '4px',
      border: '1px solid #c6d8f6'
    });
    
    const translatedLabel = document.createElement('div');
    translatedLabel.textContent = '翻訳:';
    Object.assign(translatedLabel.style, {
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#4285f4'
    });
    
    const translatedText = document.createElement('div');
    translatedText.textContent = request.translatedText;
    
    translatedSection.appendChild(translatedLabel);
    translatedSection.appendChild(translatedText);
    
    contentContainer.appendChild(originalSection);
    contentContainer.appendChild(translatedSection);
    
    // フッター部分（コピーボタンなど）
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      marginTop: '15px',
      display: 'flex',
      justifyContent: 'flex-end'
    });
    
    const copyButton = document.createElement('button');
    copyButton.textContent = '翻訳をコピー';
    Object.assign(copyButton.style, {
      padding: '6px 12px',
      backgroundColor: '#4285f4',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginLeft: '10px',
      fontSize: '13px'
    });
    
    footer.appendChild(copyButton);
    
    // ポップアップに各要素を追加
    translationPopup.appendChild(header);
    translationPopup.appendChild(contentContainer);
    translationPopup.appendChild(footer);
    
    document.body.appendChild(translationPopup);
    
    // ドラッグ可能にするための変数
    let isDragging = false;
    let offsetX, offsetY;
    
    // ドラッグ機能の追加（ヘッダーからのみドラッグ可能）
    header.addEventListener('mousedown', function(e) {
      if (e.target === closeButton) return;
      isDragging = true;
      offsetX = e.clientX - translationPopup.getBoundingClientRect().left;
      offsetY = e.clientY - translationPopup.getBoundingClientRect().top;
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      translationPopup.style.left = (e.clientX - offsetX) + 'px';
      translationPopup.style.top = (e.clientY - offsetY) + 'px';
      translationPopup.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });
    
    // 閉じるボタンのクリックイベント
    closeButton.addEventListener('click', function() {
      if (document.body.contains(translationPopup)) {
        document.body.removeChild(translationPopup);
        translationPopup = null;
      }
    });
    
    // コピーボタンのクリックイベント
    copyButton.addEventListener('click', function() {
      navigator.clipboard.writeText(request.translatedText)
        .then(() => {
          const originalText = copyButton.textContent;
          copyButton.textContent = 'コピーしました！';
          copyButton.style.backgroundColor = '#34a853';
          
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.backgroundColor = '#4285f4';
          }, 2000);
        })
        .catch(err => {
          console.error('クリップボードへのコピーに失敗しました:', err);
        });
    });
    
    sendResponse({success: true});
  }
  
  return true;
});