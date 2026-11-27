# SyncFav OAuth Proxy (Cloudflare Workers)

공개 배포 시 `GOOGLE_CLIENT_SECRET`을 브라우저 확장프로그램에 노출하지 않고 안전하게 OAuth 2.0 PKCE 토큰 교환/갱신만 중계하는 초경량 Worker입니다.

## 배포 방법 (무료 플랜)

```bash
cd oauth-proxy
npx wrangler login
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler deploy
```

배포 후 발급된 URL(예: `https://syncfav-oauth-proxy.<subdomain>.workers.dev`)과 `GOOGLE_CLIENT_ID`를 `src/shared/constants.js`의 `PUBLIC_OAUTH`에 설정하면 일반 사용자가 1클릭으로 Google Drive에 연결할 수 있습니다.
