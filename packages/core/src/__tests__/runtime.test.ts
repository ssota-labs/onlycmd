import { describe, it, expect } from "vitest";
import { createRuntime, defineModule } from "../index.js";
import type { VirtualCLIModule } from "../types.js";

describe("createRuntime", () => {
  it("use() registers a module and run() dispatches to it", async () => {
    const mod: VirtualCLIModule = {
      name: "test",
      description: "Test module",
      commands: {
        echo: {
          args: {
            msg: { type: "string", required: true },
          },
          handler: (args) => ({ echoed: args.msg }),
        },
      },
    };
    const runtime = createRuntime().use(mod);
    const result = await runtime.run("test echo --msg hello");
    expect(result.ok).toBe(true);
    expect(result.module).toBe("test");
    expect(result.command).toBe("echo");
    expect(result.result).toEqual({ echoed: "hello" });
  });

  it("use() accepts factory and invokes with no args", async () => {
    const factory = defineModule({
      name: "f",
      description: "Factory module",
      setup: () => ({
        name: "f",
        description: "Factory module",
        commands: {
          run: {
            handler: () => "ok",
          },
        },
      }),
    });
    const runtime = createRuntime().use(factory());
    const result = await runtime.run("f run");
    expect(result.ok).toBe(true);
    expect(result.result).toBe("ok");
  });

  it("run() returns error for unknown module", async () => {
    const runtime = createRuntime();
    const result = await runtime.run("unknown cmd");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown module");
  });

  it("listSkills() returns JSON by default", () => {
    const mod: VirtualCLIModule = {
      name: "m",
      description: "Desc",
      commands: {},
      skill: { summary: "s", full: "# Full" },
    };
    const runtime = createRuntime().use(mod);
    const out = runtime.listSkills();
    expect(() => JSON.parse(out)).not.toThrow();
    const arr = JSON.parse(out);
    expect(arr).toHaveLength(1);
    expect(arr[0]).toEqual({ name: "m", description: "Desc" });
  });

  it("listSkills({ format: 'xml' }) returns XML", () => {
    const mod: VirtualCLIModule = {
      name: "m",
      description: "Desc",
      commands: {},
    };
    const runtime = createRuntime().use(mod);
    const out = runtime.listSkills({ format: "xml" });
    expect(out).toContain("<available_skills>");
    expect(out).toContain('name="m"');
    expect(out).toContain("</available_skills>");
  });

  it("getFullSkill() returns full skill or null", () => {
    const mod: VirtualCLIModule = {
      name: "m",
      description: "Desc",
      commands: {},
      skill: { summary: "s", full: "# Full markdown" },
    };
    const runtime = createRuntime().use(mod);
    expect(runtime.getFullSkill("m")).toBe("# Full markdown");
    expect(runtime.getFullSkill("missing")).toBe(null);
  });

  it("run() returns stream when handler is AsyncGenerator", async () => {
    const mod: VirtualCLIModule = {
      name: "stream",
      description: "Streaming module",
      commands: {
        tick: {
          handler: async function* () {
            yield { step: 1 };
            yield { step: 2 };
            return { done: true };
          },
        },
      },
    };
    const runtime = createRuntime().use(mod);
    const runResult = await runtime.run("stream tick");
    expect(runResult.ok).toBe(true);
    expect(runResult.module).toBe("stream");
    expect(runResult.command).toBe("tick");
    expect(runResult.stream).toBeDefined();
    expect(runResult.result).toBeUndefined();
  });

  it("stream from run() yields intermediate values and final return", async () => {
    const mod: VirtualCLIModule = {
      name: "stream",
      description: "Streaming module",
      commands: {
        tick: {
          handler: async function* () {
            yield { step: 1 };
            yield { step: 2 };
            return { done: true };
          },
        },
      },
    };
    const runtime = createRuntime().use(mod);
    const runResult = await runtime.run("stream tick");
    expect(runResult.ok).toBe(true);
    expect(runResult.stream).toBeDefined();

    const yielded: unknown[] = [];
    for await (const value of runResult.stream!) {
      yielded.push(value);
    }
    expect(yielded).toEqual([{ step: 1 }, { step: 2 }]);
  });

  it("stream return value is available after exhausting generator", async () => {
    const mod: VirtualCLIModule = {
      name: "stream",
      description: "Streaming module",
      commands: {
        tick: {
          handler: async function* () {
            yield { step: 1 };
            return { done: true };
          },
        },
      },
    };
    const runtime = createRuntime().use(mod);
    const runResult = await runtime.run("stream tick");
    const stream = runResult.stream!;
    let result = await stream.next();
    const values: unknown[] = [];
    while (!result.done) {
      values.push(result.value);
      result = await stream.next();
    }
    expect(values).toEqual([{ step: 1 }]);
    expect(result.value).toEqual({ done: true });
  });
});
