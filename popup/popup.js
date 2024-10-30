console.log('🔌 팝업 스크립트 초기화');

let port = chrome.runtime.connect({ name: 'popup' });
let urlList = [];
let currentIndex = 0;

port.onMessage.addListener((message) => {
  if (message.action === 'progressUpdate') {
    updateProgress(message.currentScrollIndex, message.totalScrolls);
  } else if (message.action === 'displayResult') {
    document.getElementById('result').innerText = message.message;

    // 다음 URL로 이동
    currentIndex++;
    sendNextURLToBackground();
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

document.getElementById('start-btn').addEventListener('click', () => {
  const urlInput = document.getElementById('url-input').value.trim();
  urlList = urlInput
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url !== '' && new URL(url).hostname.endsWith('naver.com')); // *.naver.com 도메인 필터링

  if (urlList.length === 0) {
    document.getElementById('result').innerText =
      '유효한 URL이 없습니다 (예: https://*.naver.com/.../.../...).';
    return;
  }

  currentIndex = 0;
  sendNextURLToBackground();
});

function sendNextURLToBackground() {
  if (currentIndex >= urlList.length) {
    document.getElementById('result').innerText =
      '모든 URL 처리가 완료되었습니다.';
    return;
  }

  const url = urlList[currentIndex];
  chrome.runtime.sendMessage({ action: 'processURL', url }); // background.js에 URL 처리 요청
}
