/**
 * X/Twitter API v2 client with OAuth 1.0a and Bearer token auth.
 * Ported from x-cli's api.py XApiClient pattern.
 */

import type { OAuthCredentials } from "./oauth1a.js";
import { generateOAuthHeader } from "./oauth1a.js";

const API_BASE = "https://api.x.com/2";

export interface XConfig {
  token?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

export interface XCredentials {
  bearer?: string;
  oauth?: OAuthCredentials;
}

/**
 * Get credentials from config or context.auth.
 * Supports both Bearer (x) and OAuth (x_api_key, x_api_secret, x_access_token, x_access_token_secret).
 */
export function getXCredentials(
  config?: XConfig,
  contextAuth?: Record<string, string>
): XCredentials {
  const creds: XCredentials = {};

  // Bearer token: config.token or context.auth.x
  if (config?.token) {
    creds.bearer = config.token;
  } else if (contextAuth?.x) {
    creds.bearer = contextAuth.x;
  }

  // OAuth: all 4 values must be present
  const apiKey = config?.apiKey || contextAuth?.x_api_key;
  const apiSecret = config?.apiSecret || contextAuth?.x_api_secret;
  const accessToken = config?.accessToken || contextAuth?.x_access_token;
  const accessTokenSecret = config?.accessTokenSecret || contextAuth?.x_access_token_secret;

  if (apiKey && apiSecret && accessToken && accessTokenSecret) {
    creds.oauth = {
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
    };
  }

  return creds;
}

/**
 * Response shape when OAuth is required but not provided.
 * Return this from handlers so the client can render OAuth login UI.
 */
export interface RequiresAuthResponse {
  requires_auth: {
    provider: "twitter";
    action: "login";
    reason: string;
  };
}

export function requiresAuthResponse(creds: XCredentials): RequiresAuthResponse | null {
  if (creds.oauth) return null;
  return {
    requires_auth: {
      provider: "twitter",
      action: "login",
      reason: "OAuth credentials required. Provide apiKey, apiSecret, accessToken, and accessTokenSecret via config or context.auth.",
    },
  };
}

/**
 * Handle API response: check for rate limits and errors.
 */
async function handleResponse(res: Response): Promise<unknown> {
  if (res.status === 429) {
    const reset = res.headers.get("x-rate-limit-reset") || "unknown";
    throw new Error(
      `X API rate limit exceeded. Request again after the limit resets (timestamp: ${reset}). Reduce request frequency.`
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errors = (data as { errors?: Array<{ detail?: string; message?: string; code?: number }> })?.errors || [];
    const msg =
      errors.map((e) => (e.code ? `[${e.code}] ` : "") + (e.detail || e.message || "")).join("; ") ||
      (await res.text().catch(() => "")) ||
      res.statusText;
    throw new Error(
      `X API error (HTTP ${res.status}): ${msg}. Check credentials, permissions, and request parameters.`
    );
  }

  return data;
}

/**
 * Bearer token GET request.
 */
async function bearerGet(url: string, bearerToken: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  return handleResponse(res);
}

/**
 * OAuth 1.0a request (GET, POST, DELETE, etc.).
 */
async function oauthRequest(
  method: string,
  url: string,
  creds: OAuthCredentials,
  jsonBody?: unknown
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: generateOAuthHeader(method, url, creds),
  };
  if (jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(jsonBody !== undefined && { body: JSON.stringify(jsonBody) }),
  });

  return handleResponse(res);
}

/**
 * OAuth 1.0a request with FormData (for multipart uploads).
 * Body is excluded from OAuth signature for multipart requests.
 */
async function oauthRequestFormData(
  method: string,
  url: string,
  creds: OAuthCredentials,
  formData: FormData
): Promise<unknown> {
  // For multipart requests, OAuth signature is generated without body
  const headers: Record<string, string> = {
    Authorization: generateOAuthHeader(method, url, creds),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: formData,
  });

  return handleResponse(res);
}

/**
 * Get authenticated user ID (cached).
 */
let cachedUserId: string | null = null;

