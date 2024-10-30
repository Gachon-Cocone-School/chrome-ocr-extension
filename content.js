function clickExpandButtons() {
  console.log('🔍 상세정보 버튼 찾기 시작');
  const buttons = document.querySelectorAll('button');
  console.log(`💡 발견된 버튼 수: ${buttons.length}`);

  buttons.forEach((button) => {
    if (button.innerText.includes('상세정보 펼쳐보기')) {
      console.log('✅ 상세정보 버튼 클릭:', button.innerText);
      button.click();
    }
  });
  console.log('🏁 버튼 클릭 프로세스 완료');
}

function waitForImagesToLoad() {
  return new Promise((resolve) => {
    const images = document.images;
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      resolve();
    }

    for (let img of images) {
      if (img.complete) {
        loadedCount++;
        if (loadedCount === totalImages) {
          console.log('🎉 모든 이미지 로드 완료');
          resolve();
        }
      } else {
        img.addEventListener('load', () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            console.log('🎉 모든 이미지 로드 완료');
            resolve();
          }
        });
      }
    }
  });
}

// 헤더 숨기기
function hideFloatingHeader() {
  const header = document.getElementById('_productFloatingTab');
  if (header) {
    header.style.display = 'none';
  }
}

async function scrollAndCapture() {
  console.log('📜 스크롤 및 캡처 시작');

  // 스크롤을 시작하기 전에 화면을 맨 위로 이동
  window.scrollTo(0, 0);

  let totalHeight = document.body.scrollHeight;
  let viewportHeight = window.innerHeight;
  let currentScrollPosition = 0;

  let totalScrolls = Math.ceil(totalHeight / viewportHeight);
  let currentScrollIndex = 0;

  while (currentScrollPosition < totalHeight) {
    currentScrollIndex++;

    chrome.runtime.sendMessage({
      action: 'progressUpdate',
      currentScrollIndex: currentScrollIndex,
      totalScrolls: totalScrolls,
    });

    hideFloatingHeader();

    await captureAndProcessScreen((response) => {
      console.log('📸 캡처 처리 완료:', response);
    });

    window.scrollBy(0, viewportHeight);
    currentScrollPosition += viewportHeight;

    console.log(
      `🔄 현재 스크롤 위치: ${currentScrollPosition}px/${totalHeight}px`
    );

    // 100ms 대기

    await waitForImagesToLoad();
    await new Promise((resolve) => setTimeout(resolve, 300));

    let newTotalHeight = document.body.scrollHeight;
    if (newTotalHeight > totalHeight) {
      totalHeight = newTotalHeight;
      totalScrolls = Math.ceil(totalHeight / viewportHeight);
    }
  }

  chrome.runtime.sendMessage({ action: 'scrollComplete' }, (response) => {
    console.log('📜 스크롤 완료:', response);
  });
}

function captureAndProcessScreen(callback) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'captureAndProcess' }, (response) => {
      if (callback) callback(response);
      resolve();
    });
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'startProcessing') {
    (async function () {
      await waitForImagesToLoad();
      clickExpandButtons();
      await waitForImagesToLoad();
      await scrollAndCapture();
    })();
  }
});
