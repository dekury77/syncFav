# SyncFav — Cross-Browser Chromium Bookmark Sync (via Google Drive)

**Ego Lite**, **Chrome**, **Edge**, **Brave** 등 계정 동기화가 없거나 서로 다른 Chromium 기반 브라우저 간에 **Google Drive**를 저장소로 사용해 즐겨찾기(북마크)를 자동 동기화하는 Manifest V3 확장프로그램입니다.

## 주요 기능

- **계정 로그인 없는 브라우저 완벽 지원**: Chrome 내장 로그인에 의존하는 `getAuthToken` 대신 표준 OAuth 2.0 (`chrome.identity.launchWebAuthFlow` + PKCE + Refresh Token)을 사용해 **Ego Lite**에서도 문제없이 동작합니다.
- **Google Drive 전용 폴더 동기화**: 내 Google Drive에 `SyncFav/bookmarks.json` 파일을 자동 생성하고 동기화합니다 (`drive.file` 최소 권한 스코프 사용).
- **스마트 3-Way Merge**: A 컴퓨터에서 북마크를 삭제하고 B 컴퓨터에서 새 북마크를 추가해도, 마지막 동기화 스냅샷을 기준으로 정확하게 병합합니다.
- **자동 동기화**: 북마크 추가/수정/이동/삭제 감지(디바운스) + 주기적 폴링(기본 5분) + 브라우저 시작 시 자동 동기화.
- **안전한 복구**: 원격 변경사항을 적용하기 직전마다 로컬 북마크를 자동 백업(최근 10개)하며, JSON 내보내기/가져오기도 지원합니다.

## 설치 방법 (빌드 불필요)

1. Ego Lite 또는 Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭 후 이 폴더(`/Volumes/ext/work/syncFav`) 선택
4. 툴바의 **SyncFav** 아이콘 → **설정(⚙)** 클릭

## Google Drive OAuth 설정 (최초 1회, 약 3분)

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성 (예: `SyncFav`)
2. **API 및 서비스 > 라이브러리**에서 **Google Drive API** 사용 설정
3. **OAuth 동의 화면**에서 **외부(External)** 선택 후 **테스트 사용자**에 본인 Gmail 추가
4. **사용자 인증 정보 > OAuth 클라이언트 ID 만들기** → 유형: **웹 애플리케이션**
5. **승인된 리디렉션 URI**에 SyncFav 설정 화면에 표시된 `Redirect URI` (`https://<확장ID>.chromiumapp.org/oauth2`) 복사해서 추가
   - 다른 PC(집컴/회사컴)에 확장프로그램을 로드했을 때 확장 ID가 다르다면, 그 PC의 Redirect URI도 같은 OAuth 클라이언트에 한 줄 더 추가하면 동일한 Client ID / Secret을 모든 컴퓨터에서 공유할 수 있습니다.
6. 발급된 **Client ID**와 **Client Secret**(무제한 자동 토큰 갱신용)을 SyncFav 설정 화면에 입력 후 **Google Drive 연결** 클릭!

## 테스트 실행

```bash
npm test
```
