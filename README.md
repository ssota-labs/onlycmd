# vcli

**The CLI + Skill pattern behind Claude Code and OpenClaw — now in any JavaScript runtime.**

A lightweight runtime that wraps JavaScript functions as CLI commands for AI agents.

## Background

The most powerful AI agents today — Claude Code, OpenClaw — share a common pattern: a single `execute/bash` tool that runs CLI commands, combined with **skill files** (markdown) that teach the agent how to use each CLI.

```
Agent reads SKILL.md → learns "gh issue list --repo ..." → calls execute("gh issue list --repo x/y")
```

This pattern is remarkably token-efficient. Where MCP injects dozens of tool schemas (tens of thousands of tokens) for GitHub alone, the `CLI + skill` approach uses ~50 tokens for the tool definition and ~500 tokens for the skill file — loaded only when needed as SKILL.md does. That's a **huge reduction** in context overhead, leaving more of the model's reasoning capacity for the actual task.

The catch: **that pattern only pays off where a real shell exists.** As Claude Code and OpenClaw proved the power of the CLI pattern, existing CLIs like `gh` or `x-cli` gained new relevance as agent interfaces, and developers began writing new CLIs as lightweight alternatives to MCP rather than building full MCP servers. But all of this only works when the agent has a shell. In serverless, edge, browser, or sandboxed Node.js environments, none of those CLIs can run, and you're back to MCP's heavy schemas or rolling your own tools.

**`vcli` changes that.** It brings the CLI + skill pattern to every JavaScript runtime — serverless, edge, browser, embedded. No shell, no subprocesses. Just in-process function dispatch that looks exactly like a CLI to the agent. The agent doesn't know the difference; it still writes `gh issue list --repo owner/repo`. But underneath, there's no binary, no process, no OS. Just a function call.

```
Real shell                            vcli
─────────────────────────────         ─────────────────────────────
execute("gh issue list ...")          run("gh issue list ...")
       ↓                                    ↓
OS spawns `gh` process                In-process function dispatch
       ↓                                    ↓
stdout → agent                        JSON → agent

Requires: shell, gh binary            Requires: nothing (just Node.js)
```

## Why not MCP?

|                      | MCP                                        | vcli                                          |
| -------------------- | ------------------------------------------ | --------------------------------------------- |
| **Context cost**     | Tens of thousands of tokens (GitHub alone) | ~50 tokens (1 tool) + ~500 (skill, on demand) |
| **Adding a service** | Build & deploy MCP server                  | Only js function                              |
| **Runtime**          | Separate server process                    | In-process — serverless, edge, browser        |
| **LLM familiarity**  | Custom schemas (new to model)              | CLI patterns (already in training data)       |
| **Reusability**      | Community MCP servers                      | Pre-built plugins, shared via npm             |

## Where vcli fits

```
                    Real CLI          Virtual (in-process)
                ┌──────────────┬──────────────┐
  Per-function  │              │  MCP         │
  schemas       │  (N/A)       │              │
                ├──────────────┼──────────────┤
  Single tool   │  OpenClaw    │  vcli ← here │
  + skills      │  (exec+SKILL)│              │
                └──────────────┴──────────────┘
```

- **MCP**: virtual execution + per-function schemas → token-heavy, always in context
- **OpenClaw / Claude Code**: real CLI + single tool + skills → token-efficient, but requires a shell and installed binaries
- **vcli**: virtual execution + single tool + skills → token-efficient, runs anywhere JavaScript runs, model-agnostic, pre-built plugins via npm

## Quick Start

```bash
npm install vcli @ssota-labs/vcli-plugin
```

```typescript
import { createRuntime } from "vcli";
import { github } from "@ssota-labs/vcli-plugin";

const runtime = createRuntime();
runtime.use(github({ token: process.env.GITHUB_TOKEN }));

const result = await runtime.run(
  "gh issue list --repo owner/repo --state open"
);
// {
//   ok: true,
//   module: "gh",
//   command: "issue list",
//   result: [{ number: 42, title: "Bug report", state: "open", ... }],
//   next_actions: [
//     { command: "gh issue view 42 --repo owner/repo", description: "View issue details" }
//   ]
// }
```

That's it. One tool for the agent, one line to wire up GitHub.

### Developer CLI

