let popupPort = null;
let batchImages = []; // 이미지 데이터 배치 저장
let textAccumulator = ''; // OCR 텍스트 누적 저장

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
async function addImageToBatch(dataUrl) {
  batchImages.push({
    image: { content: dataUrl.split(',')[1] },
    features: [{ type: 'TEXT_DETECTION' }],
  });

  if (batchImages.length >= 16) {
    await processImageBatch();
  }
}

// 배치를 Vision API로 보내고 처리하는 함수
async function processImageBatch() {
  if (batchImages.length === 0) return;

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.GOOGLE_CLOUD_API_KEY}`;
  const requestBody = { requests: batchImages };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    // OCR 결과를 textAccumulator에 추가
    (result.responses || []).forEach((response) => {
      const text = response?.textAnnotations?.[0]?.description || '';
      if (text) {
        textAccumulator += text + '\n';
      }
    });
    console.log('OCR 성공');
  } catch (error) {
    console.error('OCR 처리 중 오류:', error);
  } finally {
    batchImages = []; // 배치 초기화
  }
}

// 메시지 리스너를 설정하여 popup.js 또는 content script에서 요청을 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndProcess') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (dataUrl) {
        await addImageToBatch(dataUrl);
        sendResponse({ status: 'capture complete' });
      } else {
        sendResponse({ status: 'capture failed' });
      }
    });
    return true;
  } else if (request.action === 'scrollComplete') {
    (async () => {
      // 남은 배치 처리
      await processImageBatch();
      console.log('OCR text: ', textAccumulator);

      // workflow 가 등록되었다면 전달
      if (CONFIG.WORKFLOW_URL.trim()) {
        const fileName = generateFileName(sender.tab.url); // 파일명 생성
        sendOCRResultToWorkflow(fileName, textAccumulator);
        console.log(`OCR text saved to ${fileName}`);
      }

      // 파업화면에 전달
      if (popupPort) {
        popupPort.postMessage({ action: 'displayResult', textAccumulator });
      }

      // content.js 에 전달
      sendResponse({ textAccumulator }); // OCR 결과를 응답으로 반환

      textAccumulator = ''; // 누적 텍스트 초기화
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
  }
});

function generateFileName(url) {
  const paths = new URL(url).pathname.split('/').slice(-3);
  return paths.join('_');
}

async function sendOCRResultToWorkflow(fileName, ocrText) {
  const requestBody = {
    date: new Date().toISOString(), // 현재 날짜와 시간을 ISO 형식으로 보냄
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
