import type { RunContext } from "../../../../core/dist/index.js";
import {
  getToken,
  gitGetRef,
  gitGetCommit,
  gitCreateBlob,
  gitCreateTree,
  gitCreateCommit,
  gitCreateRef,
} from "../api.js";

export function createBranchHandlers(config: { token?: string }) {
  return {
    create: {
      args: {
        repo: { type: "string" as const, required: true },
        name: { type: "string" as const, required: true },
        message: { type: "string" as const, required: true },
        base: { type: "string" as const, default: "main" },
        file: { type: "string" as const, required: false },
        content: { type: "string" as const, required: false },
      },
      handler: async (args: Record<string, unknown>, context?: RunContext) => {
        const token = getToken(config, context?.auth);
        const repo = String(args.repo);
        const [owner, rep] = repo.split("/");
        if (!owner || !rep) throw new Error("repo must be owner/repo");
        const branchName = String(args.name);
        const message = String(args.message);
        const baseBranch = String(args.base ?? "main");
        const filePath = args.file != null ? String(args.file) : "integration.txt";
        const content = args.content != null ? String(args.content) : `integration test run ${Date.now()}\n`;

        const refPath = `heads/${baseBranch}`;
        const refRes = await gitGetRef(owner, rep, refPath, token);
        const parentSha = refRes.object.sha;

        const commitRes = await gitGetCommit(owner, rep, parentSha, token);
        const baseTreeSha = commitRes.tree.sha;

        const blobRes = await gitCreateBlob(owner, rep, content, token);
        const treeRes = await gitCreateTree(
          owner,
          rep,
          baseTreeSha,
          [{ path: filePath, mode: "100644", type: "blob", sha: blobRes.sha }],
          token
        );
        const commitRes2 = await gitCreateCommit(
          owner,
          rep,
          message,
          treeRes.sha,
          parentSha,
          token
        );
        const refRes2 = await gitCreateRef(
          owner,
          rep,
          `refs/heads/${branchName}`,
          commitRes2.sha,
          token
        );

        return {
          ref: refRes2.ref,
          branch: branchName,
          sha: commitRes2.sha,
        };
      },
    },
  };
}