export async function getAuthenticatedUserId(creds: XCredentials): Promise<string> {
  if (cachedUserId) return cachedUserId;
  if (!creds.oauth) {
    throw new Error("OAuth credentials required to get authenticated user ID");
  }
  const data = (await oauthRequest("GET", `${API_BASE}/users/me`, creds.oauth)) as {
    data?: { id?: string };
  };
  if (!data.data?.id) {
    throw new Error("Failed to get authenticated user ID");
  }
  cachedUserId = data.data.id;
  return cachedUserId;
}

// ============================================================
// Tweets
// ============================================================

export interface PostTweetOptions {
  replyTo?: string;
  quoteTweetId?: string;
  pollOptions?: string[];
  pollDurationMinutes?: number;
  mediaIds?: string[];
}

export async function postTweet(
  text: string,
  creds: XCredentials,
  options: PostTweetOptions = {}
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Posting tweets requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret in config or context.auth."
    );
  }

  const mediaIds = options.mediaIds?.filter((id) => id.trim().length > 0);
  if (options.mediaIds && options.mediaIds.length > 0 && (!mediaIds || mediaIds.length === 0)) {
    throw new Error(
      "media_ids contains no valid IDs. Provide comma-separated media_id_string values from x media upload."
    );
  }

  const body: Record<string, unknown> = { text };
  if (options.replyTo) {
    body.reply = { in_reply_to_tweet_id: options.replyTo };
  }
  if (options.quoteTweetId) {
    body.quote_tweet_id = options.quoteTweetId;
  }
  if (options.pollOptions && options.pollOptions.length > 0) {
    body.poll = {
      options: options.pollOptions,
      duration_minutes: options.pollDurationMinutes ?? 1440,
    };
  }
  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  return oauthRequest("POST", `${API_BASE}/tweets`, creds.oauth, body);
}

export async function deleteTweet(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Deleting tweets requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  return oauthRequest("DELETE", `${API_BASE}/tweets/${tweetId}`, creds.oauth);
}

export async function getTweet(
  tweetId: string,
  creds: XCredentials,
  options?: {
    tweet_fields?: string;
    user_fields?: string;
    expansions?: string;
    media_fields?: string;
  }
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Reading tweets requires Bearer token. Provide token in config or context.auth.x."
    );
  }

  const params = new URLSearchParams({
    "tweet.fields":
      options?.tweet_fields ||
      "created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id,referenced_tweets,attachments,entities,lang,note_tweet",
    expansions: options?.expansions || "author_id,referenced_tweets.id,attachments.media_keys",
    "user.fields": options?.user_fields || "name,username,verified,profile_image_url,public_metrics",
    "media.fields": options?.media_fields || "url,preview_image_url,type,width,height,alt_text",
  });

  return bearerGet(`${API_BASE}/tweets/${tweetId}?${params.toString()}`, creds.bearer);
}

export async function searchTweets(
  query: string,
  creds: XCredentials,
  maxResults: number = 10
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Searching tweets requires Bearer token. Provide token in config or context.auth.x.");
  }

  const max = Math.max(10, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    query,
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,verified,profile_image_url",
    "media.fields": "url,preview_image_url,type",
  });

  return bearerGet(`${API_BASE}/tweets/search/recent?${params.toString()}`, creds.bearer);
}

export async function getTweetMetrics(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Tweet metrics (non-public) requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const params = "tweet.fields=public_metrics,non_public_metrics,organic_metrics";
  return oauthRequest("GET", `${API_BASE}/tweets/${tweetId}?${params}`, creds.oauth);
}

// ============================================================
// Users
// ============================================================

export async function getUser(
  username: string,
  creds: XCredentials,
  options?: { user_fields?: string }
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Reading user info requires Bearer token. Provide token in config or context.auth.x.");
  }

  const fields =
    options?.user_fields ||
    "created_at,description,public_metrics,verified,profile_image_url,url,location,pinned_tweet_id";
  const params = new URLSearchParams({ "user.fields": fields });

  return bearerGet(`${API_BASE}/users/by/username/${encodeURIComponent(username)}?${params.toString()}`, creds.bearer);
}

