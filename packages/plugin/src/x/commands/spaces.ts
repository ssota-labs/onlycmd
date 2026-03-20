import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig, SpaceState } from "../adapter.js";
import { stripAt } from "../utils.js";

export function createSpacesHandlers(config: XConfig, adapter: XAdapter) {
  return {
    search: {
      args: {
        query: { type: "string" as const, required: true },
        state: { type: "string" as const, required: false },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const query = String(args.query).trim();
        if (!query) {
          throw new Error("Search query cannot be empty. Provide a keyword to search Spaces.");
        }
        const stateRaw = args.state != null ? String(args.state).toLowerCase() : "all";
        const state: SpaceState =
          stateRaw === "live" || stateRaw === "scheduled" ? stateRaw : "all";
        const maxResults = args.max != null ? Number(args.max) : 100;
        return adapter.searchSpaces(query, creds, { state, maxResults });
      },
    },
    get: {
      args: {
        id: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const id = String(args.id).trim();
        return adapter.getSpaceById(id, creds);
      },
    },
    by_creator: {
      args: {
        user_ids: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const input = String(args.user_ids).trim();
        const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

        const userIds: string[] = [];
        for (const part of parts) {
          if (/^\d+$/.test(part)) {
            userIds.push(part);
          } else {
            const username = stripAt(part);
            const userData = (await adapter.getUser(username, creds)) as { data?: { id?: string } };
            if (!userData.data?.id) {
              throw new Error(`User not found: ${username}. Provide a valid @username or numeric user ID.`);
            }
            userIds.push(userData.data.id);
          }
        }

        if (userIds.length === 0) {
          throw new Error(
            "Provide at least one user ID or @username. Use comma-separated values for multiple (e.g. 123,456 or @user1,@user2)."
          );
        }

        return adapter.getSpacesByCreatorIds(userIds, creds);
      },
    },
    posts: {
      args: {
        id: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 100 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const id = String(args.id).trim();
        const maxResults = args.max != null ? Number(args.max) : 100;
        return adapter.getSpacePosts(id, creds, maxResults);
      },
    },
  };
}
