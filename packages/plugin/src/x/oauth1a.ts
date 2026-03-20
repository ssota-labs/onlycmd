/**
 * OAuth 1.0a signing for X/Twitter API.
 * Ported from x-cli's auth.py generate_oauth_header.
 */

import { createHmac, randomBytes } from "crypto";

export interface OAuthCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Percent-encode a string according to OAuth 1.0a spec.
 */
function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

/**
 * Generate OAuth 1.0a Authorization header (HMAC-SHA1).
 * @param method HTTP method (GET, POST, DELETE, etc.)
 * @param url Full URL (e.g., "https://api.x.com/2/tweets")
 * @param creds OAuth credentials
 * @param params Optional query/body parameters to include in signature
 */
export function generateOAuthHeader(
  method: string,
  url: string,
  creds: OAuthCredentials,
  params?: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  // Combine oauth params with any query/body params for signature base
  const allParams: Record<string, string> = { ...oauthParams };
  if (params) {
    Object.assign(allParams, params);
  }

  // Also include query string params from the URL
  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  // Sort and encode
  const sortedEntries = Object.entries(allParams).sort(([a], [b]) => a.localeCompare(b));
  const paramString = sortedEntries
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");

  // Base URL (no query string)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  // Signature base string
  const baseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  // Signing key
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`;

  // HMAC-SHA1
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;

  // Build header
  const headerParts = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}
