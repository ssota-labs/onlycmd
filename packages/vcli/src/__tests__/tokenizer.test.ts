import { describe, it, expect } from "vitest";
import { tokenize } from "../tokenizer.js";

describe("tokenize", () => {
  it("returns empty array for empty or whitespace string", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize("\t\n")).toEqual([]);
  });

  it("splits on whitespace", () => {
    expect(tokenize("a b c")).toEqual(["a", "b", "c"]);
    expect(tokenize("gh issue list")).toEqual(["gh", "issue", "list"]);
  });

  it("preserves quoted strings as single tokens", () => {
    expect(tokenize('a "b c" d')).toEqual(["a", "b c", "d"]);
    expect(tokenize("a 'b c' d")).toEqual(["a", "b c", "d"]);
  });

  it("handles backslash escape inside quotes", () => {
    expect(tokenize('"a\\"b"')).toEqual(['a"b']);
    expect(tokenize("'a\\'b'")).toEqual(["a'b"]);
  });

  it("handles backslash escape outside quotes", () => {
    expect(tokenize("a\\ b")).toEqual(["a b"]);
  });

  it("trims leading and trailing whitespace", () => {
    expect(tokenize("  gh issue list  ")).toEqual(["gh", "issue", "list"]);
  });

  it("handles real-world CLI command", () => {
    expect(
      tokenize('gh issue list --repo owner/repo --state open --limit 20')
    ).toEqual([
      "gh",
      "issue",
      "list",
      "--repo",
      "owner/repo",
      "--state",
      "open",
      "--limit",
      "20",
    ]);
  });
});
