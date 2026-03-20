import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";
import { parseTweetId } from "../utils.js";

export function createMeHandlers(config: XConfig, adapter: XAdapter) {
  return {
    mentions: {
      args: {
        max: { type: "number" as const, required: false, default: 10 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const maxResults = args.max != null ? Number(args.max) : 10;
        return adapter.getMentions(creds, maxResults);
      },
    },
    bookmarks: {
      args: {
        max: { type: "number" as const, required: false, default: 10 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const maxResults = args.max != null ? Number(args.max) : 10;
        return adapter.getBookmarks(creds, maxResults);
      },
    },
    bookmark: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.bookmarkTweet(tweetId, creds);
      },
    },
    unbookmark: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.unbookmarkTweet(tweetId, creds);
      },
    },
    view: {
      args: {},
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const userId = await adapter.getAuthenticatedUserId(creds);
        return adapter.getUserById(userId, creds);
      },
    },
  };
}
