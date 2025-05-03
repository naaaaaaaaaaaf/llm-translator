// バックグラウンドスクリプト - コンテキストメニューの作成と翻訳処理

// コンテキストメニュー項目の作成
chrome.runtime.onInstalled.addListener(function() {
  // 翻訳メニュー (タブで表示のみ)
  chrome.contextMenus.create({
    id: "translateInNewTab",
    title: "選択テキストを翻訳",
    contexts: ["selection"]
  });
  
  // 翻訳履歴表示メニュー
  chrome.contextMenus.create({
    id: "showTranslationHistory",
    title: "翻訳履歴を表示",
    contexts: ["page"]
  });
  
  // 履歴用のストレージを初期化
  chrome.storage.local.get(['translationHistory'], function(result) {
    if (!result.translationHistory) {
      chrome.storage.local.set({ translationHistory: [] });
    }
  });
});

// コンテキストメニューのクリックイベント
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "translateInNewTab") {
    // 選択されたテキストを取得
    const text = info.selectionText;
    
    if (text) {
      // 設定を取得
      chrome.storage.sync.get([
        'openai_api_key', 
        'claude_api_key',
        'gemini_api_key',
        'target_lang', 
        'llm_service', 
        'openai_model', 
        'claude_model', 
        'gemini_model'
      ], function(result) {
        // 使用するLLMサービス（デフォルトはOpenAI）
        const llmService = result.llm_service || 'openai';
        
        // 選択されたサービスに対応するAPIキーを取得
        let apiKey = null;
        if (llmService === 'openai') {
          apiKey = result.openai_api_key;
        } else if (llmService === 'claude') {
          apiKey = result.claude_api_key;
        } else if (llmService === 'gemini') {
          apiKey = result.gemini_api_key;
        }

        if (!apiKey) {
          // APIキーが設定されていない場合、設定画面を開く
          chrome.runtime.openOptionsPage();
          return;
        }
        
        // 翻訳先言語（デフォルトは日本語）
        const targetLang = result.target_lang || 'ja';
        
        // 使用するモデルを取得
        let modelId = null;
        if (llmService === 'openai') {
          modelId = result.openai_model || 'gpt-4o-mini-2024-07-18';
        } else if (llmService === 'claude') {
          modelId = result.claude_model || 'claude-3-haiku-20240307';
        } else if (llmService === 'gemini') {
          modelId = result.gemini_model || 'gemini-1.5-flash';
        }
        
        // 翻訳実行（常に新しいタブで表示）
        translateWithLLM(text, apiKey, targetLang, llmService, tab.id, modelId);
      });
    }
  } else if (info.menuItemId === "showTranslationHistory") {
    // 翻訳履歴ページを新しいタブで開く
    chrome.tabs.create({
      url: chrome.runtime.getURL("history.html")
    });
  }
});

// メッセージ受信リスナー
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'textSelected') {
    // テキストが選択されたことを検知
    sendResponse({success: true});
  }
  return true;
});

// 履歴に翻訳を追加する関数
function addToHistory(originalText, translatedText, targetLang, llmService, modelId) {
  chrome.storage.local.get(['translationHistory'], function(result) {
    let history = result.translationHistory || [];
    
    // 履歴の最大数を制限（例：最新の100件）
    if (history.length >= 100) {
      history.pop(); // 最も古い履歴を削除
    }
    
    // 新しい履歴を追加
    history.unshift({
      original: originalText,
      translated: translatedText,
      language: targetLang,
      service: llmService,
      model: modelId, // モデル情報を追加
      timestamp: new Date().toISOString()
    });
    
    // 更新された履歴を保存
    chrome.storage.local.set({ translationHistory: history });
  });
}

// LLMを使って翻訳する関数
async function translateWithLLM(text, apiKey, targetLang, llmService, tabId, modelId) {
  try {
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
    
    const targetLangName = langNames[targetLang] || targetLang;
    let translatedText = '';
    
    // 選択されたLLMサービスに基づいて翻訳を実行
    if (llmService === 'openai') {
      translatedText = await translateWithOpenAI(text, apiKey, targetLangName, modelId);
    } else if (llmService === 'claude') {
      translatedText = await translateWithClaude(text, apiKey, targetLangName, modelId);
    } else if (llmService === 'gemini') {
      translatedText = await translateWithGemini(text, apiKey, targetLangName, modelId);
    } else {
      // デフォルトはOpenAI
      translatedText = await translateWithOpenAI(text, apiKey, targetLangName, modelId);
    }
    
    // 履歴に追加
    addToHistory(text, translatedText, targetLang, llmService, modelId);
    
    // 常に新しいタブで翻訳結果を表示
    const translationData = {
      original: text,
      translated: translatedText,
      language: targetLang,
      service: llmService,
      model: modelId // モデル情報を追加
    };
    
    // データをローカルストレージに一時保存
    chrome.storage.local.set({ tempTranslation: translationData }, function() {
      // 新しいタブでtranslation.htmlを開く
      chrome.tabs.create({
        url: chrome.runtime.getURL("translation.html")
      });
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // エラーメッセージを新しいタブで表示
    const errorData = {
      original: text,
      translated: `翻訳エラー: ${error.message}`,
      isError: true,
      service: llmService,
      model: modelId // エラー時もモデル情報を含める
    };
    
    chrome.storage.local.set({ tempTranslation: errorData }, function() {
      chrome.tabs.create({
        url: chrome.runtime.getURL("translation.html")
      });
    });
  }
}

// OpenAI (ChatGPT) APIを使って翻訳する関数
async function translateWithOpenAI(text, apiKey, targetLangName, modelId) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: `あなたは翻訳アシスタントです。テキストを${targetLangName}に翻訳してください。元のテキストの意味を保ちながら、自然な翻訳を提供してください。翻訳結果のみを出力してください。`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Claude APIを使って翻訳する関数
async function translateWithClaude(text, apiKey, targetLangName, modelId) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: `あなたは翻訳アシスタントです。以下のテキストを${targetLangName}に翻訳してください。元のテキストの意味を保ちながら、自然な翻訳を提供してください。翻訳結果のみを出力してください。\n\n${text}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text.trim();
}

// Gemini APIを使って翻訳する関数
async function translateWithGemini(text, apiKey, targetLangName, modelId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `あなたは翻訳アシスタントです。以下のテキストを${targetLangName}に翻訳してください。元のテキストの意味を保ちながら、自然な翻訳を提供してください。翻訳結果のみを出力してください。\n\n${text}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}