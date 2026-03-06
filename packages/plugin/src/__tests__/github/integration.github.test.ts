import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, beforeAll } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { github } from "../../github/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../../../.env.local") });

const token = process.env.GITHUB_TOKEN_TEST;
const repo = process.env.INTEGRATION_TEST_REPO;

function uniqueId(): string {
  return `integration-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

describe.skipIf(!token || !repo)("github plugin: integration (persistent repo)", () => {
  const runtime = createRuntime().use(github({ token: token! }));
  const testRunId = uniqueId();
  let createdIssueNumber: number;
  let createdPrNumber: number;
  let createdBranchName: string;

  beforeAll(() => {
    createdBranchName = `integration-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, 30_000);

  it("gh repo view --repo", async () => {
    const result = await runtime.run(`gh repo view --repo ${repo}`);
    expect(result.ok).toBe(true);
    expect(result.module).toBe("gh");
    expect(result.command).toBe("repo view");
    const r = result.result as { full_name?: string };
    expect(r).toBeDefined();
    expect(r.full_name).toBe(repo);
  }, 15_000);

  it("gh issue list --repo (read-only)", async () => {
    const result = await runtime.run(`gh issue list --repo ${repo} --limit 5`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("issue list");
    const r = result.result as { issues?: unknown[] };
    expect(Array.isArray(r?.issues)).toBe(true);
  }, 15_000);

  it("gh pr list --repo (read-only)", async () => {
    const result = await runtime.run(`gh pr list --repo ${repo} --limit 5`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("pr list");
    const r = result.result as { pulls?: unknown[] };
    expect(Array.isArray(r?.pulls)).toBe(true);
  }, 15_000);

  it("gh issue create --repo (write)", async () => {
    const title = `[${testRunId}] integration test issue`;
    const result = await runtime.run(
      `gh issue create --repo ${repo} --title "${title}" --body "integration test"`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("issue create");
    const r = result.result as { number?: number };
    expect(typeof r?.number).toBe("number");
    createdIssueNumber = r!.number!;
  }, 15_000);

  it("gh issue comment --repo (write)", async () => {
    const result = await runtime.run(
      `gh issue comment --number ${createdIssueNumber} --repo ${repo} --body "integration test comment"`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("issue comment");
  }, 15_000);

  it("gh issue close --repo (write)", async () => {
    const result = await runtime.run(
      `gh issue close --number ${createdIssueNumber} --repo ${repo}`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("issue close");
    const r = result.result as { state?: string };
    expect(r?.state).toBe("closed");
  }, 15_000);

  it("gh issue view --repo (verify closed)", async () => {
    const result = await runtime.run(
      `gh issue view --number ${createdIssueNumber} --repo ${repo}`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("issue view");
    const r = result.result as { state?: string };
    expect(r?.state).toBe("closed");
  }, 15_000);

  it("gh branch create --repo (write, one commit)", async () => {
    const result = await runtime.run(
      `gh branch create --repo ${repo} --name ${createdBranchName} --message "integration test commit"`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("branch create");
    const r = result.result as { ref?: string; branch?: string; sha?: string };
    expect(r?.branch).toBe(createdBranchName);
    expect(r?.sha).toBeDefined();
  }, 15_000);

  it("gh pr create --repo (write)", async () => {
    const title = `[${testRunId}] integration test PR`;
    const result = await runtime.run(
      `gh pr create --repo ${repo} --title "${title}" --head ${createdBranchName} --base main --body "integration test"`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("pr create");
    const r = result.result as { number?: number };
    expect(typeof r?.number).toBe("number");
    createdPrNumber = r!.number!;
  }, 15_000);

  it("gh pr merge --repo (write)", async () => {
    const result = await runtime.run(
      `gh pr merge --number ${createdPrNumber} --repo ${repo}`
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("pr merge");
    const r = result.result as { merged?: boolean };
    expect(r?.merged).toBe(true);
  }, 15_000);
});
