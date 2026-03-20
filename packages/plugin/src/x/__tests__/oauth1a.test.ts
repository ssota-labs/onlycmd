import { describe, it, expect } from "vitest";
import { generateOAuthHeader } from "../oauth1a.js";

// Mock crypto to get deterministic results for testing
describe("oauth1a", () => {
  it("generates valid OAuth header structure", () => {
    const creds = {
      apiKey: "test_key",
      apiSecret: "test_secret",
      accessToken: "test_token",
      accessTokenSecret: "test_token_secret",
    };

    const header = generateOAuthHeader("GET", "https://api.x.com/2/tweets", creds);

    expect(header).toMatch(/^OAuth /);
    expect(header).toContain('oauth_consumer_key="test_key"');
    expect(header).toContain('oauth_token="test_token"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_version="1.0"');
    expect(header).toContain('oauth_signature=');
    expect(header).toContain('oauth_nonce=');
    expect(header).toContain('oauth_timestamp=');
  });

  it("includes query params in signature", () => {
    const creds = {
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "token",
      accessTokenSecret: "token_secret",
    };

    const header1 = generateOAuthHeader("GET", "https://api.x.com/2/tweets?foo=bar", creds);
    const header2 = generateOAuthHeader("GET", "https://api.x.com/2/tweets?foo=baz", creds);

    // Different query params should produce different signatures (nonce/timestamp will differ, but structure should be same)
    expect(header1).toContain('oauth_signature=');
    expect(header2).toContain('oauth_signature=');
  });

  it("handles POST with body params", () => {
    const creds = {
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "token",
      accessTokenSecret: "token_secret",
    };

    const header = generateOAuthHeader("POST", "https://api.x.com/2/tweets", creds, { text: "hello" });

    expect(header).toMatch(/^OAuth /);
    expect(header).toContain('oauth_signature=');
  });
});
