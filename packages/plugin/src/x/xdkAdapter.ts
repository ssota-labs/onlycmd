/**
 * XDK adapter: uses @xdevplatform/xdk for X API calls.
 * Creates client per request (serverless-safe). Normalizes responses to snake_case for API compatibility.
 */

import { Client, OAuth1 } from "@xdevplatform/xdk";
import type { XAdapter } from "./adapter.js";
import { getXCredentials, requiresAuthResponse } from "./api.js";
import { uploadMedia } from "./api.js";
import type { XCredentials } from "./api.js";

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function toSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

function normalizeResponse<T>(data: T): unknown {
  return toSnakeCase(data) as unknown;
}

function createClient(creds: XCredentials): Client {
  const config: Record<string, unknown> = {};
  if (creds.bearer) {
    config.bearerToken = creds.bearer;
  }
  if (creds.oauth) {
    const oauth1 = new OAuth1({
      apiKey: creds.oauth.apiKey,
      apiSecret: creds.oauth.apiSecret,
      callback: "oob",
      accessToken: creds.oauth.accessToken,
      accessTokenSecret: creds.oauth.accessTokenSecret,
    });
    (oauth1 as { accessToken?: { accessToken: string; accessTokenSecret: string } }).accessToken = {
      accessToken: creds.oauth.accessToken,
      accessTokenSecret: creds.oauth.accessTokenSecret,
    };
    config.oauth1 = oauth1;
  }
  return new Client(config as never);
}

function wrapXdk<T>(fn: () => Promise<T>): Promise<unknown> {
  return fn().then(normalizeResponse).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status;
    if (status === 429) {
      throw new Error(
        `X API rate limit exceeded. Request again after the limit resets. Reduce request frequency.`
      );
    }
    throw new Error(
      `X API error${status ? ` (HTTP ${status})` : ""}: ${msg}. Check credentials, permissions, and request parameters.`
    );
  });
}

async function getAuthenticatedUserIdXdk(creds: XCredentials): Promise<string> {
  const client = createClient(creds);
  const res = (await client.users.getMe()) as { data?: { id?: string } };
  if (!res?.data?.id) {
    throw new Error("Failed to get authenticated user ID");
  }
  return res.data.id;
}

