import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";

export function createCommunitiesHandlers(config: XConfig, adapter: XAdapter) {
  return {
    search: {
      args: {
        query: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 10 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const query = String(args.query).trim();
        if (!query) {
          throw new Error("Search query cannot be empty. Provide a keyword to search Communities.");
        }
        const max = args.max != null ? Number(args.max) : 10;
        return adapter.searchCommunities(query, creds, max);
      },
    },
    get: {
      args: {
        id: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const id = String(args.id).trim();
        return adapter.getCommunityById(id, creds);
      },
    },
  };
}
