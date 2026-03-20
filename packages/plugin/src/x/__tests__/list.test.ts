import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

const BASE = "https://api.x.com/2";

/** Use api adapter for unit tests: fetch stub applies to api.ts; XDK uses node-fetch. */
const apiCfg = () => ({ adapter: "api" as const });

function createMockHandler() {
  return vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        const emptyText = async (): Promise<string> => "";

        if (url.includes("/users/by/username/elonspace") || url.includes("/2/users/by/username/elonspace")) {
          return {
            ok: true,
            json: async () => ({ data: { id: "123", username: "elonspace", name: "Elon" } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if ((url === `${BASE}/users/me` || url === "https://api.x.com/2/users/me") && init?.method !== "POST") {
          return {
            ok: true,
            json: async () => ({ data: { id: "me123", username: "me" } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (
          (url.includes(`${BASE}/lists/1234567890`) || url.includes("/2/lists/1234567890")) &&
          !url.includes("/members") &&
          !url.includes("/tweets")
        ) {
          return {
            ok: true,
            json: async () => ({
              data: { id: "1234567890", name: "Tech News", description: "My list", member_count: 5 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes(`${BASE}/lists/1234567890/tweets`) || url.includes("/2/lists/1234567890/tweets")) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: "t1", text: "List tweet" }],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes(`${BASE}/users/123/owned_lists`) || url.includes("/2/users/123/owned_lists")) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: "1234567890", name: "Tech News", owner_id: "123" }],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (
          (url.includes(`${BASE}/lists/1234567890/members`) || url.includes("/2/lists/1234567890/members")) &&
          init?.method !== "POST" &&
          init?.method !== "DELETE"
        ) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: "u1", username: "user1", name: "User One" }],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if ((url === `${BASE}/lists` || url === "https://api.x.com/2/lists") && init?.method === "POST") {
          const body = init.body ? JSON.parse(init.body as string) : {};
          return {
            ok: true,
            json: async () => ({ data: { id: "new999", name: body.name ?? "New List" } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes(`${BASE}/lists/1234567890/members`) && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ data: { is_member: true } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (
          (url.includes(`${BASE}/lists/1234567890/members/`) || url.includes("/2/lists/1234567890/members/")) &&
          init?.method === "DELETE"
        ) {
          return {
            ok: true,
            json: async () => ({ data: { is_member: false } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes("/pinned_lists") && init?.method === "GET") {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: "1234567890", name: "Pinned List" }],
              meta: { result_count: 1 },
            }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes("/pinned_lists") && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ data: { pinned: true } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes("/pinned_lists/") && init?.method === "DELETE") {
          return {
            ok: true,
            json: async () => ({ data: { pinned: false } }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        if (url.includes("/list_memberships")) {
          return {
            ok: true,
            json: async () => ({
              data: [{ id: "1234567890", name: "My List" }],
              meta: { result_count: 1 },
            }),
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

describe("x plugin: list commands", () => {
  const oauthConfig = {
    token: "test_token",
    apiKey: "test_key",
    apiSecret: "test_secret",
    accessToken: "test_access",
    accessTokenSecret: "test_access_secret",
    ...apiCfg(),
  };

  beforeEach(() => {
    const handler = createMockHandler();
    vi.stubGlobal("fetch", handler);
  });

  describe("success cases", () => {
    it("x list get --list_id returns list", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x list get --list_id 1234567890");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("list get");
      const data = (result.result as { data?: { id?: string } })?.data;
      expect(data?.id).toBe("1234567890");
      expect(data).toMatchObject({ name: "Tech News" });
    });

    it("x list owned --username returns lists", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x list owned --username elonspace");
      expect(result.ok).toBe(true);
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data![0]).toMatchObject({ name: "Tech News" });
    });

    it("x list tweets --list_id returns tweets", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x list tweets --list_id 1234567890");
      expect(result.ok).toBe(true);
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data![0]).toMatchObject({ id: "t1", text: "List tweet" });
    });

    it("x list members --list_id returns members", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x list members --list_id 1234567890");
      expect(result.ok).toBe(true);
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
    });

    it("x list create --name creates list", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x list create --name "My List"');
      expect(result.ok).toBe(true);
      expect(result.command).toBe("list create");
      const data = (result.result as { data?: { id?: string } })?.data;
      expect(data?.id).toBe("new999");
    });

    it("x list add_member adds member", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x list add_member --list_id 1234567890 --user_id @elonspace");
      expect(result.ok).toBe(true);
    });

    it("x list pinned returns pinned lists", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x list pinned");
      expect(result.ok).toBe(true);
      const data = (result.result as { data?: unknown[] })?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data![0]).toMatchObject({ name: "Pinned List" });
    });
  });

  describe("failure cases", () => {
    it("x list get without Bearer returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x list get --list_id 1234567890");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x list create without OAuth returns requires_auth", async () => {
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run('x list create --name "Test"');
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
    });

    it("x list create with empty name returns error", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x list create --name "  "');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/empty|name/i);
    });
  });
});
