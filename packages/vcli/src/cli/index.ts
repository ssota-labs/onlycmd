#!/usr/bin/env node
const args = process.argv.slice(2);
const cmd = args[0];

const help = `
vcli - Virtual CLI for AI agents

Usage:
  vcli init              Scaffold project / config
  vcli add <plugin>      Add a plugin (e.g. github, jira)
  vcli list              List available plugins

Examples:
  vcli add github
  vcli add jira
  vcli list
`;

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(help.trim());
  process.exit(0);
}

if (cmd === "init") {
  console.log("Run: npm install vcli @ssota-labs/vcli-plugin");
  console.log("Then: createRuntime() and runtime.use(github({ token }))");
  process.exit(0);
}

if (cmd === "add") {
  const plugin = args[1];
  if (!plugin) {
    console.error("Usage: vcli add <plugin>");
    process.exit(1);
  }
  console.log(`To add ${plugin}: npm install @ssota-labs/vcli-plugin`);
  console.log(`Then: runtime.use(${plugin}({ ... }))`);
  process.exit(0);
}

if (cmd === "list") {
  console.log("Available plugins: github, jira (stub), linear (stub)");
  console.log("Install: npm install @ssota-labs/vcli-plugin");
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
console.error(help.trim());
process.exit(1);
