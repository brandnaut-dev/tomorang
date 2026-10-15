// 토모랑 — 배포 설정
// SHEET_ENDPOINT: Google Apps Script 웹앱 URL (apps-script/README.md 3분 설정 참고).
//   비어 있으면 신청 팝업이 "아직 저장되지 않았어요" 상태를 보여주고 실제 저장은 하지 않는다.
// SHEET_URL: 백오피스에서 "시트 열기" 버튼으로 연결할 구글 스프레드시트 주소(선택).
// 관리자 키(ADMIN_KEY)는 여기(공개 파일)에 두지 않는다. Apps Script Code.gs 안에만 둔다.
window.TOMORANG_CONFIG = {
  SHEET_ENDPOINT: "https://script.google.com/macros/s/AKfycbwijcdvhCVkH3PONlg0ZSRRsI2FXOmSYiK2PGlvIv0D33O3zsqpBhKwNDxMxsUCVvjOZQ/exec",
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1TfHMvAejJhKzp3dSfg9qsa6iZfT7ZjGMY0IIQOTTEII/edit",
  CONSENT_VERSION: "2026-10-15",
  // 신청 팝업에서 보여줄 월 수(이번 달 포함). 운영 월이 확정되면 여기만 바꾼다.
  MONTHS_AHEAD: 7,
  SITE_NAME: "토모랑",
};
