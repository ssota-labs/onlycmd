import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";
import { stripAt } from "../utils.js";

export function createUserHandlers(config: XConfig, adapter: XAdapter) {
  return {
    get: {
      args: {
        username: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        return adapter.getUser(username, creds);
      },
    },
    timeline: {
      args: {
        username: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 10 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
        if (!userData.data?.id) {
          throw new Error(`User not found: ${username}`);
        }
        const maxResults = args.max != null ? Number(args.max) : 10;
        return adapter.getTimeline(userData.data.id, creds, maxResults);
      },
    },
    followers: {
      args: {
        username: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
        if (!userData.data?.id) {
          throw new Error(`User not found: ${username}`);
        }
        const maxResults = args.max != null ? Number(args.max) : 100;
        return adapter.getFollowers(userData.data.id, creds, maxResults);
      },
    },
    following: {
      args: {
        username: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const username = stripAt(String(args.username));
        const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
        if (!userData.data?.id) {
          throw new Error(`User not found: ${username}`);
        }
        const maxResults = args.max != null ? Number(args.max) : 100;
        return adapter.getFollowing(userData.data.id, creds, maxResults);
      },
    },
  };
}
