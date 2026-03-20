import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";

export function createNewsHandlers(config: XConfig, adapter: XAdapter) {
  return {
    get: {
      args: {
        id: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const id = String(args.id).trim();
        return adapter.getNewsById(id, creds);
      },
    },
    search: {
      args: {
        query: { type: "string" as const, required: true },
        max: { type: "number" as const, required: false, default: 10 },
        max_age_hours: { type: "number" as const, required: false, default: 168 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const query = String(args.query).trim();
        if (!query) {
          throw new Error("Search query cannot be empty. Provide a keyword to search news.");
        }
        const maxResults = args.max != null ? Number(args.max) : 10;
        const maxAgeHours = args.max_age_hours != null ? Number(args.max_age_hours) : 168;
        return adapter.searchNews(query, creds, { maxResults, maxAgeHours });
      },
    },
  };
}