export async function getUserById(
  id: string,
  creds: XCredentials,
  options?: { user_fields?: string }
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Reading user info requires Bearer token. Provide token in config or context.auth.x.");
  }

  const fields =
    options?.user_fields ||
    "created_at,description,public_metrics,verified,profile_image_url,url,location,pinned_tweet_id";
  const params = new URLSearchParams({ "user.fields": fields });

  return bearerGet(`${API_BASE}/users/${id}?${params.toString()}`, creds.bearer);
}


export interface GetUserTweetsOptions {
  max_results?: number;
  pagination_token?: string;
  tweet_fields?: string;
  user_fields?: string;
  expansions?: string;
}

export async function getTimeline(
  userId: string,
  creds: XCredentials,
  maxResults: number = 10
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Reading timelines requires Bearer token. Provide token in config or context.auth.x.");
  }

  const max = Math.max(5, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet",
    expansions: "author_id,attachments.media_keys,referenced_tweets.id",
    "user.fields": "name,username,verified",
    "media.fields": "url,preview_image_url,type",
  });

  return bearerGet(`${API_BASE}/users/${userId}/tweets?${params.toString()}`, creds.bearer);
}

export async function getUserTweets(
  userId: string,
  options: GetUserTweetsOptions = {},
  token?: string
): Promise<{ data?: unknown[]; meta?: { next_token?: string }; includes?: Record<string, unknown[]> }> {
  const creds = token ? { bearer: token } : {};
  const maxResults = options.max_results ?? 10;
  const result = (await getTimeline(userId, creds, maxResults)) as {
    data?: unknown[];
    meta?: { next_token?: string };
    includes?: Record<string, unknown[]>;
  };

  // Apply additional options if provided
  if (options.pagination_token || options.tweet_fields || options.user_fields || options.expansions) {
    const params = new URLSearchParams();
    if (options.max_results != null) params.set("max_results", String(options.max_results));
    if (options.pagination_token) params.set("pagination_token", options.pagination_token);
    if (options.tweet_fields) params.set("tweet.fields", options.tweet_fields);
    if (options.user_fields) params.set("user.fields", options.user_fields);
    if (options.expansions) params.set("expansions", options.expansions);
    const qs = params.toString();
    return bearerGet(`${API_BASE}/users/${userId}/tweets${qs ? `?${qs}` : ""}`, creds.bearer!) as Promise<{
      data?: unknown[];
      meta?: { next_token?: string };
      includes?: Record<string, unknown[]>;
    }>;
  }

  return result;
}

export async function getFollowers(
  userId: string,
  creds: XCredentials,
  maxResults: number = 100
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Reading followers requires Bearer token. Provide token in config or context.auth.x.");
  }

  const max = Math.max(1, Math.min(maxResults, 1000));
  const params = new URLSearchParams({
    max_results: String(max),
    "user.fields": "created_at,description,public_metrics,verified,profile_image_url",
  });

  return bearerGet(`${API_BASE}/users/${userId}/followers?${params.toString()}`, creds.bearer);
}

export async function getFollowing(
  userId: string,
  creds: XCredentials,
  maxResults: number = 100
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error("Reading following list requires Bearer token. Provide token in config or context.auth.x.");
  }

  const max = Math.max(1, Math.min(maxResults, 1000));
  const params = new URLSearchParams({
    max_results: String(max),
    "user.fields": "created_at,description,public_metrics,verified,profile_image_url",
  });

  return bearerGet(`${API_BASE}/users/${userId}/following?${params.toString()}`, creds.bearer);
}

// ============================================================
// Me (authenticated user)
// ============================================================

export async function getMentions(creds: XCredentials, maxResults: number = 10): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Reading mentions requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  const max = Math.max(5, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,note_tweet",
    expansions: "author_id",
    "user.fields": "name,username,verified",
  });

  return oauthRequest("GET", `${API_BASE}/users/${userId}/mentions?${params.toString()}`, creds.oauth);
}

// ============================================================
// Engagement
// ============================================================

export async function likeTweet(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Liking tweets requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  return oauthRequest("POST", `${API_BASE}/users/${userId}/likes`, creds.oauth, { tweet_id: tweetId });
}

