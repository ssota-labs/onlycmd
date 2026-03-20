import { describe, it, expect } from "vitest";
import { parseTweetId, stripAt } from "../utils.js";

describe("utils", () => {
  describe("parseTweetId", () => {
    it("extracts ID from twitter.com URL", () => {
      expect(parseTweetId("https://twitter.com/user/status/1234567890")).toBe("1234567890");
    });

    it("extracts ID from x.com URL", () => {
      expect(parseTweetId("https://x.com/user/status/9876543210")).toBe("9876543210");
    });

    it("extracts ID from URL without protocol", () => {
      expect(parseTweetId("twitter.com/user/status/111222333")).toBe("111222333");
    });

    it("returns numeric string as-is", () => {
      expect(parseTweetId("1234567890")).toBe("1234567890");
    });

    it("trims whitespace", () => {
      expect(parseTweetId("  1234567890  ")).toBe("1234567890");
    });

    it("throws on invalid input", () => {
      expect(() => parseTweetId("invalid")).toThrow("Invalid tweet ID or URL");
      expect(() => parseTweetId("not-a-number")).toThrow("Invalid tweet ID or URL");
    });
  });

  describe("stripAt", () => {
    it("removes leading @", () => {
      expect(stripAt("@username")).toBe("username");
    });

    it("removes multiple leading @", () => {
      expect(stripAt("@@@username")).toBe("username");
    });

    it("leaves username without @ unchanged", () => {
      expect(stripAt("username")).toBe("username");
    });

    it("handles empty string", () => {
      expect(stripAt("")).toBe("");
    });
  });
});