```bash
npx vcli add github     # install @ssota-labs/vcli-plugin + scaffold .use(github())
npx vcli add jira       # add another plugin
npx vcli list           # show available plugins
```

### Multiple plugins

```typescript
import { createRuntime } from "vcli";
import { github, jira, linear } from "@ssota-labs/vcli-plugin";

const runtime = createRuntime();
runtime.use(github({ token: process.env.GITHUB_TOKEN }));
runtime.use(
  jira({ host: "myorg.atlassian.net", token: process.env.JIRA_TOKEN })
);
runtime.use(linear({ apiKey: process.env.LINEAR_API_KEY }));

// All accessible through the same single tool
await runtime.run("gh pr list --repo owner/repo");
await runtime.run("jira issue list --project MYPROJ");
await runtime.run("linear issue list --team ENG");
```

## Agent Integration (Progressive Disclosure)

vcli implements the same progressive disclosure pattern as Claude Code / OpenClaw's SKILL.md system — but without file I/O, so it works in stateless serverless environments.

### How it works

The runtime exposes two methods for skills:

- **`runtime.listSkills(options?)`** — returns name + description only. Inject into system prompt (~100 tokens total). Optional `format`: `"json"` (default) or `"xml"` so you can match your system prompt style.
- **`runtime.getFullSkill(name)`** — returns full skill markdown. Agent calls this only when needed (~500 tokens per skill).

Give the agent two tools: `run` (execute commands) and `read_skill` (load full skill docs on demand).

#### Skill list format (`listSkills({ format })`)

You can choose how skill summaries are serialized for the system prompt:

```typescript
// JSON (default) — good for structured prompts
runtime.listSkills();                    // array of { name, description }
runtime.listSkills({ format: "json" });  // same, stringified for embedding

// XML — good for XML/Claude-style prompts
runtime.listSkills({ format: "xml" });
```

**JSON output (default):**
```json
[
  { "name": "github", "description": "GitHub operations — issues, PRs, repos" },
  { "name": "linear", "description": "Linear issues and projects" }
]
```

**XML output (`format: "xml"`):**
```xml
<available_skills>
  <skill name="github" description="GitHub operations — issues, PRs, repos" />
  <skill name="linear" description="Linear issues and projects" />
</available_skills>
```

Use whichever fits your system prompt. For example, if the rest of your instructions are in `<tags>`, passing `format: "xml"` keeps the skill list in the same style.

```
System prompt: skill summaries from listSkills()    ← always (~100 tokens)
Agent decides it needs GitHub                        
  → calls read_skill("github")                      ← on demand (~500 tokens)
  → reads full SKILL.md content
  → calls run("gh issue list --repo owner/repo")
```

Compare this to MCP's tens of thousands of tokens **always** present in context, regardless of whether the agent needs GitHub or not.

### Generic example

```typescript
import { createRuntime } from "vcli";
import { github } from "@ssota-labs/vcli-plugin";

const runtime = createRuntime();
runtime.use(github({ token: process.env.GITHUB_TOKEN }));

const tools = [
  {
    name: "run",
    description: "Execute a virtual CLI command",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "CLI command to execute" },
      },
      required: ["command"],
    },
    execute: (params) => runtime.run(params.command),
  },
  {
    name: "read_skill",
    description: "Read the full documentation for a skill (call before using an unfamiliar skill)",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name (e.g. github, jira)" },
      },
      required: ["name"],
    },
    execute: (params) => {
      const content = runtime.getFullSkill(params.name);
      if (!content) return { ok: false, error: `Skill "${params.name}" not found` };
      return { ok: true, content };
    },
  },
];

// format: "json" (default) or "xml" — returns a string ready to embed in the system prompt
const systemPrompt = `
Available skills (use read_skill to see full docs before using):
${runtime.listSkills({ format: "json" })}

To use a skill: first call read_skill to learn the commands, then call run.
`;
```

### Next.js + Vercel AI SDK example

A complete stateless `route.ts` — runtime is created fresh per request, no persistent state needed:

