import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";
import { parseTweetId } from "../utils.js";

export function createEngageHandlers(config: XConfig, adapter: XAdapter) {
  return {
    like: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.likeTweet(tweetId, creds);
      },
    },
    retweet: {
      args: {
        id_or_url: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const tweetId = parseTweetId(String(args.id_or_url));
        return adapter.retweet(tweetId, creds);
      },
    },
  };
}
