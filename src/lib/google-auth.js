import { OAUTH_SCOPES, PUBLIC_OAUTH } from '../shared/constants.js';
import { clearAuth, getAuth, getSettings, saveAuth } from '../shared/storage.js';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/**
 * Ego Lite 등 Chrome 계정 로그인이 없는 Chromium 브라우저에서도 동작하도록
 * chrome.identity.launchWebAuthFlow 기반의 표준 OAuth 2.0을 사용한다.
 */
export function getRedirectUri() {
  return chrome.identity.getRedirectURL('oauth2');
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePkcePair() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const verifier = base64UrlEncode(randomBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

function generateState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * 대화형 Google 로그인 시작
 * - clientSecret이 있으면 Authorization Code + PKCE (refresh_token 발급 -> 무제한 자동 갱신)
 * - clientSecret이 없으면 Implicit Flow (access_token 직접 발급)
 */
export async function signInInteractive() {
  const settings = await getSettings();
  const customClientId = (settings.clientId || '').trim();
  const customClientSecret = (settings.clientSecret || '').trim();
  const redirectUri = getRedirectUri();
  const state = generateState();

  // 1) 공개 프록시 모드 (사용자 별도 키 미입력 + PUBLIC_OAUTH 활성화 시)
  if (!customClientId && PUBLIC_OAUTH.clientId && PUBLIC_OAUTH.proxyUrl) {
    return await signInWithProxy({
      clientId: PUBLIC_OAUTH.clientId,
      proxyUrl: PUBLIC_OAUTH.proxyUrl.replace(/\/+$/, ''),
      redirectUri,
      state,
    });
  }

  if (!customClientId) {
    throw new Error('Google OAuth Client ID가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');
  }

  // 2) 사용자 직접 키 모드 (Client Secret 있으면 Refresh Token 발급, 없으면 Implicit)
  if (customClientSecret) {
    return await signInWithAuthCode({
      clientId: customClientId,
      clientSecret: customClientSecret,
      redirectUri,
      state,
    });
  }
  return await signInWithImplicit({
    clientId: customClientId,
    redirectUri,
    state,
    interactive: true,
  });
}

async function signInWithProxy({ clientId, proxyUrl, redirectUri, state }) {
  const { verifier, challenge } = await generatePkcePair();

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent select_account');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('Google 로그인이 취소되었습니다.');
  }

  const parsed = new URL(responseUrl);
  if (parsed.searchParams.get('error')) {
    throw new Error(`Google 인증 오류: ${parsed.searchParams.get('error')}`);
  }
  if (parsed.searchParams.get('state') !== state) {
    throw new Error('OAuth state 검증에 실패했습니다.');
  }
  const code = parsed.searchParams.get('code');
  if (!code) {
    throw new Error('인증 코드(code)를 받지 못했습니다.');
  }

  const tokenRes = await fetch(`${proxyUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `토큰 교환 실패: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`
    );
  }

  const expiresAt = Date.now() + (Number(tokenJson.expires_in) || 3600) * 1000 - 60_000;
  const email = await fetchUserEmail(tokenJson.access_token).catch(() => null);

  const authData = {
    mode: 'proxy',
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token || null,
    expiresAt,
    email,
    connectedAt: new Date().toISOString(),
  };

  await saveAuth(authData);
  return authData;
}

async function signInWithAuthCode({ clientId, clientSecret, redirectUri, state }) {
  const { verifier, challenge } = await generatePkcePair();

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent select_account');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('Google 로그인이 취소되었습니다.');
  }

  const parsed = new URL(responseUrl);
  const returnedState = parsed.searchParams.get('state');
  const error = parsed.searchParams.get('error');
  const code = parsed.searchParams.get('code');

  if (error) {
    throw new Error(`Google 인증 오류: ${error}`);
  }
  if (returnedState !== state) {
    throw new Error('OAuth state 검증에 실패했습니다.');
  }
  if (!code) {
    throw new Error('인증 코드(code)를 받지 못했습니다.');
  }

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `토큰 교환 실패: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`
    );
  }

  const expiresAt = Date.now() + (Number(tokenJson.expires_in) || 3600) * 1000 - 60_000;
  const email = await fetchUserEmail(tokenJson.access_token).catch(() => null);

  const authData = {
    mode: 'code',
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token || null,
    expiresAt,
    email,
    connectedAt: new Date().toISOString(),
  };

  await saveAuth(authData);
  return authData;
}

async function signInWithImplicit({ clientId, redirectUri, state, interactive }) {
  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', interactive ? 'select_account' : 'none');

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive,
  });

  if (!responseUrl) {
    throw new Error('Google 로그인이 취소되었습니다.');
  }

  const hash = new URL(responseUrl).hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const error = params.get('error');
  const returnedState = params.get('state');
  const accessToken = params.get('access_token');
  const expiresIn = Number(params.get('expires_in')) || 3600;

  if (error) {
    throw new Error(`Google 인증 오류: ${error}`);
  }
  if (returnedState !== state) {
    throw new Error('OAuth state 검증에 실패했습니다.');
  }
  if (!accessToken) {
    throw new Error('액세스 토큰을 받지 못했습니다.');
  }

  const expiresAt = Date.now() + expiresIn * 1000 - 60_000;
  const email = await fetchUserEmail(accessToken).catch(() => null);

  const authData = {
    mode: 'implicit',
    accessToken,
    refreshToken: null,
    expiresAt,
    email,
    connectedAt: new Date().toISOString(),
  };

  await saveAuth(authData);
  return authData;
}

/**
 * 유효한 액세스 토큰 반환 (만료 임박 시 자동 갱신)
 */
export async function getValidAccessToken() {
  const auth = await getAuth();
  if (!auth || !auth.accessToken) {
    throw new Error('Google Drive에 연결되어 있지 않습니다.');
  }

  if (Date.now() < (auth.expiresAt || 0)) {
    return auth.accessToken;
  }

  const settings = await getSettings();
  const clientId = (settings.clientId || '').trim();
  const clientSecret = (settings.clientSecret || '').trim();

  // 0) 공개 프록시 모드 Refresh Token 갱신
  if (auth.mode === 'proxy' && auth.refreshToken && PUBLIC_OAUTH.proxyUrl) {
    const proxyBase = PUBLIC_OAUTH.proxyUrl.replace(/\/+$/, '');
    const res = await fetch(`${proxyBase}/oauth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    });
    const json = await res.json();
    if (res.ok && json.access_token) {
      const updated = {
        ...auth,
        accessToken: json.access_token,
        expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 60_000,
      };
      await saveAuth(updated);
      return updated.accessToken;
    }
    throw new Error(
      `토큰 자동 갱신 실패(${json.error || res.status}). 설정에서 Google 계정을 다시 연결해주세요.`
    );
  }

  // 1) Refresh Token으로 백그라운드 갱신 시도 (BYOK)
  if (auth.refreshToken && clientId && clientSecret) {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: auth.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const json = await res.json();
    if (res.ok && json.access_token) {
      const updated = {
        ...auth,
        accessToken: json.access_token,
        expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 60_000,
      };
      await saveAuth(updated);
      return updated.accessToken;
    }

    throw new Error(
      `토큰 자동 갱신 실패(${json.error || res.status}). 설정에서 Google 계정을 다시 연결해주세요.`
    );
  }

  // 2) Implicit 모드: Silent refresh 시도
  if (clientId) {
    try {
      const refreshed = await signInWithImplicit({
        clientId,
        redirectUri: getRedirectUri(),
        state: generateState(),
        interactive: false,
      });
      return refreshed.accessToken;
    } catch {
      throw new Error(
        '액세스 토큰이 만료되었습니다. 설정에서 다시 로그인하거나 Client Secret을 입력해 자동 갱신을 활성화하세요.'
      );
    }
  }

  throw new Error('토큰이 만료되었습니다. 다시 로그인해주세요.');
}

export async function signOut() {
  const auth = await getAuth();
  if (auth && auth.accessToken) {
    await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(auth.accessToken)}`, {
      method: 'POST',
    }).catch(() => {});
  }
  await clearAuth();
}

async function fetchUserEmail(accessToken) {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.email || null;
}
