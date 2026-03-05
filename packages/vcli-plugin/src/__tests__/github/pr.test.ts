import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "vcli";
import { github } from "../../github/index.js";

describe("github plugin: pr commands", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes("/repos/owner/repo/pulls?")) {
          return {
            ok: true,
            json: async () => [{ number: 1, title: "PR one" }],
            text: emptyText,
          };
        }
        if (url.includes("/repos/owner/repo/pulls/5")) {
          return {
            ok: true,
            json: async () => ({ number: 5, title: "PR 5", state: "open" }),
            text: emptyText,
          };
        }
        if (url.includes("/repos/owner/repo/pulls") && !url.includes("?")) {
          return {
            ok: true,
            json: async () => ({ number: 10, title: "New PR", html_url: "..." }),
            text: emptyText,
          };
        }
        return {
          ok: false,
          status: 404,
          text: async (): Promise<string> => "Not found",
        };
      })
    );
  });

  it("gh pr list --repo owner/repo returns pulls", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run("gh pr list --repo owner/repo");
    expect(result.ok).toBe(true);
    expect(result.command).toBe("pr list");
    expect(Array.isArray((result.result as { pulls?: unknown[] })?.pulls)).toBe(true);
  });

  it("gh pr view --number 5 --repo owner/repo returns PR", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run("gh pr view --number 5 --repo owner/repo");
    expect(result.ok).toBe(true);
    expect((result.result as { number: number }).number).toBe(5);
  });

  it("gh pr create --repo owner/repo --title T --head feat returns created PR", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run(
      "gh pr create --repo owner/repo --title T --head feat"
    );
    expect(result.ok).toBe(true);
    expect((result.result as { number: number }).number).toBe(10);
  });
});
