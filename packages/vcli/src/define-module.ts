import type { VirtualCLIModule, ModuleFactory } from "./types.js";

export interface DefineModuleOptions<C = Record<string, unknown>> {
  name: string;
  description: string;
  setup: (config?: C) => VirtualCLIModule;
}

/**
 * Define a virtual CLI module (plugin). Returns a factory that accepts config and returns the module.
 * Use with runtime.use(): runtime.use(github({ token: "..." })).
 */
export function defineModule<C = Record<string, unknown>>(
  options: DefineModuleOptions<C>
): ModuleFactory<C> {
  const { setup } = options;
  return (config?: C) => setup(config);
}
