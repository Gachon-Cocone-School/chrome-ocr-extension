let popupPort = null;
let infoByTab = {};

import CONFIG from './config.js';

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    console.log('📞 팝업 연결됨');
    popupPort = port;

    port.onDisconnect.addListener(() => {
      console.log('📴 팝업 연결 해제됨');
      popupPort = null;
    });
  }
});

// 배치에 이미지를 추가하는 함수
async function addImageToBatch(tabId, dataUrl) {
  if (!infoByTab[tabId]) {
    infoByTab[tabId] = {
      images: [],
      texts: '',
    }; // 각 탭에 대해 초기화
  }

  infoByTab[tabId].images.push({
    image: { content: dataUrl.split(',')[1] },
    features: [{ type: 'TEXT_DETECTION' }],
  });

  if (infoByTab[tabId].images.length >= 16) {
    await processImageBatch(tabId);
  }
}

// 배치를 Vision API로 보내고 처리하는 함수
async function processImageBatch(tabId) {
  if (infoByTab[tabId].images.length === 0) return;

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.GOOGLE_CLOUD_API_KEY}`;
  const requestBody = { requests: infoByTab[tabId].images };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    (result.responses || []).forEach((response) => {
      const text = response?.textAnnotations?.[0]?.description || '';
      if (text) {
        infoByTab[tabId].texts += text + '\n';
      }
    });
    console.log('OCR 성공');
  } catch (error) {
    console.error('OCR 처리 중 오류:', error);
  } finally {
    infoByTab[tabId].images = []; // 배치 초기화
  }
}

// 메시지 리스너를 설정하여 popup.js 또는 content script에서 요청을 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processURL') {
    const url = request.url;

    chrome.tabs.update({ url }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.sendMessage(tab.id, { action: 'startProcessing' });
          chrome.tabs.onUpdated.removeListener(listener);
          sendResponse({ status: 'url loading complete' });
        }
      });
    });
    return true;
  } else if (request.action === 'captureAndProcess') {
    const tabId = sender.tab.id;
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (dataUrl) {
        await addImageToBatch(tabId, dataUrl);
        sendResponse({ status: 'capture complete' });
      } else {
        sendResponse({ status: 'capture failed' });
      }
    });
    return true;
  } else if (request.action === 'scrollComplete') {
    const tabId = sender.tab.id;
    (async () => {
      // 남은 배치 처리
      await processImageBatch(tabId).then(() => {
        const fileName = generateFileName(sender.tab.url); // 파일명 생성
        const message = `OCR text saved to ${fileName}`;
        console.log('OCR text: ', infoByTab[tabId].texts);

        // workflow 가 등록되었다면 전달
        if (CONFIG.WORKFLOW_URL.trim()) {
          sendOCRResultToWorkflow(fileName, infoByTab[tabId].texts);
          console.log(message);
        }

        infoByTab[tabId].texts = ''; // 누적 텍스트 초기화

        // 팝업화면에 전달
        if (popupPort) {
          popupPort.postMessage({ action: 'displayResult', message });
        }

        // content.js 에 전달
        sendResponse({ message }); // OCR 결과를 응답으로 반환
      });
    })();
    return true;
  } else if (request.action === 'progressUpdate') {
    if (popupPort) {
      popupPort.postMessage({
        action: 'progressUpdate',
        currentScrollIndex: request.currentScrollIndex,
        totalScrolls: request.totalScrolls,
      });
    }
    sendResponse({ status: 'progress updated' }); // 응답 추가
    return true;
  }
});

function generateFileName(url) {
  const paths = new URL(url).pathname.split('/').slice(-3);
  return paths.join('_');
}

async function sendOCRResultToWorkflow(fileName, ocrText) {
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')} ${String(
    now.getHours()
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
    now.getSeconds()
  ).padStart(2, '0')}`;

  const requestBody = {
    date: localDate, // 로컬 타임으로 변환한 날짜와 시간
    product_id: fileName, // 파일명을 product_id로 보냄
    text: ocrText, // OCR 결과를 ocr_text로 보냄
  };

  try {
    const response = await fetch(CONFIG.WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      console.log('WORKFLOW에 OCR 결과 전달 완료');
    } else {
      console.log('WORKFLOW에 OCR 결과 전달 실패:', response.statusText);
    }
  } catch (error) {
    console.log('WORKFLOW OCR 결과 전달 실패:', error);
  }
}
