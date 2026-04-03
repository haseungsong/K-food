# GitHub Pages + Google Sheets API Guide

## 사용하는 파일

- `index.html`
- `step1.html`
- `step2.html`
- `event.html`
- `styles.css`
- `app.js`
- `config.js`
- `Code.gs`

## 구조

- GitHub Pages: 화면 표시
- Google Apps Script: 스프레드시트 저장 API

## 1. GitHub에 올릴 파일

이 파일 7개를 GitHub 저장소 루트에 올리면 됩니다.

- `index.html`
- `step1.html`
- `step2.html`
- `event.html`
- `styles.css`
- `app.js`
- `config.js`

## 2. GitHub Pages 켜기

1. GitHub에 새 저장소를 만듭니다.
2. 위 7개 파일을 업로드합니다.
3. 저장소의 `Settings`로 갑니다.
4. `Pages` 메뉴를 엽니다.
5. `Deploy from a branch`를 선택합니다.
6. 브랜치는 `main`, 폴더는 `/root`를 선택합니다.
7. 저장합니다.
8. 몇 분 뒤 사이트 주소가 생성됩니다.

예:

`https://yourname.github.io/your-repo/`

## 3. Google Sheets 만들기

1. 새 구글 스프레드시트를 만듭니다.
2. 이름은 예: `K-Food Visitor CRM`

## 4. Apps Script API 만들기

1. 스프레드시트에서 `확장 프로그램` > `Apps Script`
2. 기본 `Code.gs` 내용을 지웁니다.
3. 이 폴더의 `Code.gs` 내용을 그대로 붙여넣습니다.
4. 저장합니다.

## 5. Apps Script API 배포

1. 오른쪽 위 `배포`
2. `새 배포`
3. 유형: `웹 앱`
4. 실행 사용자: `나`
5. 액세스 권한: `모든 사용자`
6. `배포`
7. 생성된 `/exec` URL을 복사합니다.

예:

`https://script.google.com/macros/s/AKfycbxxxxxxx/exec`

## 6. GitHub 프론트와 API 연결

`config.js` 파일을 열고 아래처럼 바꿉니다.

```js
window.APP_CONFIG = {
  submitUrl: "https://script.google.com/macros/s/AKfycbxxxxxxx/exec"
};
```

저장 후 GitHub에 다시 올립니다.

## 7. 테스트

1. GitHub Pages 주소를 엽니다.
2. `Check-in Rapido`를 누릅니다.
3. 이름과 WhatsApp을 입력합니다.
4. 스프레드시트 `Visitors` 탭에 줄이 생기는지 확인합니다.
5. 설문까지 제출합니다.
6. 같은 줄이 업데이트되는지 확인합니다.
7. `Dashboard` 탭이 생기는지 확인합니다.

## 중요한 점

- GitHub Pages에서는 `config.js`만 수정하면 API 주소를 바꿀 수 있습니다.
- 스프레드시트 저장 로직은 `Code.gs`만 수정하면 됩니다.
- 디자인은 `styles.css`
- 화면 문구는 `index.html`, `step1.html`, `step2.html`, `event.html`
- 동작은 `app.js`

## 가장 자주 만지는 파일

- 디자인 수정: `styles.css`
- 문구 수정: `index.html`, `step1.html`, `step2.html`, `event.html`
- 저장 주소 수정: `config.js`
- 시트 저장 방식 수정: `Code.gs`
