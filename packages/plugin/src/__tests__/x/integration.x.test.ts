import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";
import { createRuntime } from "../../../../core/dist/index.js";
import { x } from "../../x/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../../../.env.local") });

/**
 * X plugin integration tests.
 *
 * Required in .env.local (onlycmd repo root or packages/plugin):
 *   X_BEARER_TOKEN=...   OAuth 2.0 Bearer token (App-only for read-only; user access token for tweet create)
 *
 * Optional:
 *   X_TEST_USERNAME=elonmusk   username for user/timeline tests
 *   X_INTEGRATION_WRITE=1      set to run "tweet create" test (posts once)
 *   X_ADAPTER=api              use api adapter instead of default xdk (for comparing adapters)
 */
const token = process.env.X_BEARER_TOKEN;
const testUsername = process.env.X_TEST_USERNAME ?? "elonmusk";
const allowWrite = process.env.X_INTEGRATION_WRITE === "1";
const useApiAdapter = process.env.X_ADAPTER === "api";

describe.skipIf(!token)("x plugin: integration", () => {
  const runtime = createRuntime().use(
    x({ token: token!, ...(useApiAdapter && { adapter: "api" }) })
  );

  it("x user get --username (read-only)", async () => {
    const result = await runtime.run(`x user get --username ${testUsername}`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("user get");
    const r = result.result as { data?: { id?: string; username?: string } };
    expect(r?.data?.username).toBeDefined();
    expect(r?.data?.id).toBeDefined();
  }, 15_000);

  it.skip("x user timeline --username (read-only)", async () => {
    // User tweets endpoint often requires Pro/Basic API tier; remove skip if your tier supports it
    const result = await runtime.run(`x user timeline --username ${testUsername} --max 5`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("user timeline");
    const r = result.result as { data?: unknown[] };
    expect(Array.isArray(r?.data)).toBe(true);
  }, 15_000);

  it("x tweet get --id_or_url (read-only)", async () => {
    const userResult = await runtime.run(`x user get --username ${testUsername}`);
    expect(userResult.ok).toBe(true);
    const user = userResult.result as { data?: { id: string } };
    const userId = user?.data?.id;
    expect(userId).toBeDefined();

    const timelineResult = await runtime.run(`x user timeline --username ${testUsername} --max 1`);
    if (!timelineResult.ok) {
      return;
    }
    const timeline = timelineResult.result as { data?: { id: string }[] };
    const tweetId = timeline?.data?.[0]?.id;
    if (!tweetId) {
      return;
    }
    const result = await runtime.run(`x tweet get --id_or_url ${tweetId}`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("tweet get");
    const r = result.result as { data?: { id?: string } };
    expect(r?.data?.id).toBeDefined();
  }, 15_000);

  it.skipIf(!allowWrite)("x tweet post (write, only if X_INTEGRATION_WRITE=1)", async () => {
    const text = `onlycmd x plugin integration test ${Date.now()}`;
    const result = await runtime.run(`x tweet post --text "${text}"`);
    expect(result.ok).toBe(true);
    expect(result.command).toBe("tweet post");
    const r = result.result as { data?: { id?: string } };
    expect(r?.data?.id).toBeDefined();
  }, 15_000);
});