export async function retweet(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Retweeting requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  return oauthRequest("POST", `${API_BASE}/users/${userId}/retweets`, creds.oauth, { tweet_id: tweetId });
}

// ============================================================
// Bookmarks
// ============================================================

export async function getBookmarks(creds: XCredentials, maxResults: number = 10): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Reading bookmarks requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,verified,profile_image_url",
    "media.fields": "url,preview_image_url,type",
  });

  return oauthRequest("GET", `${API_BASE}/users/${userId}/bookmarks?${params.toString()}`, creds.oauth);
}

export async function bookmarkTweet(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Bookmarking tweets requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  return oauthRequest("POST", `${API_BASE}/users/${userId}/bookmarks`, creds.oauth, { tweet_id: tweetId });
}

export async function unbookmarkTweet(tweetId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Unbookmarking tweets requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }

  const userId = await getAuthenticatedUserId(creds);
  return oauthRequest("DELETE", `${API_BASE}/users/${userId}/bookmarks/${tweetId}`, creds.oauth);
}

// ============================================================
// Spaces
// See: https://docs.x.com/x-api/spaces/introduction
// ============================================================

export type SpaceState = "live" | "scheduled" | "all";

export async function searchSpaces(
  query: string,
  creds: XCredentials,
  options?: { state?: SpaceState; maxResults?: number }
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Searching Spaces requires Bearer token. Provide token in config or context.auth.x."
    );
  }

  const state = options?.state ?? "all";
  const maxResults = Math.max(1, Math.min(options?.maxResults ?? 100, 100));

  const params = new URLSearchParams({
    query: query.trim(),
    state,
    max_results: String(maxResults),
    "space.fields":
      "title,state,creator_id,host_ids,speaker_ids,participant_count,scheduled_start,started_at,ended_at,is_ticketed,lang",
    expansions: "creator_id,host_ids,speaker_ids",
    "user.fields": "name,username,profile_image_url,verified",
  });

  return bearerGet(`${API_BASE}/spaces/search?${params.toString()}`, creds.bearer);
}

export async function getSpaceById(spaceId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Looking up Spaces requires Bearer token. Provide token in config or context.auth.x."
    );
  }

  const id = spaceId.trim();
  if (!/^[a-zA-Z0-9]{1,13}$/.test(id)) {
    throw new Error(
      `Invalid Space ID: "${spaceId}". Space ID must be 1-13 alphanumeric characters (e.g. 1SLjjRYNejbKM).`
    );
  }

  const params = new URLSearchParams({
    "space.fields":
      "title,state,creator_id,host_ids,speaker_ids,participant_count,scheduled_start,started_at,ended_at,is_ticketed,lang",
    expansions: "creator_id,host_ids,speaker_ids",
    "user.fields": "name,username,profile_image_url,verified",
  });

  return bearerGet(`${API_BASE}/spaces/${encodeURIComponent(id)}?${params.toString()}`, creds.bearer);
}

export async function getSpacesByCreatorIds(
  userIds: string[],
  creds: XCredentials
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Looking up Spaces by creator requires Bearer token. Provide token in config or context.auth.x."
    );
  }

  const ids = userIds.map((id) => id.trim()).filter((id) => /^\d+$/.test(id));
  if (ids.length === 0 || ids.length > 100) {
    throw new Error(
      "user_ids must contain 1-100 valid numeric user IDs. Provide comma-separated user IDs."
    );
  }

  const params = new URLSearchParams({
    user_ids: ids.join(","),
    "space.fields":
      "title,state,creator_id,host_ids,speaker_ids,participant_count,scheduled_start,started_at,ended_at,is_ticketed,lang",
    expansions: "creator_id,host_ids,speaker_ids",
    "user.fields": "name,username,profile_image_url,verified",
  });

  return bearerGet(`${API_BASE}/spaces/by/creator_ids?${params.toString()}`, creds.bearer);
}

