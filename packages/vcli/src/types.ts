/**
 * Argument definition for a command (CLI-style options).
 */
export type ArgType = "string" | "number" | "boolean";

export interface ArgDef {
  type: ArgType;
  required?: boolean;
  default?: string | number | boolean;
  enum?: string[];
  description?: string;
}

/**
 * Handler for a leaf command. Receives parsed args and optional run context (e.g. auth).
 */
export type CommandHandler<T = Record<string, unknown>> = (
  args: T,
  context?: RunContext
) => Promise<unknown> | unknown;

/**
 * Leaf command: has args schema and handler.
 */
export interface LeafCommandDef {
  args?: Record<string, ArgDef>;
  handler: CommandHandler;
  description?: string;
}

/**
 * Node in the command tree: either a leaf (LeafCommandDef) or nested subcommands.
 */
export type CommandTreeNode =
  | LeafCommandDef
  | { [subcommand: string]: CommandTreeNode };

/**
 * Skill content: summary for listSkills(), full for getFullSkill().
 */
export interface SkillContent {
  summary: string;
  full: string;
}

/**
 * Resolved module (after setup() is called): name, description, commands, skill.
 */
export interface VirtualCLIModule {
  name: string;
  description: string;
  commands: Record<string, CommandTreeNode>;
  skill?: SkillContent;
}

/**
 * Factory function returned by defineModule(). Receives config and returns a module.
 */
export type ModuleFactory<C = Record<string, unknown>> = (
  config?: C
) => VirtualCLIModule;

/**
 * Run context passed to handlers (e.g. per-request auth). Auth must not be logged or serialized.
 */
export interface RunContext {
  auth?: Record<string, string>;
}

/**
 * Suggested next action for the agent (HATEOAS-style).
 */
export interface NextAction {
  command: string;
  description: string;
  params?: Record<string, { value: string }>;
}

/**
 * Result of runtime.run(). Includes module/command for client-side branching.
 */
export interface RunResult {
  ok: boolean;
  module: string;
  command: string;
  result?: unknown;
  next_actions?: NextAction[];
  error?: string;
  usage?: string;
}

/**
 * Skill summary returned by listSkills() (name + description for system prompt).
 */
export interface SkillSummary {
  name: string;
  description: string;
}

/**
 * Options for listSkills(). format controls output for embedding in system prompt.
 */
export interface ListSkillsOptions {
  format?: "json" | "xml";
}
