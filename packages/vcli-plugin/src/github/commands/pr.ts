import type { RunContext } from "vcli";
import { githubGet, githubPost, getToken } from "../api.js";

export function createPrHandlers(config: { token?: string }) {
  return {
    list: {
      args: {
        repo: { type: "string" as const, required: true },
        state: { type: "string" as const, default: "open" },
        limit: { type: "number" as const, default: 20 },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const params = new URLSearchParams();
        params.set("state", String(args.state ?? "open"));
        params.set("per_page", String(args.limit ?? 20));
        const list = await githubGet<unknown[]>(
          `/repos/${owner}/${rep}/pulls?${params}`,
          token
        );
        return { pulls: list };
      },
    },
    view: {
      args: {
        number: { type: "number" as const, required: true },
        repo: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const num = Number(args.number);
        if (!Number.isInteger(num)) throw new Error("number must be an integer");
        const pr = await githubGet<unknown>(
          `/repos/${owner}/${rep}/pulls/${num}`,
          token
        );
        return pr;
      },
    },
    create: {
      args: {
        repo: { type: "string" as const, required: true },
        title: { type: "string" as const, required: true },
        head: { type: "string" as const, required: true },
        base: { type: "string" as const, default: "main" },
        body: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const body = {
          title: String(args.title),
          head: String(args.head),
          base: String(args.base ?? "main"),
          ...(args.body != null ? { body: String(args.body) } : {}),
        };
        const out = await githubPost<unknown>(
          `/repos/${owner}/${rep}/pulls`,
          body,
          token
        );
        return out;
      },
    },
  };
}
