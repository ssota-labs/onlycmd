import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

const BASE = "https://api.x.com/2";

/** Use api adapter for unit tests: fetch stub applies to api.ts; XDK uses node-fetch. */
const apiCfg = () => ({ adapter: "api" as const });

// Mock handler for api adapter (uses global fetch)
function createMockHandler() {
  return vi.fn(async (url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => {
    const emptyText = async (): Promise<string> => "";
    if (url.includes("/users/uid1/tweets") || url.includes("/users/uid1/tweets?")) {
      return {
        ok: true,
        json: async () => ({
          data: [{ id: "tw1", text: "First tweet" }],
          meta: { next_token: "next1" },
        }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if (url.includes(`${BASE}/tweets/search`) || url.includes("/2/tweets/search/recent")) {
      return {
        ok: true,
        json: async () => ({ data: [{ id: "s1", text: "search result" }], meta: {} }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if (
      url.includes(`${BASE}/tweets/1234567890`) ||
      (url.startsWith(`${BASE}/tweets/`) && url.includes("tweet.fields") && !url.includes("search")) ||
      url.includes("/2/tweets/1234567890")
    ) {
      return {
        ok: true,
        json: async () => ({ data: { id: "1234567890", text: "Single tweet" } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if ((url === `${BASE}/tweets` || url === "https://api.x.com/2/tweets") && init?.method === "POST") {
      const body = init.body ? JSON.parse(init.body as string) : {};
      return {
        ok: true,
        json: async () => ({
          data: { id: "new123", text: body.text ?? "" },
        }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if (url.includes(`${BASE}/tweets/`) && init?.method === "DELETE") {
      return {
        ok: true,
        json: async () => ({ data: { deleted: true } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if (url === `${BASE}/users/me` || url === "https://api.x.com/2/users/me") {
      return {
        ok: true,
        json: async () => ({ data: { id: "me123", username: "me" } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    return {
      ok: false,
      status: 404,
      text: async (): Promise<string> => "Not found",
      headers: new Headers(),
    };
  });
}

describe("x plugin: tweet commands", () => {
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
    it("x tweet get --id_or_url 1234567890 returns tweet", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x tweet get --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("tweet get");
      const data = (result.result as { data?: { id?: string; text?: string } })?.data;
      expect(data?.id).toBe("1234567890");
      expect(data?.text).toBe("Single tweet");
    });

    it("x tweet get with URL returns tweet", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run(
        "x tweet get --id_or_url https://x.com/user/status/1234567890"
      );
      expect(result.ok).toBe(true);
      expect((result.result as { data?: { id?: string } })?.data?.id).toBe("1234567890");
    });

    it("x tweet post --text hello returns created tweet", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x tweet post --text "hello"');
      expect(result.ok).toBe(true);
      expect(result.command).toBe("tweet post");
      expect((result.result as { data?: { id: string } })?.data?.id).toBe("new123");
      expect((result.result as { data?: { text: string } })?.data?.text).toBe("hello");
    });

    it("x tweet post with media_ids includes media", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x tweet post --text "with media" --media_ids "m1,m2"');
      expect(result.ok).toBe(true);
    });

    it("x tweet search returns results", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run('x tweet search --query "hello" --max 10');
      expect(result.ok).toBe(true);
      expect(result.command).toBe("tweet search");
      expect(Array.isArray((result.result as { data?: unknown[] })?.data)).toBe(true);
    });

    it("x tweet delete succeeds", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x tweet delete --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("tweet delete");
    });
  });

  describe("failure cases", () => {
    it("x tweet get without Bearer token returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x tweet get --id_or_url 1234567890");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x tweet post without OAuth returns requires_auth for client OAuth UI", async () => {
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run('x tweet post --text "hello"');
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string; action?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
      expect(r?.requires_auth?.action).toBe("login");
    });

    it("x tweet delete without OAuth returns requires_auth for client OAuth UI", async () => {
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run("x tweet delete --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string; action?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
      expect(r?.requires_auth?.action).toBe("login");
    });

    it("x tweet get with invalid id_or_url returns clear error", async () => {
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x tweet get --id_or_url invalid-id");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid|tweet id|url/i);
    });

    it("x tweet post with empty media_ids returns clear error", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x tweet post --text "test" --media_ids "  ,  , "');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/media_ids|valid|no valid/i);
    });

    it("x tweet search without Bearer returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run('x tweet search --query "test"');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });
  });
});
