#!/usr/bin/env node
const args = process.argv.slice(2);
const cmd = args[0];

const help = `
onlycmd - OnlyCMD for AI agents

Usage:
  onlycmd init              Scaffold project / config
  onlycmd add <plugin>      Add a plugin (e.g. github, jira)
  onlycmd list              List available plugins

Examples:
  onlycmd add github
  onlycmd add jira
  onlycmd list
`;

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(help.trim());
  process.exit(0);
}

if (cmd === "init") {
  console.log("Run: npm install onlycmd onlycmd-plugin");
  console.log("Then: createRuntime() and runtime.use(github({ token }))");
  process.exit(0);
}

if (cmd === "add") {
  const plugin = args[1];
  if (!plugin) {
    console.error("Usage: onlycmd add <plugin>");
    process.exit(1);
  }
  console.log(`To add ${plugin}: npm install onlycmd onlycmd-plugin`);
  console.log(`Then: runtime.use(${plugin}({ ... }))`);
  process.exit(0);
}

if (cmd === "list") {
  console.log("Available plugins: github, jira (stub), linear (stub)");
  console.log("Install: npm install onlycmd onlycmd-plugin");
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
console.error(help.trim());
process.exit(1);
