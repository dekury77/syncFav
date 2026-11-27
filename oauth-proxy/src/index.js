/**
 * SyncFav Public OAuth Proxy (Cloudflare Workers)
 *
 * 공개 배포용 Chrome 확장프로그램에 client_secret을 포함하지 않기 위한 초경량 토큰 교환/갱신 프록시.
 * - 사용자 북마크 데이터는 절대 이 서버를 거치지 않습니다 (브라우저 <-> Google Drive 직접 통신).
 * - 오직 Google OAuth token/refresh 요청에만 서버의 GOOGLE_CLIENT_SECRET을 첨부해 중계합니다.
 */

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ALLOWED_REDIRECT_PATTERN = /^https:\/\/[a-p]{32}\.chromiumapp\.org\/oauth2$/;

function corsHeaders(origin) {
  const allowedOrigin =
    origin && origin.startsWith('chrome-extension://') ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

function jsonResponse(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, service: 'syncfav-oauth-proxy' }, 200, origin);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return jsonResponse({ error: 'OAuth proxy is not configured' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    // 1. Authorization Code + PKCE -> Access & Refresh Token 교환
    if (url.pathname === '/oauth/token') {
      const { code, redirect_uri, code_verifier } = body || {};
      if (!code || !redirect_uri || !code_verifier) {
        return jsonResponse({ error: 'Missing required parameters' }, 400, origin);
      }
      if (!ALLOWED_REDIRECT_PATTERN.test(redirect_uri)) {
        return jsonResponse({ error: 'Invalid redirect_uri' }, 400, origin);
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: 'authorization_code',
          code_verifier,
        }),
      });

      const tokenJson = await tokenRes.json();
      return jsonResponse(tokenJson, tokenRes.status, origin);
    }

    // 2. Refresh Token -> 새 Access Token 발급
    if (url.pathname === '/oauth/refresh') {
      const { refresh_token } = body || {};
      if (!refresh_token) {
        return jsonResponse({ error: 'Missing refresh_token' }, 400, origin);
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokenJson = await tokenRes.json();
      return jsonResponse(tokenJson, tokenRes.status, origin);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
