import type {
  VirtualCLIModule,
  ModuleFactory,
  RunContext,
  RunResult,
  SkillSummary,
  ListSkillsOptions,
} from "./types.js";
import { dispatch } from "./dispatcher.js";

export interface Runtime {
  use(plugin: VirtualCLIModule | ModuleFactory): Runtime;
  run(command: string, context?: RunContext): Promise<RunResult>;
  /** Returns a string ready to embed in system prompt (JSON or XML). */
  listSkills(options?: ListSkillsOptions): string;
  getFullSkill(name: string): string | null;
}

export function createRuntime(): Runtime {
  const modules = new Map<string, VirtualCLIModule>();

  const runtime: Runtime = {
    use(plugin: VirtualCLIModule | ModuleFactory): Runtime {
      const module =
        typeof plugin === "function" ? (plugin as ModuleFactory)() : plugin;
      if (modules.has(module.name)) {
        throw new Error(`Module "${module.name}" is already registered`);
      }
      modules.set(module.name, module);
      return runtime;
    },

    async run(command: string, context?: RunContext): Promise<RunResult> {
      return dispatch(modules, command, context);
    },

    listSkills(options?: ListSkillsOptions): string {
      const summaries: SkillSummary[] = Array.from(modules.values()).map(
        (m) => ({
          name: m.name,
          description: m.description,
        })
      );
      const format = options?.format ?? "json";
      if (format === "xml") {
        const parts = summaries.map(
          (s) =>
            `  <skill name="${escapeXml(s.name)}" description="${escapeXml(s.description)}" />`
        );
        return `<available_skills>\n${parts.join("\n")}\n</available_skills>`;
      }
      return JSON.stringify(summaries, null, 2);
    },

    getFullSkill(name: string): string | null {
      const module = modules.get(name);
      if (!module?.skill) return null;
      return module.skill.full;
    },
  };

  return runtime;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
