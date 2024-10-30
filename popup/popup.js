console.log('🔌 팝업 스크립트 초기화');

let port = chrome.runtime.connect({ name: 'popup' });

port.onMessage.addListener((message) => {
  if (message.action === 'progressUpdate') {
    updateProgress(message.currentScrollIndex, message.totalScrolls);
  } else if (message.action === 'displayResult') {
    document.getElementById('result').innerText = message.textAccumulator;
  }
});

port.onDisconnect.addListener(() => {
  console.log('📴 팝업 연결이 해제되었습니다.');
  port = null;
});

function updateProgress(current, total) {
  document.getElementById(
    'result'
  ).innerText = `처리 중... (${current}/${total})`;
}

function handleStartProcessingResponse(response) {
  if (response && response.status === 'started') {
    document.getElementById('result').innerText = '처리 중...';
  }
}

document.getElementById('start-btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url);

    // 허용된 도메인 패턴
    if (!url.hostname.endsWith('naver.com')) {
      document.getElementById('result').innerText = '허용되지 않는 URL입니다.';
      return; // URL이 허용되지 않으면 중단
    }

    // URL이 일치할 경우에만 메시지 전송
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'startProcessing' },
      handleStartProcessingResponse
    );
  });
});