export async function getSpacePosts(
  spaceId: string,
  creds: XCredentials,
  maxResults: number = 100
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting Space posts requires Bearer token. Provide token in config or context.auth.x."
    );
  }

  const id = spaceId.trim();
  if (!/^[a-zA-Z0-9]{1,13}$/.test(id)) {
    throw new Error(
      `Invalid Space ID: "${spaceId}". Space ID must be 1-13 alphanumeric characters (e.g. 1SLjjRYNejbKM).`
    );
  }

  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,profile_image_url,verified",
  });

  return bearerGet(
    `${API_BASE}/spaces/${encodeURIComponent(id)}/tweets?${params.toString()}`,
    creds.bearer
  );
}

// ============================================================
// Lists
// See: https://docs.x.com/x-api/lists/list-lookup/introduction
// ============================================================

export async function getListById(listId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Looking up Lists requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  const params = new URLSearchParams({
    "list.fields": "description,owner_id,private,follower_count,member_count,created_at",
  });
  return bearerGet(`${API_BASE}/lists/${id}?${params.toString()}`, creds.bearer);
}

export async function getOwnedLists(
  userId: string,
  creds: XCredentials,
  maxResults: number = 100
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting owned Lists requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "list.fields": "description,owner_id,private,follower_count,member_count,created_at",
  });
  return bearerGet(`${API_BASE}/users/${userId}/owned_lists?${params.toString()}`, creds.bearer);
}

export async function getListTweets(
  listId: string,
  creds: XCredentials,
  maxResults: number = 100,
  paginationToken?: string
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting List tweets requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "tweet.fields": "created_at,public_metrics,author_id,conversation_id,entities,lang,note_tweet",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "name,username,profile_image_url,verified",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);
  return bearerGet(`${API_BASE}/lists/${id}/tweets?${params.toString()}`, creds.bearer);
}

export async function createList(
  name: string,
  creds: XCredentials,
  options?: { description?: string; private?: boolean }
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Creating Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const body: Record<string, unknown> = {
    name: name.trim(),
    ...(options?.description != null && { description: String(options.description) }),
    ...(options?.private != null && { private: Boolean(options.private) }),
  };
  return oauthRequest("POST", `${API_BASE}/lists`, creds.oauth, body);
}

export async function updateList(
  listId: string,
  creds: XCredentials,
  updates: { name?: string; description?: string; private?: boolean }
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Updating Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  const body: Record<string, unknown> = {};
  if (updates.name != null) body.name = String(updates.name).trim();
  if (updates.description != null) body.description = String(updates.description);
  if (updates.private != null) body.private = Boolean(updates.private);
  if (Object.keys(body).length === 0) {
    throw new Error("Provide at least one of --name, --description, or --private to update.");
  }
  return oauthRequest("PUT", `${API_BASE}/lists/${id}`, creds.oauth, body);
}

export async function deleteList(listId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Deleting Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  return oauthRequest("DELETE", `${API_BASE}/lists/${id}`, creds.oauth);
}

export async function getListMembers(
  listId: string,
  creds: XCredentials,
  maxResults: number = 100,
  paginationToken?: string
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting List members requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "user.fields": "name,username,profile_image_url,verified",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);
  return bearerGet(`${API_BASE}/lists/${id}/members?${params.toString()}`, creds.bearer);
}

export async function getListMemberships(
  userId: string,
  creds: XCredentials,
  maxResults: number = 100,
  paginationToken?: string
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting List memberships requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const max = Math.max(1, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    max_results: String(max),
    "list.fields": "description,owner_id,private,follower_count,member_count,created_at",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);
  return bearerGet(
    `${API_BASE}/users/${userId}/list_memberships?${params.toString()}`,
    creds.bearer
  );
}

