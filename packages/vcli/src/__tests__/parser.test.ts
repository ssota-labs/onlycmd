import { describe, it, expect } from "vitest";
import { parse } from "../parser.js";
import type { ArgDef } from "../types.js";

describe("parse", () => {
  it("returns empty object for empty argsDef", () => {
    expect(parse([], {})).toEqual({});
    expect(parse(["--foo", "bar"], {})).toEqual({});
  });

  it("parses string options", () => {
    const argsDef: Record<string, ArgDef> = {
      repo: { type: "string", required: true },
      state: { type: "string", default: "open" },
    };
    expect(parse(["--repo", "owner/repo"], argsDef)).toEqual({
      repo: "owner/repo",
      state: "open",
    });
  });

  it("parses number options and coerces", () => {
    const argsDef: Record<string, ArgDef> = {
      limit: { type: "number", default: 20 },
    };
    expect(parse(["--limit", "10"], argsDef)).toEqual({ limit: 10 });
    expect(parse([], argsDef)).toEqual({ limit: 20 });
  });

  it("parses boolean options", () => {
    const argsDef: Record<string, ArgDef> = {
      verbose: { type: "boolean", default: false },
    };
    expect(parse(["--verbose"], argsDef)).toEqual({ verbose: true });
    expect(parse([], argsDef)).toEqual({ verbose: false });
  });

  it("applies enum when provided", () => {
    const argsDef: Record<string, ArgDef> = {
      state: { type: "string", enum: ["open", "closed", "all"] },
    };
    expect(parse(["--state", "closed"], argsDef)).toEqual({ state: "closed" });
  });
});
