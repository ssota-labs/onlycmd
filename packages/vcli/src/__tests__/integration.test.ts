import { describe, it, expect } from "vitest";
import { createRuntime, defineModule } from "../index.js";

describe("integration: .use() plugin flow", () => {
  it("registers multiple plugins and dispatches by namespace", async () => {
    const github = defineModule({
      name: "gh",
      description: "GitHub",
      setup: () => ({
        name: "gh",
        description: "GitHub",
        commands: {
          issue: {
            list: {
              args: {
                repo: { type: "string", required: true },
                limit: { type: "number", default: 20 },
              },
              handler: (args) => ({
                items: [],
                repo: args.repo,
                limit: args.limit,
              }),
            },
          },
        },
      }),
    });

    const runtime = createRuntime()
      .use(github())
      .use(
        defineModule({
          name: "jira",
          description: "Jira",
          setup: () => ({
            name: "jira",
            description: "Jira",
            commands: {
              issue: {
                list: {
                  args: { project: { type: "string", required: true } },
                  handler: (args) => ({ project: args.project }),
                },
              },
            },
          }),
        })()
      );

    const ghResult = await runtime.run(
      "gh issue list --repo owner/repo --limit 10"
    );
    expect(ghResult.ok).toBe(true);
    expect(ghResult.module).toBe("gh");
    expect(ghResult.command).toBe("issue list");
    expect(ghResult.result).toEqual({
      items: [],
      repo: "owner/repo",
      limit: 10,
    });

    const jiraResult = await runtime.run("jira issue list --project PROJ");
    expect(jiraResult.ok).toBe(true);
    expect(jiraResult.module).toBe("jira");
    expect(jiraResult.result).toEqual({ project: "PROJ" });
  });

  it("passes context.auth to handler", async () => {
    const mod = defineModule({
      name: "auth",
      description: "Auth test",
      setup: () => ({
        name: "auth",
        description: "Auth test",
        commands: {
          who: {
            handler: (_args, ctx) => ctx?.auth?.auth ?? "none",
          },
        },
      }),
    })();
    const runtime = createRuntime().use(mod);
    const result = await runtime.run("auth who", {
      auth: { auth: "token123" },
    });
    expect(result.ok).toBe(true);
    expect(result.result).toBe("token123");
  });
});