export async function addListMember(
  listId: string,
  userId: string,
  creds: XCredentials
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Adding List members requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const listIdTrimmed = listId.trim();
  const userIdTrimmed = userId.trim();
  if (!/^\d{1,19}$/.test(listIdTrimmed)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  if (!/^\d{1,19}$/.test(userIdTrimmed)) {
    throw new Error(
      `Invalid user ID: "${userId}". User ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  return oauthRequest(
    "POST",
    `${API_BASE}/lists/${listIdTrimmed}/members`,
    creds.oauth,
    { user_id: userIdTrimmed }
  );
}

export async function removeListMember(
  listId: string,
  userId: string,
  creds: XCredentials
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Removing List members requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const listIdTrimmed = listId.trim();
  const userIdTrimmed = userId.trim();
  if (!/^\d{1,19}$/.test(listIdTrimmed)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  if (!/^\d{1,19}$/.test(userIdTrimmed)) {
    throw new Error(
      `Invalid user ID: "${userId}". User ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  return oauthRequest(
    "DELETE",
    `${API_BASE}/lists/${listIdTrimmed}/members/${userIdTrimmed}`,
    creds.oauth
  );
}

export async function getPinnedLists(
  userId: string,
  creds: XCredentials
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Getting pinned Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const params = new URLSearchParams({
    "list.fields": "description,owner_id,private,follower_count,member_count,created_at",
  });
  return oauthRequest(
    "GET",
    `${API_BASE}/users/${userId}/pinned_lists?${params.toString()}`,
    creds.oauth
  );
}

export async function pinList(listId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Pinning Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const userId = await getAuthenticatedUserId(creds);
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  return oauthRequest("POST", `${API_BASE}/users/${userId}/pinned_lists`, creds.oauth, {
    list_id: id,
  });
}

export async function unpinList(listId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Unpinning Lists requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret."
    );
  }
  const userId = await getAuthenticatedUserId(creds);
  const id = listId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid List ID: "${listId}". List ID must be 1-19 digit numeric string (e.g. 1234567890).`
    );
  }
  return oauthRequest(
    "DELETE",
    `${API_BASE}/users/${userId}/pinned_lists/${id}`,
    creds.oauth
  );
}

// ============================================================
// Communities
// See: https://docs.x.com/x-api/communities/search/introduction
// ============================================================

export async function searchCommunities(
  query: string,
  creds: XCredentials,
  maxResults: number = 10,
  paginationToken?: string
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Searching Communities requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const q = query.trim();
  if (!q) {
    throw new Error("Search query cannot be empty. Provide a keyword to search Communities.");
  }
  const max = Math.max(10, Math.min(maxResults, 100));
  const params = new URLSearchParams({
    query: q,
    max_results: String(max),
    "community.fields": "name,description,member_count,created_at,access",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);
  return bearerGet(`${API_BASE}/communities/search?${params.toString()}`, creds.bearer);
}

export async function getCommunityById(communityId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Looking up Communities requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const id = communityId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid Community ID: "${communityId}". Community ID must be 1-19 digit numeric string (e.g. 1146654567674912769).`
    );
  }
  const params = new URLSearchParams({
    "community.fields": "name,description,member_count,created_at,access,join_policy",
  });
  return bearerGet(`${API_BASE}/communities/${id}?${params.toString()}`, creds.bearer);
}

// ============================================================
// Trends
// See: https://docs.x.com/x-api/trends/trends-by-woeid/introduction
// ============================================================

export async function getTrendsByWoeid(
  woeid: number,
  creds: XCredentials,
  maxTrends: number = 20
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting trends requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const max = Math.max(1, Math.min(maxTrends, 50));
  const params = new URLSearchParams({
    max_trends: String(max),
    "trend.fields": "trend_name,tweet_count",
  });
  return bearerGet(`${API_BASE}/trends/by/woeid/${woeid}?${params.toString()}`, creds.bearer);
}

// ============================================================
// News
// See: https://docs.x.com/x-api/news/introduction
// ============================================================

export async function getNewsById(newsId: string, creds: XCredentials): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Getting news requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const id = newsId.trim();
  if (!/^\d{1,19}$/.test(id)) {
    throw new Error(
      `Invalid News ID: "${newsId}". News ID must be 1-19 digit numeric string (e.g. 1989418137272422538).`
    );
  }
  const params = new URLSearchParams({
    "news.fields": "category,name,summary,hook,contexts,cluster_posts_results,disclaimer,keywords",
  });
  return bearerGet(`${API_BASE}/news/${id}?${params.toString()}`, creds.bearer);
}

