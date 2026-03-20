import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

const BASE = "https://api.x.com/2";

/** Use api adapter for unit tests: fetch stub applies to api.ts; XDK uses node-fetch. */
const apiCfg = () => ({ adapter: "api" as const });

function createMockHandler() {
  return vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes(`${BASE}/spaces/search`) || url.includes("/2/spaces/search")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "1SLjjRYNejbKM",
                  state: "live",
                  title: "AI Discussion",
                  creator_id: "2244994945",
                  participant_count: 10,
                },
              ],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes(`${BASE}/spaces/1SLjjRYNejbKM/tweets`) || url.includes("/2/spaces/1SLjjRYNejbKM/tweets")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { id: "t1", text: "Space tweet 1", author_id: "2244994945" },
                { id: "t2", text: "Space tweet 2", author_id: "2244994945" },
              ],
              meta: { result_count: 2 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (
          (url.includes(`${BASE}/spaces/1SLjjRYNejbKM`) || url.includes("/2/spaces/1SLjjRYNejbKM")) &&
          !url.includes("search")
        ) {
          return {
            ok: true,
            json: async () => ({
              data: {
                id: "1SLjjRYNejbKM",
                state: "live",
                title: "AI Discussion",
                creator_id: "2244994945",
                participant_count: 10,
              },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes(`${BASE}/spaces/by/creator_ids`) || url.includes("/2/spaces/by/creator_ids")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "1SLjjRYNejbKM",
                  state: "scheduled",
                  title: "Upcoming Space",
                  creator_id: "123",
                  scheduled_start: "2025-03-21T12:00:00.000Z",
                },
              ],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes("/users/by/username/elonspace") || url.includes("/2/users/by/username/elonspace")) {
          return {
            ok: true,
            json: async () => ({ data: { id: "123", username: "elonspace", name: "Elon" } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        return {
          ok: false,
          status: 404,
          text: async () => "Not found",
          headers: new Headers(),
        };
      });
}

describe("x plugin: spaces commands", () => {
  beforeEach(() => {
    const handler = createMockHandler();
    vi.stubGlobal("fetch", handler);
  });

  describe("success cases", () => {
    it("x spaces search --query AI returns spaces", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run('x spaces search --query "AI"');
      expect(result.ok).toBe(true);
      expect(result.command).toBe("spaces search");
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data![0]).toMatchObject({ id: "1SLjjRYNejbKM", title: "AI Discussion" });
    });

    it("x spaces search with --state live filters", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run('x spaces search --query "crypto" --state live');
      expect(result.ok).toBe(true);
    });

    it("x spaces get --id returns space", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x spaces get --id 1SLjjRYNejbKM");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("spaces get");
      const data = (result.result as { data?: { id?: string } })?.data;
      expect(data?.id).toBe("1SLjjRYNejbKM");
      expect(data).toMatchObject({ title: "AI Discussion", state: "live" });
    });

    it("x spaces by_creator --user_ids with numeric IDs", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x spaces by_creator --user_ids 123,456");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("spaces by_creator");
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
    });

    it("x spaces by_creator --user_ids with username resolves to ID", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x spaces by_creator --user_ids @elonspace");
      expect(result.ok).toBe(true);
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data![0]).toMatchObject({ creator_id: "123" });
    });

    it("x spaces posts --id returns tweets", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x spaces posts --id 1SLjjRYNejbKM");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("spaces posts");
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBe(2);
      expect(data![0]).toMatchObject({ id: "t1", text: "Space tweet 1" });
    });
  });

  describe("failure cases", () => {
    it("x spaces search without Bearer returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run('x spaces search --query "AI"');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x spaces get without Bearer returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x spaces get --id 1SLjjRYNejbKM");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x spaces search with empty query returns clear error", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run('x spaces search --query "  "');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/empty|query/i);
    });

    it("x spaces get with invalid id returns clear error", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x spaces get --id invalid!!id");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid|space id/i);
    });

    it("x spaces posts without Bearer returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x spaces posts --id 1SLjjRYNejbKM");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });
  });
});
