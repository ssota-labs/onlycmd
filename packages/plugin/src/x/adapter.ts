/**
 * X API adapter interface.
 * Handlers depend on this interface so backends (api.ts, XDK) can be swapped.
 */

import {
  getXCredentials,
  requiresAuthResponse,
  getAuthenticatedUserId,
  postTweet,
  getTweet,
  deleteTweet,
  searchTweets,
  getTweetMetrics,
  getUser,
  getUserById,
  getTimeline,
  getFollowers,
  getFollowing,
  getMentions,
  likeTweet,
  retweet,
  getBookmarks,
  bookmarkTweet,
  unbookmarkTweet,
  searchSpaces,
  getSpaceById,
  getSpacesByCreatorIds,
  getSpacePosts,
  getListById,
  getOwnedLists,
  getListTweets,
  createList,
  updateList,
  deleteList,
  getListMembers,
  getListMemberships,
  addListMember,
  removeListMember,
  getPinnedLists,
  pinList,
  unpinList,
  uploadMedia,
  searchCommunities,
  getCommunityById,
  getTrendsByWoeid,
  getNewsById,
  searchNews,
} from "./api.js";
import type { XConfig, XCredentials, RequiresAuthResponse, PostTweetOptions, SpaceState } from "./api.js";

export type { XConfig, XCredentials, RequiresAuthResponse, PostTweetOptions, SpaceState };

export interface XAdapter {
  getCredentials(config: XConfig | undefined, contextAuth?: Record<string, string>): XCredentials;
  requiresAuthResponse(creds: XCredentials): RequiresAuthResponse | null;
  getAuthenticatedUserId(creds: XCredentials): Promise<string>;

  postTweet(text: string, creds: XCredentials, options?: PostTweetOptions): Promise<unknown>;
  getTweet(
    tweetId: string,
    creds: XCredentials,
    options?: { tweet_fields?: string; user_fields?: string; expansions?: string; media_fields?: string }
  ): Promise<unknown>;
  deleteTweet(tweetId: string, creds: XCredentials): Promise<unknown>;
  searchTweets(query: string, creds: XCredentials, maxResults?: number): Promise<unknown>;
  getTweetMetrics(tweetId: string, creds: XCredentials): Promise<unknown>;

  getUser(username: string, creds: XCredentials, options?: { user_fields?: string }): Promise<unknown>;
  getUserById(id: string, creds: XCredentials, options?: { user_fields?: string }): Promise<unknown>;
  getTimeline(userId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;
  getFollowers(userId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;
  getFollowing(userId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;

  getMentions(creds: XCredentials, maxResults?: number): Promise<unknown>;
  likeTweet(tweetId: string, creds: XCredentials): Promise<unknown>;
  retweet(tweetId: string, creds: XCredentials): Promise<unknown>;
  getBookmarks(creds: XCredentials, maxResults?: number): Promise<unknown>;
  bookmarkTweet(tweetId: string, creds: XCredentials): Promise<unknown>;
  unbookmarkTweet(tweetId: string, creds: XCredentials): Promise<unknown>;

  searchSpaces(
    query: string,
    creds: XCredentials,
    options?: { state?: SpaceState; maxResults?: number }
  ): Promise<unknown>;
  getSpaceById(spaceId: string, creds: XCredentials): Promise<unknown>;
  getSpacesByCreatorIds(userIds: string[], creds: XCredentials): Promise<unknown>;
  getSpacePosts(spaceId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;

  getListById(listId: string, creds: XCredentials): Promise<unknown>;
  getOwnedLists(userId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;
  getListTweets(
    listId: string,
    creds: XCredentials,
    maxResults?: number,
    paginationToken?: string
  ): Promise<unknown>;
  createList(
    name: string,
    creds: XCredentials,
    options?: { description?: string; private?: boolean }
  ): Promise<unknown>;
  updateList(
    listId: string,
    creds: XCredentials,
    updates: { name?: string; description?: string; private?: boolean }
  ): Promise<unknown>;
  deleteList(listId: string, creds: XCredentials): Promise<unknown>;
  getListMembers(
    listId: string,
    creds: XCredentials,
    maxResults?: number,
    paginationToken?: string
  ): Promise<unknown>;
  getListMemberships(userId: string, creds: XCredentials, maxResults?: number): Promise<unknown>;
  addListMember(listId: string, userId: string, creds: XCredentials): Promise<unknown>;
  removeListMember(listId: string, userId: string, creds: XCredentials): Promise<unknown>;
  getPinnedLists(userId: string, creds: XCredentials): Promise<unknown>;
  pinList(listId: string, creds: XCredentials): Promise<unknown>;
  unpinList(listId: string, creds: XCredentials): Promise<unknown>;

  uploadMedia(
    mediaUrl: string,
    creds: XCredentials,
    options?: { mediaCategory?: string; additionalOwners?: string; fileName?: string }
  ): Promise<unknown>;

  searchCommunities(
    query: string,
    creds: XCredentials,
    maxResults?: number,
    paginationToken?: string
  ): Promise<unknown>;
  getCommunityById(communityId: string, creds: XCredentials): Promise<unknown>;

  getTrendsByWoeid(woeid: number, creds: XCredentials, maxTrends?: number): Promise<unknown>;

  getNewsById(newsId: string, creds: XCredentials): Promise<unknown>;
  searchNews(
    query: string,
    creds: XCredentials,
    options?: { maxResults?: number; maxAgeHours?: number }
  ): Promise<unknown>;
}

/**
 * Pass-through adapter delegating to api.ts. No logic changes.
 */
export function createApiAdapter(): XAdapter {
  return {
    getCredentials: getXCredentials,
    requiresAuthResponse,
    getAuthenticatedUserId,
    postTweet,
    getTweet,
    deleteTweet,
    searchTweets,
    getTweetMetrics,
    getUser,
    getUserById,
    getTimeline,
    getFollowers,
    getFollowing,
    getMentions,
    likeTweet,
    retweet,
    getBookmarks,
    bookmarkTweet,
    unbookmarkTweet,
    searchSpaces,
    getSpaceById,
    getSpacesByCreatorIds,
    getSpacePosts,
    getListById,
    getOwnedLists,
    getListTweets,
    createList,
    updateList,
    deleteList,
    getListMembers,
    getListMemberships,
    addListMember,
    removeListMember,
    getPinnedLists,
    pinList,
    unpinList,
    uploadMedia,
    searchCommunities,
    getCommunityById,
    getTrendsByWoeid,
    getNewsById,
    searchNews,
  };
}
