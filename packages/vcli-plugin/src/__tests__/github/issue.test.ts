import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "vcli";
import { github } from "../../github/index.js";

describe("github plugin: issue commands", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes("/issues/42/comments")) {
          return {
            ok: true,
            json: async () => ({ id: 1, body: "comment" }),
            text: emptyText,
          };
        }
        if (url.includes("/repos/owner/repo/issues/42")) {
          return {
            ok: true,
            json: async () => ({ number: 42, title: "Issue 42", body: "Body" }),
            text: emptyText,
          };
        }
        if (url.includes("/repos/owner/repo/issues?")) {
          return {
            ok: true,
            json: async () => [{ number: 1, title: "Test issue" }],
            text: emptyText,
          };
        }
        if (url === "https://api.github.com/repos/owner/repo/issues") {
          return {
            ok: true,
            json: async () => ({ number: 99, html_url: "https://github.com/owner/repo/issues/99" }),
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

  it("gh issue list --repo owner/repo returns issues", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run("gh issue list --repo owner/repo");
    expect(result.ok).toBe(true);
    expect(result.module).toBe("gh");
    expect(result.command).toBe("issue list");
    expect(Array.isArray((result.result as { issues?: unknown[] })?.issues)).toBe(true);
    expect((result.result as { issues: { number: number }[] }).issues[0].number).toBe(1);
  });

  it("gh issue view --number 42 --repo owner/repo returns issue", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run("gh issue view --number 42 --repo owner/repo");
    expect(result.ok).toBe(true);
    expect((result.result as { number: number }).number).toBe(42);
    expect((result.result as { title: string }).title).toBe("Issue 42");
  });

  it("gh issue create --repo owner/repo --title T returns created issue", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run(
      'gh issue create --repo owner/repo --title "New issue"'
    );
    expect(result.ok).toBe(true);
    expect((result.result as { number: number }).number).toBe(99);
  });

  it("gh issue comment --number 42 --repo owner/repo --body hello returns comment", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run(
      'gh issue comment --number 42 --repo owner/repo --body "hello"'
    );
    expect(result.ok).toBe(true);
    expect((result.result as { body: string }).body).toBe("comment");
  });
});