export async function searchNews(
  query: string,
  creds: XCredentials,
  options?: { maxResults?: number; maxAgeHours?: number }
): Promise<unknown> {
  if (!creds.bearer) {
    throw new Error(
      "Searching news requires Bearer token. Provide token in config or context.auth.x."
    );
  }
  const q = query.trim();
  if (!q) {
    throw new Error("Search query cannot be empty. Provide a keyword to search news.");
  }
  const maxResults = Math.max(1, Math.min(options?.maxResults ?? 10, 100));
  const maxAgeHours = Math.max(1, Math.min(options?.maxAgeHours ?? 168, 720));
  const params = new URLSearchParams({
    query: q,
    max_results: String(maxResults),
    max_age_hours: String(maxAgeHours),
    "news.fields": "category,name,summary,hook,contexts,cluster_posts_results,disclaimer,keywords",
  });
  return bearerGet(`${API_BASE}/news/search?${params.toString()}`, creds.bearer);
}

// ============================================================
// Media Upload (v1.1 API)
// ============================================================

const UPLOAD_API_BASE = "https://upload.twitter.com/1.1";

function isRejectedMediaType(contentType: string | null): boolean {
  if (!contentType) return false;
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  return ["text/html", "text/plain", "application/json", "text/xml", "application/xml"].some(
    (t) => base === t || base.startsWith("text/")
  );
}

/**
 * Upload media file to Twitter (v1.1 API).
 * Returns media_id_string that can be used in tweet.post with mediaIds option.
 *
 * @param mediaUrl URL to the media file (must be accessible from the server)
 * @param creds OAuth credentials
 * @param options Optional upload options
 */
export async function uploadMedia(
  mediaUrl: string,
  creds: XCredentials,
  options?: { mediaCategory?: string; additionalOwners?: string; fileName?: string }
): Promise<unknown> {
  if (!creds.oauth) {
    throw new Error(
      "Media upload requires OAuth credentials. Provide apiKey, apiSecret, accessToken, and accessTokenSecret in config or context.auth."
    );
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    throw new Error(`Invalid media URL: "${mediaUrl}". Must be a valid HTTP(S) URL.`);
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Invalid media URL protocol: ${parsedUrl.protocol}. Use https:// or http://.`);
  }

  // Fetch media from URL
  let response: Response;
  try {
    response = await fetch(mediaUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch media from URL: ${msg}. Check that the URL is accessible.`);
  }

  if (!response.ok) {
    throw new Error(
      `Media URL returned ${response.status} ${response.statusText}. The URL may be broken or the resource may not exist.`
    );
  }

  const fileBuffer = await response.arrayBuffer();
  const byteLength = fileBuffer.byteLength;

  if (byteLength === 0) {
    throw new Error(
      "Media file is empty (0 bytes). The URL may point to an empty file or redirect to a blank page."
    );
  }

  const contentType = response.headers.get("content-type");
  if (isRejectedMediaType(contentType)) {
    throw new Error(
      `Unsupported media type: ${contentType ?? "unknown"}. Expected image (jpg, png, gif, webp) or video (mp4). The URL may point to an HTML page instead of a media file.`
    );
  }

  // Extract filename from URL or use provided filename
  let fileName = options?.fileName;
  if (!fileName) {
    const pathname = parsedUrl.pathname;
    fileName = pathname.split("/").pop() || "media";
    if (fileName.includes("?")) fileName = fileName.split("?")[0]!;
  }

  // Create FormData
  // Node.js 18+ FormData accepts Blob with filename as third parameter
  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  // FormData.append accepts (name, value, filename) where value can be Blob
  formData.append("media", blob, fileName);

  if (options?.mediaCategory) {
    formData.append("media_category", options.mediaCategory);
  }
  if (options?.additionalOwners) {
    formData.append("additional_owners", options.additionalOwners);
  }

  // Upload to v1.1 API
  const url = `${UPLOAD_API_BASE}/media/upload.json`;
  return oauthRequestFormData("POST", url, creds.oauth, formData);
}


