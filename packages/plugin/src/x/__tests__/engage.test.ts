import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

const BASE = "https://api.x.com/2";

/** Use api adapter for unit tests: fetch stub applies to api.ts; XDK uses node-fetch. */
const apiCfg = () => ({ adapter: "api" as const });

function createMockHandler() {
  return vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const emptyText = async (): Promise<string> => "";
    if ((url === `${BASE}/users/me` || url === "https://api.x.com/2/users/me") && init?.method !== "POST") {
      return {
        ok: true,
        json: async () => ({ data: { id: "me123", username: "me" } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if ((url.includes(`/users/me123/likes`) || url.includes("/2/users/me123/likes")) && init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({ data: { liked: true } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if ((url.includes(`/users/me123/retweets`) || url.includes("/2/users/me123/retweets")) && init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({ data: { retweeted: true } }),
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

describe("x plugin: engage commands", () => {
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
    it("x like --id_or_url 1234567890 succeeds", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x like --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("like");
      expect((result.result as { data?: { liked?: boolean } })?.data?.liked).toBe(true);
    });

    it("x like with URL succeeds", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run(
        "x like --id_or_url https://x.com/user/status/1234567890"
      );
      expect(result.ok).toBe(true);
    });

    it("x retweet --id_or_url 1234567890 succeeds", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x retweet --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("retweet");
      expect((result.result as { data?: { retweeted?: boolean } })?.data?.retweeted).toBe(true);
    });
  });

  describe("failure cases", () => {
    it("x like without OAuth returns requires_auth for client OAuth UI", async () => {
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run("x like --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string; action?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
      expect(r?.requires_auth?.action).toBe("login");
    });

    it("x retweet without OAuth returns requires_auth for client OAuth UI", async () => {
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run("x retweet --id_or_url 1234567890");
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string; action?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
      expect(r?.requires_auth?.action).toBe("login");
    });

    it("x like with invalid id_or_url returns clear error", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x like --id_or_url invalid-id");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid|tweet id|url/i);
    });

    it("x retweet with invalid id_or_url returns clear error", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x retweet --id_or_url not-a-valid-id");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid|tweet id|url/i);
    });
  });
});
