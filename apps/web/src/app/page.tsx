import Link from "next/link";
import { CopyCommand } from "./components/CopyCommand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INSTALL_CMD = "npm install onlycmd @ssota-labs/onlycmd-plugin";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Section 1: Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-zinc-900">onlycmd</span>
          <nav className="flex gap-6 text-sm text-zinc-600">
            <Link href="#docs" className="hover:text-zinc-900">
              Docs
            </Link>
            <a
              href="https://github.com/ssota-labs/onlycmd"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {/* Section 2: Hero */}
        <section className="py-16 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
            OnlyCMD for AI Agents
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Agent → onlycmd → Action
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-zinc-600">
            The CLI + Skill pattern behind Claude Code — now in any JavaScript
            runtime. No shell, no MCP server. Just javascript.
          </p>
          <div className="mb-8 flex justify-center">
            <CopyCommand command={INSTALL_CMD} />
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild>
              <Link href="#docs">Get Started</Link>
            </Button>
            <Button variant="secondary" asChild>
              <a
                href="https://github.com/ssota-labs/onlycmd"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </Button>
          </div>
        </section>

        {/* Section 3: How it works */}
        <section className="border-t border-zinc-200 py-16">
          <h2 className="mb-12 text-center text-2xl font-bold text-zinc-900">
            How it works
          </h2>

          <div className="space-y-16">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-500">01</p>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                Install & Configure
              </h3>
              <p className="mb-4 text-zinc-600">
                One line to set up. Works in any JavaScript runtime —
                serverless, edge, browser.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-mono text-zinc-800">
                <code>{`import { createRuntime } from "onlycmd";
import { github } from "@ssota-labs/onlycmd-plugin";

const runtime = createRuntime();
runtime.use(github({ token: process.env.GITHUB_TOKEN }));`}</code>
              </pre>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-500">02</p>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                Agent Reads Skills
              </h3>
              <p className="mb-4 text-zinc-600">
                Skills are loaded on demand. ~100 tokens always in context,
                ~500 when the agent actually needs a skill.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-mono text-zinc-800">
                <code>{`const systemPrompt = \`
Available skills:
\${runtime.listSkills({ format: "json" })}
\`;
// Agent calls read_skill("github") only when it needs GitHub`}</code>
              </pre>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-500">03</p>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                Agent Runs Commands
              </h3>
              <p className="mb-4 text-zinc-600">
                The agent calls run() — in-process dispatch, no shell, no
                subprocess.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-mono text-zinc-800">
                <code>{`const result = await runtime.run(
  "gh issue list --repo owner/repo --state open"
);
// { ok: true, module: "gh", command: "issue list", result: [...] }`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Section 4: Why not MCP? */}
        <section className="border-t border-zinc-200 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
            Why not MCP?
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-medium text-zinc-500"></th>
                  <th className="px-4 py-3 font-medium text-zinc-700">MCP</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">onlycmd</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-700">
                    Context cost
                  </td>
                  <td className="px-4 py-3">
                    ~55,000 tokens (GitHub alone)
                  </td>
                  <td className="px-4 py-3">~50 tokens + ~500 on demand</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-700">
                    Adding a service
                  </td>
                  <td className="px-4 py-3">Build & deploy MCP server</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-zinc-100 px-1">npm install</code>{" "}
                    + <code className="rounded bg-zinc-100 px-1">.use()</code>
                  </td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-700">
                    Runtime
                  </td>
                  <td className="px-4 py-3">Separate server process</td>
                  <td className="px-4 py-3">
                    In-process — serverless, edge, browser
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-700">
                    LLM familiarity
                  </td>
                  <td className="px-4 py-3">Custom schemas (new to model)</td>
                  <td className="px-4 py-3">
                    CLI patterns (already in training data)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compare: What the agent sees — MCP vs onlycmd (run + skills) */}
          <h3 className="mb-4 mt-10 text-lg font-semibold text-zinc-900">
            Compare: What the agent sees
          </h3>
          <p className="mb-4 text-sm text-zinc-600">
            MCP injects many tool schemas into context. onlycmd exposes one{" "}
            <code className="rounded bg-zinc-100 px-1">run</code> tool and
            skills on demand.
          </p>
          <Tabs defaultValue="mcp" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mcp">MCP — many tool schemas</TabsTrigger>
              <TabsTrigger value="onlycmd">onlycmd — run + skills</TabsTrigger>
            </TabsList>
            <TabsContent value="mcp" className="mt-4">
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="border-b border-zinc-200 bg-zinc-100/80 px-4 py-2 text-xs font-medium text-zinc-500">
                  Tools sent to the model (GitHub example, truncated — ~55k+ tokens)
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm text-zinc-800">
                  <code>{`// Dozens of tools, each with full JSON Schema. All in context.
{
  "tools": [
    { "name": "github_list_issues", "input_schema": { ... } },
    { "name": "github_get_issue", "input_schema": { ... } },
    { "name": "github_create_issue", "input_schema": { ... } },
    // ... 30+ more tools for GitHub alone
  ]
}`}</code>
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="onlycmd" className="mt-4">
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="border-b border-zinc-200 bg-zinc-100/80 px-4 py-2 text-xs font-medium text-zinc-500">
                  One run() tool + skill list (~50 tokens). Full skill on demand (~500 tokens).
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm text-zinc-800">
                  <code>{`// Single tool — always in context
{ "name": "run", "parameters": { "command": "string" } }

// System: skill summaries only (~100 tokens)
// When needed: read_skill("github") → ~500 tokens
// Then: run("gh issue list --repo owner/repo")`}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Section 5: Features */}
        <section className="border-t border-zinc-200 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-zinc-900">
            Features
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">One Tool, Not Many</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  The agent sees <code className="rounded bg-zinc-200 px-1">run(command)</code>. Not dozens of
                  function schemas.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills Are Text</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  Domain knowledge in markdown, loaded on demand. Not always in
                  context.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plugins via npm</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  <code className="rounded bg-zinc-200 px-1">npm install</code> +{" "}
                  <code className="rounded bg-zinc-200 px-1">.use()</code>. No
                  boilerplate, no MCP server setup.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Runs Everywhere</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  Serverless, edge, browser, sandboxed Node.js. Anywhere
                  JavaScript runs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Agnostic</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  Works with OpenAI, Anthropic, or any LLM with tool calling.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auth Safety</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-600">
                  Tokens injected at runtime layer, never in the command string.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 6: Full Example */}
        <section className="border-t border-zinc-200 py-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-zinc-900">
            Get started in seconds
          </h2>
          <p className="mb-8 text-center text-zinc-600">
            A complete Next.js API route — stateless, no file I/O.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-mono text-zinc-800">
            <code>{`// app/api/agent/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createRuntime } from "onlycmd";
import { github } from "@ssota-labs/onlycmd-plugin";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const runtime = createRuntime();
  runtime.use(github({ token: process.env.GITHUB_TOKEN }));

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    tools: {
      run: {
        description: "Execute an onlycmd command",
        parameters: { command: { type: "string" } },
        execute: ({ command }) => runtime.run(command),
      },
    },
    system: \`Available skills:\\n\${runtime.listSkills()}\`,
  });

  return result.toDataStreamResponse();
}`}</code>
          </pre>
        </section>

        {/* Section 7: Architecture */}
        <section className="border-t border-zinc-200 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
            How it works under the hood
          </h2>
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm font-mono text-zinc-800">
            <code>{`runtime.run("gh issue list --repo owner/repo")
       |
  Tokenizer  →  Dispatcher  →  Parser  →  Handler
       |                                      |
  Split args      Match module         Call function
                  + subcommand         (no shell, no process)`}</code>
          </pre>
        </section>

        {/* Section 8: Footer CTA + Footer */}
        <section className="border-t border-zinc-200 py-16">
          <div className="mb-8 flex justify-center">
            <CopyCommand command={INSTALL_CMD} />
          </div>
          <div className="mb-12 flex justify-center">
            <Button asChild>
              <Link href="#docs">Read the docs</Link>
            </Button>
          </div>
          <footer className="border-t border-zinc-200 pt-8 text-center text-sm text-zinc-500">
            <p>
              <a
                href="https://github.com/ssota-labs/onlycmd"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-700"
              >
                ssota-labs
              </a>{" "}
              · MIT License
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
