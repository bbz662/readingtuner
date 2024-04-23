/*global chrome*/

import OpenAI, { toFile } from 'openai';

async function exampleChatCompletion(apiKey, input_json, model, age, job) {
   const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
   });

   const chatCompletion = await openai.chat.completions.create({
      messages: [
         {
            role: 'system', content: `The provided input represents a part of textContents extracted from a web article. It is a text object as it appears on the page. Text irrelevant to the main article, such as navigational labels, should be ignored. For a person of age ${age} and profession ${job}, use vocabulary and explanations suitable for their age group and profession to aid their understanding. Consider questions they might ask and create a Q&A with answers to help them understand the text. Return as a text object. You must respect and maintain the original language of the text in the rewritten text as well.しかしなるべく日本語でお願いします。`
         },
         {
            role: 'user', content: input_json
         },
      ],
      model: model,
   });
   // console.log(chatCompletion.choices[0].message);
   return chatCompletion;
}

function sleep(seconds) {
   return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function safeChatCompletion(text, msg, retries = 3) {
   console.log('call api')
   try {
       const completionResult = await exampleChatCompletion(msg.apiKey, text, msg.model, msg.age, msg.job);
       return completionResult.choices[0].message.content;
   } catch (error) {
       if (retries > 0 && error.status === 429) { // 429はToo Many RequestsのHTTPステータスコード
           await sleep(5); // 5秒待機
           return await safeChatCompletion(text, msg, retries - 1);
       } else {
           throw error;
       }
   }
}


async function processText(text, msg) {
   const processedText = await safeChatCompletion(text, msg);
   return processedText;
}

function isVisible(element) {
   try {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
   } catch (error) {
      return true;
   }
}

function isContentLike(element) {
   // Skip elements typically not containing user-visible content
   return !['META', 'LINK', 'HEAD', 'CANVAS', 'SVG', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK', 'PATH', 'SCRIPT', 'NOSCRIPT', 'STYLE', 'OBJECT', 'EMBED'].includes(element.tagName);
}
function hasSize(element) {
   try {
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0;
   } catch (error) {
      return false;
   }
}

function findElements(root, textNodes) {
   if (!isVisible(root)) return;
   if (root.nodeType === Node.TEXT_NODE) {
      if (root.textContent.trim().length > 0 && hasSize(root.parentNode)) {
         root.readTunerId = textNodes.length;
         textNodes.push(root);
      }
   } else if (isContentLike(root)) {
      root.childNodes.forEach(node => findElements(node, textNodes));
   }
}

// Add an overlay and a loading spinner to the page
function showLoadingOverlay(age) {
   let overlay = document.createElement('div');
   overlay.id = 'loadingOverlay';
   overlay.style.position = 'fixed';
   overlay.style.top = '0';
   overlay.style.left = '0';
   overlay.style.width = '100%';
   overlay.style.height = '100%';
   overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
   overlay.style.zIndex = '1000';
   overlay.style.display = 'flex';
   overlay.style.justifyContent = 'center';
   overlay.style.alignItems = 'center';
   overlay.style.fontSize = '24px';
   overlay.style.color = 'white';
   overlay.innerHTML = `Tuning for age ${age}... <div class="spinner"></div>`;
   document.body.appendChild(overlay);
}

// Remove the overlay from the page
function hideLoadingOverlay() {
   let overlay = document.getElementById('loadingOverlay');
   if (overlay) {
      overlay.remove();
   }
}

// Example spinner CSS added via JavaScript for simplicity
function addSpinnerStyles() {
   const style = document.createElement('style');
   style.innerHTML = `
        .spinner {
            border: 16px solid #f3f3f3;
            border-top: 16px solid #3498db;
            border-radius: 50%;
            width: 120px;
            height: 120px;
            animation: spin 2s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
   document.head.appendChild(style);
}

function applyStyles(element) {
   element.style.backgroundColor = '#f2f4f8';
   element.style.border = '2px solid #99ccff';
   element.style.borderRadius = '10px';
   element.style.color = '#333333';
   element.style.fontFamily = "'Arial', sans-serif";
   element.style.fontSize = '18px';
   element.style.padding = '15px';
   element.style.margin = '10px 0';
   element.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
   element.style.transition = 'all 0.3s ease';
   element.style.cursor = 'pointer';
 }

// Function called when a new message is received
const messagesFromReactAppListener = (
   msg,
   sender,
   sendResponse,
) => {
   (async () => {
      console.log("receive")
      const selection = window.getSelection();

      // 選択されたHTMLが存在するか確認
      if (selection.rangeCount < 1) {
         console.error("No selected HTML content received");
         return;
      }
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());

      const isDryRun = msg.model === "dryrun";

      // Ensure any info div added before are cleared out.
      document.querySelectorAll(".readingTunerInfoDiv").forEach(div => div.remove());

      console.log('[content.js]. ', msg.model, msg.age, msg.commit, new Date(), window.location.href);

      let processedText = "";
      if (isDryRun) {
         processedText = container.innerHTML
      } else {
         processedText = await processText(container.innerHTML, msg);
      }
      console.log(processedText);

      if (!selection.isCollapsed) { // 選択範囲が存在するか確認
         const range = selection.getRangeAt(0); // 最初のRangeオブジェクトを取得
         const infoDiv = document.createElement('div');
         infoDiv.textContent = processedText;
         infoDiv.className = "readingTunerInfoDiv";
         applyStyles(infoDiv);
         range.insertNode(infoDiv); // 選択範囲の開始点にdivを挿入
 
         // 範囲の更新が必要な場合は範囲を再設定
         range.setStartAfter(infoDiv);
         range.setEndAfter(infoDiv);
         selection.removeAllRanges(); // 既存の選択をクリア
     }

      // Prepare the response object with information about the site
      const response = {
         title: document.title,
      };

      sendResponse(response);
   })();
   return true;
}

/**
* Fired when a message is sent from either an extension process or a content script.
*/
if (!window.hasListener) {
   console.log("Add listener");
   chrome.runtime.onMessage.addListener(messagesFromReactAppListener);
   window.hasListener = true;
}
