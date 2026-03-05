import type {
  VirtualCLIModule,
  LeafCommandDef,
  CommandTreeNode,
  RunContext,
  RunResult,
} from "./types.js";
import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";

function isLeafCommand(node: CommandTreeNode): node is LeafCommandDef {
  return (
    typeof node === "object" &&
    node !== null &&
    "handler" in node &&
    typeof (node as LeafCommandDef).handler === "function"
  );
}

/**
 * Find longest matching command path and return leaf + remaining tokens.
 * Prefers deeper matches (e.g. "issue list" over "issue").
 */
function resolveCommand(
  commands: Record<string, CommandTreeNode>,
  tokens: string[],
  path: string[] = []
): { leaf: LeafCommandDef; commandPath: string; remaining: string[] } | null {
  if (tokens.length === 0) return null;

  const [head, ...rest] = tokens;
  const node = commands[head];
  if (!node) return null;

  let leafCandidate: { leaf: LeafCommandDef; commandPath: string; remaining: string[] } | null =
    null;
  if (isLeafCommand(node)) {
    leafCandidate = {
      leaf: node,
      commandPath: [...path, head].join(" "),
      remaining: rest,
    };
  }

  const nested = node as Record<string, CommandTreeNode>;
  const deeper = resolveCommand(nested, rest, [...path, head]);
  if (deeper) return deeper;
  return leafCandidate;
}

export interface DispatchResult {
  moduleName: string;
  commandPath: string;
  result: unknown;
  next_actions?: RunResult["next_actions"];
}

/**
 * Dispatch a command string to the appropriate module and handler.
 */
export async function dispatch(
  modules: Map<string, VirtualCLIModule>,
  commandString: string,
  context?: RunContext
): Promise<RunResult> {
  const tokens = tokenize(commandString);
  if (tokens.length === 0) {
    return {
      ok: false,
      module: "",
      command: "",
      error: "Empty command",
    };
  }

  const [namespace, ...restTokens] = tokens;
  const module = modules.get(namespace);
  if (!module) {
    return {
      ok: false,
      module: namespace,
      command: "",
      error: `Unknown module: ${namespace}`,
      usage: `Available modules: ${[...modules.keys()].join(", ")}`,
    };
  }

  const resolved = resolveCommand(module.commands, restTokens);
  if (!resolved) {
    return {
      ok: false,
      module: namespace,
      command: restTokens.join(" "),
      error: `Unknown command: ${restTokens.join(" ")}`,
      usage: `Use ${namespace} --help for usage`,
    };
  }

  const { leaf, commandPath, remaining } = resolved;
  const argsDef = leaf.args ?? {};
  const args = parse(remaining, argsDef);

  for (const [name, def] of Object.entries(argsDef)) {
    if (def.required && (args[name] === undefined || args[name] === null)) {
      return {
        ok: false,
        module: namespace,
        command: commandPath,
        error: `Missing required argument: --${name}`,
      };
    }
  }

  try {
    const result = await Promise.resolve(leaf.handler(args, context));
    const runResult: RunResult = {
      ok: true,
      module: namespace,
      command: commandPath,
      result,
    };
    if (
      result &&
      typeof result === "object" &&
      "next_actions" in result &&
      Array.isArray((result as { next_actions?: unknown }).next_actions)
    ) {
      runResult.next_actions = (result as { next_actions: RunResult["next_actions"] })
        .next_actions;
    }
    return runResult;
  } catch (err) {
    return {
      ok: false,
      module: namespace,
      command: commandPath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