export function createXdkAdapter(): XAdapter {
  return {
    getCredentials: getXCredentials,
    requiresAuthResponse,
    getAuthenticatedUserId: getAuthenticatedUserIdXdk,

    postTweet: (text, creds, options) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        const body: Record<string, unknown> = { text };
        if (options?.replyTo) body.reply = { inReplyToTweetId: options.replyTo };
        if (options?.quoteTweetId) body.quoteTweetId = options.quoteTweetId;
        if (options?.pollOptions?.length) {
          body.poll = {
            options: options.pollOptions,
            durationMinutes: options.pollDurationMinutes ?? 1440,
          };
        }
        if (options?.mediaIds?.length) body.media = { mediaIds: options.mediaIds };
        return (await client.posts.create(body as never)) as unknown;
      }),

    getTweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.posts.getById(tweetId)) as unknown;
      }),

    deleteTweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.posts.delete(tweetId)) as unknown;
      }),

    searchTweets: (query, creds, maxResults = 10) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.posts.searchRecent(query, {
          maxResults: Math.max(10, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    getTweetMetrics: (tweetId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        const res = (await client.posts.getById(tweetId, {
          tweetFields: ["publicMetrics", "nonPublicMetrics", "organicMetrics"],
        })) as { data?: unknown };
        return res;
      }),

    getUser: (username, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getByUsername(username)) as unknown;
      }),

    getUserById: (id, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        const res = (await client.users.getByIds([id])) as { data?: unknown[] };
        if (res?.data?.[0]) return { data: res.data[0] };
        return { data: null };
      }),

    getTimeline: (userId, creds, maxResults = 10) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getTimeline(userId, {
          maxResults: Math.max(5, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    getFollowers: (userId, creds, maxResults = 100) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getFollowers(userId, {
          maxResults: Math.max(1, Math.min(maxResults, 1000)),
        })) as unknown;
      }),

    getFollowing: (userId, creds, maxResults = 100) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getFollowing(userId, {
          maxResults: Math.max(1, Math.min(maxResults, 1000)),
        })) as unknown;
      }),

    getMentions: (creds, maxResults = 10) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.getMentions(userId, {
          maxResults: Math.max(5, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    likeTweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.likePost(userId, { body: { tweetId } } as never)) as unknown;
      }),

    retweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.repostPost(userId, { body: { tweetId } } as never)) as unknown;
      }),

    getBookmarks: (creds, maxResults = 10) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.getBookmarks(userId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    bookmarkTweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.createBookmark(userId, { tweetId } as never)) as unknown;
      }),

    unbookmarkTweet: (tweetId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.deleteBookmark(userId, tweetId)) as unknown;
      }),

    searchSpaces: (query, creds, options) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.spaces.search(query, {
          state: options?.state ?? "all",
          maxResults: Math.max(1, Math.min(options?.maxResults ?? 100, 100)),
        })) as unknown;
      }),

    getSpaceById: (spaceId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.spaces.getById(spaceId)) as unknown;
      }),

    getSpacesByCreatorIds: (userIds, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.spaces.getByCreatorIds(userIds)) as unknown;
      }),

    getSpacePosts: (spaceId, creds, maxResults = 100) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.spaces.getPosts(spaceId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    getListById: (listId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.getById(listId)) as unknown;
      }),

    getOwnedLists: (userId, creds, maxResults = 100) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getOwnedLists(userId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    getListTweets: (listId, creds, maxResults = 100, paginationToken) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.getPosts(listId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
          paginationToken,
        })) as unknown;
      }),

    createList: (name, creds, options) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        const body = {
          name,
          ...(options?.description != null && { description: options.description }),
          ...(options?.private != null && { private: options.private }),
        };
        return (await client.lists.create({ body })) as unknown;
      }),

    updateList: (listId, creds, updates) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        const body: Record<string, unknown> = {};
        if (updates.name != null) body.name = updates.name;
        if (updates.description != null) body.description = updates.description;
        if (updates.private != null) body.private = updates.private;
        return (await client.lists.update(listId, { body })) as unknown;
      }),

    deleteList: (listId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.delete(listId)) as unknown;
      }),

    getListMembers: (listId, creds, maxResults = 100, paginationToken) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.getMembers(listId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
          paginationToken,
        })) as unknown;
      }),

    getListMemberships: (userId, creds, maxResults = 100) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getListMemberships(userId, {
          maxResults: Math.max(1, Math.min(maxResults, 100)),
        })) as unknown;
      }),

    addListMember: (listId, userId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.addMember(listId, { body: { userId } } as never)) as unknown;
      }),

    removeListMember: (listId, userId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.lists.removeMemberByUserId(listId, userId)) as unknown;
      }),

    getPinnedLists: (userId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.users.getPinnedLists(userId)) as unknown;
      }),

    pinList: (listId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.pinList(userId, { listId })) as unknown;
      }),

    unpinList: (listId, creds) =>
      wrapXdk(async () => {
        const userId = await getAuthenticatedUserIdXdk(creds);
        const client = createClient(creds);
        return (await client.users.unpinList(userId, listId)) as unknown;
      }),

    uploadMedia,

    searchCommunities: (query, creds, maxResults = 10, paginationToken) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.communities.search(query, {
          maxResults: Math.max(10, Math.min(maxResults ?? 10, 100)),
          paginationToken,
        })) as unknown;
      }),

    getCommunityById: (communityId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.communities.getById(communityId)) as unknown;
      }),

    getTrendsByWoeid: (woeid, creds, maxTrends = 20) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.trends.getByWoeid(woeid, {
          maxTrends: Math.max(1, Math.min(maxTrends ?? 20, 50)),
        })) as unknown;
      }),

    getNewsById: (newsId, creds) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.news.get(newsId)) as unknown;
      }),

    searchNews: (query, creds, options) =>
      wrapXdk(async () => {
        const client = createClient(creds);
        return (await client.news.search(query, {
          maxResults: Math.max(1, Math.min(options?.maxResults ?? 10, 100)),
          maxAgeHours: Math.max(1, Math.min(options?.maxAgeHours ?? 168, 720)),
        })) as unknown;
      }),
  };
}
