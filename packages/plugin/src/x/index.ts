import { defineModule } from "../../../core/dist/index.js";
import { createTweetHandlers } from "./commands/tweet.js";
import { createUserHandlers } from "./commands/user.js";
import { createMeHandlers } from "./commands/me.js";
import { createEngageHandlers } from "./commands/engage.js";
import { createMediaHandlers } from "./commands/media.js";
import { createSpacesHandlers } from "./commands/spaces.js";
import { createListHandlers } from "./commands/lists.js";
import { createCommunitiesHandlers } from "./commands/communities.js";
import { createTrendsHandlers } from "./commands/trends.js";
import { createNewsHandlers } from "./commands/news.js";
import { skill } from "./skill.js";
import { createApiAdapter } from "./adapter.js";
import { createXdkAdapter } from "./xdkAdapter.js";
import type { XConfig } from "./adapter.js";

export type { XConfig } from "./adapter.js";

/** Extended config for setup: adapter backend selection */
export interface XModuleConfig extends XConfig {
  /** Adapter backend: 'xdk' (default, XDK-first with api fallback) or 'api' (legacy only) */
  adapter?: "xdk" | "api";
}

/**
 * X (Twitter) plugin: comprehensive API wrapper via virtual CLI.
 * Supports Bearer token (read-only) and OAuth 1.0a (write operations).
 *
 * Credentials:
 * - Bearer: config.token or context.auth.x
 * - OAuth: config.{apiKey,apiSecret,accessToken,accessTokenSecret} or context.auth.{x_api_key,x_api_secret,x_access_token,x_access_token_secret}
 */
export const x = defineModule({
  name: "x",
  description: "X (Twitter) operations via virtual CLI - comprehensive API wrapper",
  setup: (config?: XModuleConfig) => {
    const cfg = config ?? {};
    const useApiOnly = cfg.adapter === "api";
    const adapter = useApiOnly ? createApiAdapter() : createXdkAdapter();

    const userHandlers = createUserHandlers(cfg, adapter);
    const tweetHandlers = createTweetHandlers(cfg, adapter);
    const meHandlers = createMeHandlers(cfg, adapter);
    const engageHandlers = createEngageHandlers(cfg, adapter);
    const mediaHandlers = createMediaHandlers(cfg, adapter);
    const spacesHandlers = createSpacesHandlers(cfg, adapter);
    const listHandlers = createListHandlers(cfg, adapter);
    const communitiesHandlers = createCommunitiesHandlers(cfg, adapter);
    const trendsHandlers = createTrendsHandlers(cfg, adapter);
    const newsHandlers = createNewsHandlers(cfg, adapter);

    return {
      name: "x",
      description: "X (Twitter) operations via virtual CLI - comprehensive API wrapper",
      commands: {
        tweet: {
          post: tweetHandlers.post,
          get: tweetHandlers.get,
          delete: tweetHandlers.delete,
          reply: tweetHandlers.reply,
          quote: tweetHandlers.quote,
          search: tweetHandlers.search,
          metrics: tweetHandlers.metrics,
        },
        user: {
          get: userHandlers.get,
          timeline: userHandlers.timeline,
          followers: userHandlers.followers,
          following: userHandlers.following,
        },
        me: {
          mentions: meHandlers.mentions,
          bookmarks: meHandlers.bookmarks,
          bookmark: meHandlers.bookmark,
          unbookmark: meHandlers.unbookmark,
          view: meHandlers.view,
        },
        like: engageHandlers.like,
        retweet: engageHandlers.retweet,
        media: {
          upload: mediaHandlers.upload,
        },
        spaces: {
          search: spacesHandlers.search,
          get: spacesHandlers.get,
          by_creator: spacesHandlers.by_creator,
          posts: spacesHandlers.posts,
        },
        list: {
          get: listHandlers.get,
          owned: listHandlers.owned,
          tweets: listHandlers.tweets,
          create: listHandlers.create,
          update: listHandlers.update,
          delete: listHandlers.delete,
          members: listHandlers.members,
          memberships: listHandlers.memberships,
          add_member: listHandlers.add_member,
          remove_member: listHandlers.remove_member,
          pinned: listHandlers.pinned,
          pin: listHandlers.pin,
          unpin: listHandlers.unpin,
        },
        community: {
          search: communitiesHandlers.search,
          get: communitiesHandlers.get,
        },
        trends: {
          by_woeid: trendsHandlers.by_woeid,
        },
        news: {
          get: newsHandlers.get,
          search: newsHandlers.search,
        },
      },
      skill,
    };
  },
});
