import type { RunContext } from "../../../../core/dist/index.js";
import type { XAdapter, XConfig } from "../adapter.js";

export function createMediaHandlers(config: XConfig, adapter: XAdapter) {
  return {
    upload: {
      args: {
        url: { type: "string" as const, required: true },
        media_category: { type: "string" as const, required: false },
        additional_owners: { type: "string" as const, required: false },
        filename: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const creds = adapter.getCredentials(config, context?.auth);
        const authRequired = adapter.requiresAuthResponse(creds);
        if (authRequired) return authRequired;
        const mediaUrl = String(args.url);
        const mediaCategory = args.media_category != null ? String(args.media_category) : undefined;
        const additionalOwners = args.additional_owners != null ? String(args.additional_owners) : undefined;
        const fileName = args.filename != null ? String(args.filename) : undefined;

        return adapter.uploadMedia(mediaUrl, creds, {
          mediaCategory,
          additionalOwners,
          fileName,
        });
      },
    },
  };
}
