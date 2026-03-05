import type { RunContext } from "vcli";
import { githubGet, githubPost, getToken } from "../api.js";

export function createIssueHandlers(config: { token?: string }) {
  return {
    list: {
      args: {
        repo: { type: "string" as const, required: true },
        state: { type: "string" as const, default: "open" },
        limit: { type: "number" as const, default: 20 },
        labels: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const params = new URLSearchParams();
        params.set("state", String(args.state ?? "open"));
        params.set("per_page", String(args.limit ?? 20));
        if (args.labels) params.set("labels", String(args.labels));
        const list = await githubGet<unknown[]>(
          `/repos/${owner}/${rep}/issues?${params}`,
          token
        );
        return { issues: list };
      },
    },
    create: {
      args: {
        repo: { type: "string" as const, required: true },
        title: { type: "string" as const, required: true },
        body: { type: "string" as const, required: false },
        labels: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const body: Record<string, unknown> = {
          title: String(args.title),
          ...(args.body != null ? { body: String(args.body) } : {}),
          ...(args.labels != null
            ? { labels: String(args.labels).split(",").map((s) => s.trim()) }
            : {}),
        };
        const out = await githubPost<unknown>(
          `/repos/${owner}/${rep}/issues`,
          body,
          token
        );
        return out;
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
        const issue = await githubGet<unknown>(
          `/repos/${owner}/${rep}/issues/${num}`,
          token
        );
        return issue;
      },
    },
    comment: {
      args: {
        number: { type: "number" as const, required: true },
        repo: { type: "string" as const, required: true },
        body: { type: "string" as const, required: true },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const num = Number(args.number);
        if (!Number.isInteger(num)) throw new Error("number must be an integer");
        const out = await githubPost<unknown>(
          `/repos/${owner}/${rep}/issues/${num}/comments`,
          { body: String(args.body) },
          token
        );
        return out;
      },
    },
  };
}
