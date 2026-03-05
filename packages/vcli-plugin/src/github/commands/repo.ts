import type { RunContext } from "vcli";
import { githubGet, getToken } from "../api.js";

export function createRepoHandlers(config: { token?: string }) {
  return {
    view: {
      args: {
        repo: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const data = await githubGet<unknown>(
          `/repos/${owner}/${rep}`,
          token
        );
        return data;
      },
    },
  };
}
