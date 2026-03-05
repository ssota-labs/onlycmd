import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "vcli";
import { github } from "../../github/index.js";

describe("github plugin: repo commands", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes("/repos/owner/repo") && !url.includes("/issues") && !url.includes("/pulls")) {
          return {
            ok: true,
            json: async () => ({
              full_name: "owner/repo",
              description: "A repo",
              default_branch: "main",
            }),
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

  it("gh repo view --repo owner/repo returns repo", async () => {
    const runtime = createRuntime().use(github());
    const result = await runtime.run("gh repo view --repo owner/repo");
    expect(result.ok).toBe(true);
    expect(result.command).toBe("repo view");
    expect((result.result as { full_name: string }).full_name).toBe("owner/repo");
  });
});