```typescript
// app/api/agent/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createRuntime } from "vcli";
import { github, linear } from "@ssota-labs/vcli-plugin";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const runtime = createRuntime();
  runtime.use(github({ token: process.env.GITHUB_TOKEN }));
  runtime.use(linear({ apiKey: process.env.LINEAR_API_KEY }));

  const tools = {
    run: {
      description: "Execute a virtual CLI command",
      parameters: { command: { type: "string" } },
      execute: async ({ command }: { command: string }) => {
        return await runtime.run(command);
      },
    },
    read_skill: {
      description: "Read full documentation for a skill",
      parameters: {
        name: { type: "string", description: "Skill name (github, linear, etc.)" },
      },
      execute: async ({ name }: { name: string }) => {
        const content = runtime.getFullSkill(name);
        if (!content) return { error: "Skill not found" };
        return { content };
      },
    },
  };

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    tools,
    system: `
Available skills (use read_skill to see full docs before using):
${runtime.listSkills({ format: "xml" })}

To use a skill: first call read_skill to learn the commands, then call run.
    `,
  });

  return result.toDataStreamResponse();
}
```

**Token budget in this setup:**
- Always in context: `run` tool + `read_skill` tool + skill summaries (~100-200 tokens)
- On demand: `read_skill("github")` loads full markdown (~500 tokens, once per conversation)
- Stateless: runtime is created per request — no shared memory, no file I/O, works on Vercel/Cloudflare/Lambda

## Authentication

Tokens must **never** appear in the CLI command string. The command string is generated by the LLM and would leak tokens into the model context, logs, and potentially other tool responses.

### Static token (single-tenant / simple)

```typescript
runtime.use(github({ token: "ghp_..." }));

// The handler accesses the token from the closure — not from the command
await runtime.run("gh issue list --repo owner/repo");
```

### Per-request token (multi-tenant / serverless)

For services where each user has their own credentials:

```typescript
runtime.use(github()); // no token at setup

// Token passed via context — never in the command string
async function handleUserRequest(userId: string, message: string) {
  const userToken = await vault.getToken(userId, "github");

  const result = await runtime.run("gh issue list --repo owner/repo", {
    auth: { gh: userToken },
  });
}
```

Handlers resolve auth in order: config token (from `.use()`) → context token (from `.run()` second argument). The `auth` object in `RunContext` is excluded from logging and serialization.

## Client-side tool rendering (Vercel AI SDK, etc.)

The agent only has one tool — `run`. On the client you still want to render different components per command (e.g. an issue list for `gh issue list`, a PR card for `gh pr view`). vcli stays client-agnostic: it does not know about React or the AI SDK. It only adds **response metadata** so the client can branch.

Every `runtime.run()` result includes:

- **`module`** — which plugin handled the command (e.g. `"gh"`, `"jira"`)
- **`command`** — the subcommand path (e.g. `"issue list"`, `"pr view"`)

Use these to choose which component to render. The dispatcher already knows this when it invokes the handler; vcli just surfaces it in the JSON.

### Example: conditional rendering by `module` + `command`

```tsx
// With Vercel AI SDK: tool name is always "run", so branch on result shape
{
  message.toolInvocations?.map((tool) => {
    if (tool.toolName !== "run") return null;

    const { module, command, result } = tool.result;

    if (module === "gh" && command === "issue list")
      return <IssueList issues={result} />;

    if (module === "gh" && command === "pr view")
      return <PRDetail pr={result} />;

    if (module === "jira" && command === "ticket view")
      return <JiraTicket ticket={result} />;

    return <JsonView data={result} />;
  });
}
```

You can centralize this in a small mapper (e.g. `getComponentForRunResult(module, command, result)`) or a separate UI package; vcli does not depend on any of that.

## How It Works

```
runtime.run("gh issue list --repo owner/repo --state open")
         │
         ▼
┌─────────────────┐
│    Tokenizer     │  "gh issue list --repo owner/repo --state open"
│  (shlex-like)    │  → ["gh", "issue", "list", "--repo", "owner/repo", "--state", "open"]
└────────┬────────┘
         ▼
┌─────────────────┐
│   Dispatcher     │  Match "gh" namespace → match "issue list" subcommand
│  (longest prefix)│
└────────┬────────┘
         ▼
┌─────────────────┐
│     Parser       │  Parse remaining args: { repo: "owner/repo", state: "open" }
│  (node:util)     │  Type coercion, defaults, validation
└────────┬────────┘
         ▼
┌─────────────────┐
│    Handler       │  listIssues({ repo: "owner/repo", state: "open", limit: 20 })
│  (your function) │  → fetch("https://api.github.com/repos/owner/repo/issues?state=open")
└────────┬────────┘
         ▼
  { ok: true, module: "gh", command: "issue list", result: [...], next_actions: [...] }
```

