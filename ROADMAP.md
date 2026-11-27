# SyncFav Public Release Roadmap

SyncFav는 **최소 권한·최고 안정성**으로 1차 출시한 뒤, 매주 1회씩 실용적인 기능을 점진적으로 추가하는 주간 릴리즈 전략을 따릅니다.

## Released / Launch (`v1.2.0` — Week 1)
- [x] **Cross-Browser Google Drive Sync**: Ego Lite, Chrome, Edge, Brave 간 3-Way Merge 자동 동기화
- [x] **Zero Account Lock-in**: Chrome 로그인 없이 동작하는 OAuth 2.0 PKCE + Refresh Token 자동 갱신
- [x] **Failsafe 대량 삭제 방지**: 30% 이상(최소 50개) 삭제 감지 시 자동 동기화 중단
- [x] **3 Switchable Skins**: Obsidian (Linear), Editorial (`frontend-design`), Pro Max (`ui-ux-pro-max`)
- [x] **Local Auto Backups (10개)** + 원클릭 복원 + JSON 내보내기/가져오기
- [x] **Public 1-Click OAuth Proxy** (Cloudflare Workers) + Chrome Web Store ZIP 빌더

## Week 2 (`v1.3.0`) — Bookmark Hygiene Tools
- [ ] **중복 북마크 탐지 & 원클릭 정리** (URL 정규화, `utm_*` 무시 옵션, 폴더 위치 표시)
- [ ] **죽은 링크(404 / 접속 불가) 스캐너** (`optional_host_permissions` 기반 동시 배치 검사 + 진행률/취소)

## Week 3 (`v1.4.0`) — Privacy & Cloud Backup
- [ ] **종단간 암호화 (E2EE, 선택 옵션)**: 클라이언트 PBKDF2 + AES-256-GCM 암호화
- [ ] **Google Drive 일별 자동 백업** (`SyncFav/backups/YYYY-MM-DD.json`, 최근 14일 롤링 보관)

## Week 4 (`v1.5.0`) — Multi-Device Workspace (`optional_permissions`)
- [ ] **열린 탭 & 탭 그룹 동기화**: 기기별 열린 탭/탭 그룹 스냅샷 공유 및 원클릭 복원
- [ ] **설치된 확장프로그램 목록 비교**: 미설치 확장프로그램 선택 후 Chrome Web Store 페이지 일괄 열기
- [ ] **기기별 최근 방문 기록 공유 뷰어**: 다른 PC의 최근 방문 기록 검색·열람 (민감 도메인 제외 필터)

## Week 5 (`v1.6.0`) — AI Auto-Organizer (BYOK + Local Free LLM)
- [ ] **AI 자동 폴더 분류**: 미리보기 Diff 확인 후 원클릭 정리 (정리 직전 자동 백업)
- [ ] **멀티 프로바이더 지원**: Google Gemini, OpenAI, Anthropic Claude, xAI Grok, DeepSeek, OpenRouter, **Ollama / LM Studio (로컬 무료 LLM)**, Custom OpenAI-Compatible
