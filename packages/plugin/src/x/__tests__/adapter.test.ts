import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../index.js";
import { createApiAdapter } from "../adapter.js";
import { createXdkAdapter } from "../xdkAdapter.js";

const BASE = "https://api.x.com/2";

describe("x plugin: adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const emptyText = async (): Promise<string> => "";
        if (url.includes(`${BASE}/users/by/username/`)) {
          return {
            ok: true,
            json: async () => ({ data: { id: "123", username: "test", name: "Test" } }),
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
      })
    );
  });

  it("createApiAdapter returns valid adapter", async () => {
    const adapter = createApiAdapter();
    expect(adapter.getCredentials).toBeDefined();
    expect(adapter.requiresAuthResponse).toBeDefined();
    expect(adapter.getUser).toBeDefined();
    const creds = adapter.getCredentials({ token: "t" }, undefined);
    expect(creds.bearer).toBe("t");
  });

  it("createXdkAdapter returns valid adapter", async () => {
    const adapter = createXdkAdapter();
    expect(adapter.getCredentials).toBeDefined();
    expect(adapter.getUser).toBeDefined();
  });

  it("x with adapter api uses api backend", async () => {
    const runtime = createRuntime().use(x({ token: "test_token", adapter: "api" }));
    const result = await runtime.run("x user get --username test");
    expect(result.ok).toBe(true);
    expect(result.command).toBe("user get");
  });

  it.skip("x with default adapter (xdk) works", async () => {
    // XDK uses node-fetch; global fetch stub doesn't apply. XDK path exercised by
    // integration tests with real credentials.
    const runtime = createRuntime().use(x({ token: "test_token" }));
    const result = await runtime.run("x user get --username test");
    expect(result.ok).toBe(true);
  });
});
