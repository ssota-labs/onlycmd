import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";
import { parseTweetId } from "../utils.js";

export function createTweetHandlers(config: XConfig, adapter: XAdapter) {
  return {
    post: {
      args: {
        text: { type: "string" as const, required: true },
        poll: { type: "string" as const, required: false },
        poll_duration: { type: "number" as const, required: false, default: 1440 },
        media_ids: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const text = String(args.text);
        const pollOptions = args.poll ? String(args.poll).split(",").map((s) => s.trim()) : undefined;
        const pollDuration = args.poll_duration != null ? Number(args.poll_duration) : 1440;
        const mediaIds = args.media_ids ? String(args.media_ids).split(",").map((s) => s.trim()) : undefined;
        return adapter.postTweet(text, creds, {
          pollOptions,
          pollDurationMinutes: pollDuration,
          mediaIds,
        });
      },
    },
    get: {
      args: {
        id_or_url: { type: "string" as const, required: true },
        tweet_fields: { type: "string" as const, required: false },
        user_fields: { type: "string" as const, required: false },
        expansions: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const tweetId = parseTweetId(String(args.id_or_url));
        const tweetFields = args.tweet_fields != null ? String(args.tweet_fields) : undefined;
        const userFields = args.user_fields != null ? String(args.user_fields) : undefined;
        const expansions = args.expansions != null ? String(args.expansions) : undefined;
        return adapter.getTweet(
          tweetId,
          creds,
          tweetFields || userFields || expansions
            ? { tweet_fields: tweetFields, user_fields: userFields, expansions }
            : undefined
        );
      },
    },
    delete: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.deleteTweet(tweetId, creds);
      },
    },
    reply: {
      args: {
        id_or_url: { type: "string" as const, required: true },
        text: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        const text = String(args.text);
        return adapter.postTweet(text, creds, { replyTo: tweetId });
      },
    },
    quote: {
      args: {
        id_or_url: { type: "string" as const, required: true },
        text: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        const text = String(args.text);
        return adapter.postTweet(text, creds, { quoteTweetId: tweetId });
      },
    },
    search: {
      args: {
        query: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 10 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const query = String(args.query);
        const maxResults = args.max != null ? Number(args.max) : 10;
        return adapter.searchTweets(query, creds, maxResults);
      },
    },
    metrics: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.getTweetMetrics(tweetId, creds);
      },
    },
  };
}
