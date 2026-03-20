import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";

/** Use api adapter for unit tests: fetch stub applies to api.ts; XDK uses node-fetch. */
const apiCfg = () => ({ adapter: "api" as const });

function createMockHandler() {
  return vi.fn(async (url: string) => {
    const emptyText = async (): Promise<string> => "";
    if (url.includes("/users/by/username/elonspace") || url.includes("/2/users/by/username/elonspace")) {
      return {
        ok: true,
        json: async () => ({ data: { id: "123", username: "elonspace", name: "Elon" } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if ((url.includes("/users/456") || url.includes("/2/users/456")) && !url.includes("/tweets")) {
      return {
        ok: true,
        json: async () => ({ data: { id: "456", username: "dev", name: "Dev" } }),
        text: emptyText,
        headers: new Headers(),
      };
    }
    if (url.includes("/users/123/tweets") || url.includes("/2/users/123/tweets")) {
      return {
        ok: true,
        json: async () => ({
          data: [{ id: "t1", text: "Hello" }],
          meta: { result_count: 1 },
        }),
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

describe("x plugin: user commands", () => {
  beforeEach(() => {
    const handler = createMockHandler();
    vi.stubGlobal("fetch", handler);
  });

  it("x user get --username elonspace returns user", async () => {
    const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
    const result = await runtime.run("x user get --username elonspace");
    expect(result.ok).toBe(true);
    expect(result.module).toBe("x");
    expect(result.command).toBe("user get");
    expect((result.result as { data?: { username: string } })?.data?.username).toBe("elonspace");
    expect((result.result as { data?: { id: string } })?.data?.id).toBe("123");
  });

  it("x user timeline --username elonspace returns tweets", async () => {
    const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
    const result = await runtime.run("x user timeline --username elonspace");
    expect(result.ok).toBe(true);
    expect(result.command).toBe("user timeline");
    expect(Array.isArray((result.result as { data?: unknown[] })?.data)).toBe(true);
    expect((result.result as { data: { id: string }[] }).data[0].id).toBe("t1");
  });

  describe("failure cases", () => {
    it("x user get without Bearer token returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x user get --username elonspace");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x user timeline without Bearer token returns clear error", async () => {
      const runtime = createRuntime().use(x());
      const result = await runtime.run("x user timeline --username elonspace");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/bearer|token|required/i);
    });

    it("x user get with non-existent username returns clear error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          const emptyText = async (): Promise<string> => "";
          if (url.includes("/users/by/username/nonexistent")) {
            return {
              ok: false,
              status: 404,
              json: async () => ({ errors: [{ detail: "User not found" }] }),
              text: emptyText,
              headers: new Headers(),
            };
          }
          return { ok: false, status: 404, text: emptyText, headers: new Headers() };
        })
      );
      const handler = vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes("/users/by/username/nonexistent") || url.includes("/2/users/by/username/nonexistent")) {
          return {
            ok: false,
            status: 404,
            json: async () => ({ errors: [{ detail: "User not found" }] }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        return { ok: false, status: 404, text: emptyText, headers: new Headers() };
      });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x user get --username nonexistent");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/404|not found|error/i);
    });

    it("x user timeline when user lookup returns no data returns clear error", async () => {
      const handler = vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes("/users/by/username/unknown") || url.includes("/2/users/by/username/unknown")) {
          return {
            ok: true,
            json: async () => ({ data: null }),
            text: emptyText,
            headers: new Headers(),
          };
        }
        return { ok: false, status: 404, text: emptyText, headers: new Headers() };
      });
      vi.stubGlobal("fetch", handler);
      const runtime = createRuntime().use(x({ token: "test_token", ...apiCfg() }));
      const result = await runtime.run("x user timeline --username unknown");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/user not found|unknown/i);
    });
  });
});
