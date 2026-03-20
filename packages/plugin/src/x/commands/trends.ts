import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";

/** Common WOEIDs: Worldwide=1, US=23424977, UK=23424975, Japan=23424856, NYC=2459115, LA=2442047, London=44418, Tokyo=1118370 */
export function createTrendsHandlers(config: XConfig, adapter: XAdapter) {
  return {
    by_woeid: {
      args: {
        woeid: { type: "number" as const, required: true },
        max: { type: "number" as const, required: false, default: 20 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const woeid = Number(args.woeid);
        if (!Number.isInteger(woeid) || woeid < 1) {
          throw new Error("WOEID must be a positive integer (e.g. 1 for Worldwide, 23424977 for US).");
        }
        const max = args.max != null ? Number(args.max) : 20;
        return adapter.getTrendsByWoeid(woeid, creds, max);
      },
    },
  };
}
