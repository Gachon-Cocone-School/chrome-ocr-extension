# Chrome OCR extension

## 개요

이 프로젝트는 웹 페이지의 모든 콘텐츠를 스크롤하면서 캡처하고, OCR 처리를 통해 텍스트를 추출하여 저장하는 Chrome 확장 프로그램입니다. Google Vision API를 사용하여 OCR 텍스트를 화면 또는 워크플로우 서버로 전달할 수 있습니다.

## 주요 기능

- 페이지의 맨 위에서부터 모든 콘텐츠를 자동으로 스크롤하며 캡처
- 이미지 로딩 대기 및 스크롤 진행 상황을 표시
- OCR 결과를 화면 또는 워크플로우 서버로 전달할 수 있습니다.

## 설치 방법

1. 이 리포지토리를 클론하거나 다운로드합니다.
   https://github.com/Gachon-Cocone-School/chrome-ocr-extension
1. Chrome 브라우저에서 확장 프로그램 페이지 (chrome://extensions/)로 이동합니다.
1. 개발자 모드를 활성화합니다.
1. 압축 해제된 확장 프로그램을 로드 버튼을 클릭한 후, 다운로드한 폴더를 선택하여 확장 프로그램을 로드합니다.

## 설정 방법

1. config.js.bak 파일의 이름을 config.js 로 바꾼다.
1. Google Vision API 키를 생성하고 config.js에 추가합니다.
1. OCR 결과를 보낼 Workflow 웹훅 URL 이 있다면 config.js에 추가하고 없다면 빈칸으로 놔둔다.

```javascript
// config.js

const CONFIG = {
  GOOGLE_CLOUD_API_KEY: 'YOUR_API_KEY',
  WORKFLOW_URL: 'YOUR_WEBHOOK_URL',
};

export default CONFIG;
```

## Google Vision API 키 생성 방법

1. Google Cloud Console에 로그인하고, 프로젝트 선택 버튼을 클릭하여 새 프로젝트를 만듭니다. 프로젝트 이름을 지정하고, 만들기 버튼을 클릭합니다. ( 이미 프로젝트가 있다면 패스하세요 )
1. API 및 서비스 > 라이브러리로 이동합니다.
1. Vision API를 검색하여 선택한 후, 사용 버튼을 클릭하여 프로젝트에 Vision API를 활성화합니다.
1. API 및 서비스 > 사용자 인증 정보로 이동합니다.
1. 사용자 인증 정보 만들기 버튼을 클릭하고, API 키를 선택합니다.
1. 생성된 API 키가 나타나면 API 키 제한을 클릭하여 사용 범위를 Vision API로 제한합니다.
1. 제한된 API 키를 복사하고, 프로젝트의 config.js 파일에 추가합니다.
1. Google Vision API는 유료로 제공되므로, Google Cloud Console에서 결제 계정을 설정하여 할당된 무료 할당량 이상 사용 시 요금이 청구되지 않도록 주의하세요.

## 워크플로우 설정 방법

1. 워크플로우의 웹훅 URL이 먼저 config.js 에 등록되어야 한다. ( 등록되어 있지 않으면 전달 안함 )
1. OCR 이 완료되면 결과를 아래와 같은 JSON 메시지로 만들어 POST 메시지로 전달한다.

```javascript
{
    "date": "2024-10-29T12:34:56.789Z", // 현재 날짜와 시간을 ISO 형식으로 보냄
    "product_id": "litenkulor_products_8522403446",   // product_id
    "text": "This is the OCR result text" // OCR 결과 텍스트를 text로 보냄
}
```

## 사용 방법

1. 설치한 확장 프로그램의 아이콘을 클릭하여 팝업 창을 엽니다.
1. Start 버튼을 클릭하여 OCR 처리를 시작합니다.

- 스크롤이 페이지의 맨 위에서부터 자동으로 시작되며, 각 스크롤마다 콘텐츠가 캡처됩니다.
- 이미지가 로딩되는 동안 대기하며, 모든 콘텐츠가 로드될 때까지 스크롤을 반복합니다.
- 페이지가 16장이 캡쳐되면 그 동안의 캡쳐본을 합쳐서 OCR 을 수행합니다.

1. OCR 처리가 완료되면, OCR 텍스트가 화면에 표시되고 지정된 워크플로우로 전달됩니다.
1. 팝업 창에서 진행 상황과 결과를 확인할 수 있습니다.

---

문의 : namjookim@gachon.ac.kr
