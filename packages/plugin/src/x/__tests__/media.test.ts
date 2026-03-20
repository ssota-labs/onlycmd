import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

const UPLOAD_BASE = "https://upload.twitter.com/1.1";
const API_BASE = "https://api.x.com/2";

/** Use api adapter for unit tests: fetch stub applies; media upload uses api layer. */
const apiCfg = () => ({ adapter: "api" as const });

describe("x plugin: media commands", () => {
  const oauthConfig = {
    token: "test_token",
    apiKey: "test_key",
    apiSecret: "test_secret",
    accessToken: "test_access",
    accessTokenSecret: "test_access_secret",
    ...apiCfg(),
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe("success cases", () => {
    beforeEach(() => {
      const handler = vi.fn(async (url: string) => {
          const emptyText = async (): Promise<string> => "";
          // Media fetch (from URL)
          if (url === "https://example.com/image.jpg") {
            return {
              ok: true,
              arrayBuffer: async () => new ArrayBuffer(100),
              headers: new Headers({ "content-type": "image/jpeg" }),
            };
          }
          if (url === "https://example.com/photo.png") {
            return {
              ok: true,
              arrayBuffer: async () => new ArrayBuffer(200),
              headers: new Headers({ "content-type": "image/png" }),
            };
          }
          // Twitter upload API
          if (url === `${UPLOAD_BASE}/media/upload.json`) {
            return {
              ok: true,
              json: async () => ({ media_id_string: "media123", media_id: 123 }),
              text: emptyText,
              headers: new Headers(),
            };
          }
          return { ok: false, status: 404, text: async () => "Not found", headers: new Headers() };
        });
      vi.stubGlobal("fetch", handler);
    });

    it("x media upload --url returns media_id_string", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x media upload --url https://example.com/image.jpg");
      expect(result.ok).toBe(true);
      expect(result.command).toBe("media upload");
      expect((result.result as { media_id_string?: string })?.media_id_string).toBe("media123");
    });

    it("x media upload with --filename option", async () => {
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run(
        'x media upload --url https://example.com/image.jpg --filename "custom.jpg"'
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("failure cases", () => {
    it("x media upload without OAuth returns requires_auth for client OAuth UI", async () => {
      const handler = vi.fn();
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x({ token: "bearer_only" }));
      const result = await runtime.run("x media upload --url https://example.com/image.jpg");
      expect(result.ok).toBe(true);
      const r = result.result as { requires_auth?: { provider?: string; action?: string } };
      expect(r?.requires_auth?.provider).toBe("twitter");
      expect(r?.requires_auth?.action).toBe("login");
    });

    it("x media upload with fetch 404 returns clear error", async () => {
      const handler = vi.fn(async (url: string) => {
          if (url === "https://example.com/missing.jpg") {
            return {
              ok: false,
              status: 404,
              statusText: "Not Found",
            };
          }
          return { ok: false, status: 404 };
        });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x media upload --url https://example.com/missing.jpg");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/fetch|404|not found/i);
    });

    it("x media upload with HTML content returns unsupported type error", async () => {
      const handler = vi.fn(async (url: string) => {
          if (url === "https://example.com/page.html") {
            return {
              ok: true,
              arrayBuffer: async () => new TextEncoder().encode("<html></html>").buffer,
              headers: new Headers({ "content-type": "text/html" }),
            };
          }
          return { ok: false };
        });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x media upload --url https://example.com/page.html");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/unsupported|content-type|image|video|media type|html/i);
    });

    it("x media upload with empty content returns error", async () => {
      const handler = vi.fn(async (url: string) => {
          if (url === "https://example.com/empty.jpg") {
            return {
              ok: true,
              arrayBuffer: async () => new ArrayBuffer(0),
              headers: new Headers({ "content-type": "image/jpeg" }),
            };
          }
          return { ok: false };
        });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x media upload --url https://example.com/empty.jpg");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/empty|zero|size|length/i);
    });

    it("x media upload with invalid URL format returns clear error", async () => {
      const handler = vi.fn();
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run('x media upload --url "not-a-valid-url"');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/invalid|url|valid/i);
    });

    it("x media upload when Twitter API returns error", async () => {
      const handler = vi.fn(async (url: string) => {
          if (url === "https://example.com/bad.jpg") {
            return {
              ok: true,
              arrayBuffer: async () => new ArrayBuffer(100),
              headers: new Headers({ "content-type": "image/jpeg" }),
            };
          }
          if (url === `${UPLOAD_BASE}/media/upload.json`) {
            return {
              ok: false,
              status: 400,
              json: async () => ({
                errors: [{ code: 44, message: "media type unrecognized" }],
              }),
              text: async () => "",
              headers: new Headers(),
            };
          }
          return { ok: false };
        });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x(oauthConfig));
      const result = await runtime.run("x media upload --url https://example.com/bad.jpg");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/API|400|error|media/i);
    });
  });
});
