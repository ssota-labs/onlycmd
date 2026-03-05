import { parseArgs } from "node:util";
import type { ParseArgsConfig } from "node:util";
import type { ArgDef } from "./types.js";

/**
 * Build parseArgs options from ArgDef map.
 * Node's parseArgs supports 'string' and 'boolean'; we use 'string' for number and coerce later.
 */
function buildParseArgsOptions(
  argsDef: Record<string, ArgDef>
): ParseArgsConfig["options"] {
  const options: NonNullable<ParseArgsConfig["options"]> = {};
  for (const [name, def] of Object.entries(argsDef)) {
    if (def.type === "boolean") {
      options[name] = {
        type: "boolean",
        ...(def.default !== undefined && {
          default: def.default as boolean,
        }),
      };
    } else {
      options[name] = {
        type: "string",
        ...(def.default !== undefined && { default: String(def.default) }),
      };
    }
  }
  return options;
}

/**
 * Coerce a value to the expected type and apply enum if defined.
 */
function coerceValue(
  value: unknown,
  def: ArgDef
): string | number | boolean | undefined {
  if (value === undefined || value === null) {
    return def.default as string | number | boolean | undefined;
  }
  if (def.enum && !def.enum.includes(String(value))) {
    return undefined;
  }
  switch (def.type) {
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? (def.default as number | undefined) : n;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return def.default as boolean | undefined;
    case "string":
    default:
      return String(value);
  }
}

/**
 * Parse token array into args object using ArgDef. Applies defaults and type coercion.
 */
export function parse(
  tokens: string[],
  argsDef: Record<string, ArgDef>
): Record<string, unknown> {
  const options = buildParseArgsOptions(argsDef);
  const config: ParseArgsConfig = {
    args: tokens,
    options,
    strict: false,
    allowPositionals: true,
  };
  const { values } = parseArgs(config);

  const result: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(argsDef)) {
    const raw = values[name];
    const coerced = coerceValue(raw, def);
    if (coerced !== undefined) {
      result[name] = coerced;
    } else if (def.default !== undefined) {
      result[name] = def.default;
    } else if (def.required && (raw === undefined || raw === null)) {
      result[name] = undefined;
    }
  }
  return result;
}