All in-process. Runs in serverless, edge, browser — anywhere JavaScript runs.

### Auto-documentation

```typescript
await runtime.run("gh");
// Returns full command tree for the "gh" namespace

await runtime.run("gh issue list --help");
// Returns argument docs for "gh issue list"
```

## Writing Plugins

Plugins are created with `defineModule()` from `vcli`. The return value is a factory function that receives config and produces a module.

```typescript
import { defineModule } from "vcli";

export const myService = defineModule({
  name: "mysvc",
  description: "My service operations via virtual CLI",
  setup: (config: { apiKey: string }) => ({
    commands: {
      users: {
        list: {
          args: {
            team: { type: "string" },
            limit: { type: "number", default: 20 },
          },
          handler: async ({ team, limit }, context) => {
            const token = config.apiKey || context?.auth?.mysvc;
            const res = await fetch(
              `https://api.mysvc.com/users?team=${team}&limit=${limit}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            return res.json();
          },
        },
      },
    },
    skill: {
      summary: "Manage users, teams, and permissions for MyService",
      full: [
        "# MyService Virtual CLI",
        "",
        "## Users",
        "mysvc users list [--team <team>] [--limit N]",
      ].join("\n"),
    },
  }),
});
```

Then users consume it:

```typescript
import { createRuntime } from "vcli";
import { myService } from "my-vcli-plugin";

const runtime = createRuntime();
runtime.use(myService({ apiKey: "..." }));
await runtime.run("mysvc users list --team engineering");
```

### Module interface

A resolved module satisfies:

```typescript
interface VirtualCLIModule {
  name: string;           // CLI namespace prefix (e.g., "gh", "jira")
  description: string;    // One-line for skill listing
  commands: CommandTree;   // Nested subcommand tree with handlers
  skill?: {
    summary: string;      // Short description for listSkills() (always in context)
    full: string;         // Full SKILL.md content for getFullSkill() (on demand)
  };
}
```

### Official plugins (`@ssota-labs/vcli-plugin`)

All official plugins live in a single package. Import what you need:

```typescript
// Import from the main entry
import { github, jira, linear } from "@ssota-labs/vcli-plugin";

// Or use subpath exports for tree-shaking
import { github } from "@ssota-labs/vcli-plugin/github";
```

Community plugins can be published as separate packages following the same `defineModule()` pattern.

## Packages

| Package                   | npm                                                                                | Description                                  |
| ------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| `vcli`                    | [`vcli`](https://www.npmjs.com/package/vcli)                                       | Core runtime + developer CLI (`npx vcli`)    |
| `@ssota-labs/vcli-plugin` | [`@ssota-labs/vcli-plugin`](https://www.npmjs.com/package/@ssota-labs/vcli-plugin) | Official plugins (GitHub, Jira, Linear, ...) |

Core is published as an unscoped package — `import from "vcli"`, install with `npm install vcli`.

## Roadmap

- [x] Core runtime (`createRuntime`, `defineModule`, tokenizer, parser, dispatcher)
- [x] GitHub plugin (issues, PRs, repos)
- [ ] Jira plugin
- [ ] Linear plugin
- [ ] Notion plugin
- [ ] Python runtime (`pip install vcli`)
- [ ] Skill auto-discovery (scan installed packages for vcli modules)
- [ ] `npx vcli` developer CLI
- [ ] Plugin marketplace / registry

## Design Principles

1. **One tool, not many.** The agent sees `run(command: string)`. Not dozens of separate function schemas.
2. **Skills are text.** Domain knowledge lives in markdown, not JSON Schema. Loaded on demand, not always in context.
3. **Plugins, not boilerplate.** `npm install` + `.use()` — don't make every developer re-implement the same GitHub API wrapper.
4. **Tokens never in commands.** Auth is injected at the runtime layer, invisible to the LLM.
5. **Model-agnostic.** Works with any LLM that supports tool calling. No vendor lock-in.
6. **Runs everywhere.** Serverless, edge, browser, sandboxed Node.js — anywhere JavaScript runs. No shell or CLI binaries needed.

## License

MIT
