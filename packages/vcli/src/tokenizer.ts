/**
 * Shlex-like tokenizer: splits a CLI command string into tokens.
 * Handles double-quoted and single-quoted strings; backslash escapes.
 */
export function tokenize(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  let i = 0;

  while (i < trimmed.length) {
    const ch = trimmed[i];

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      let value = "";
      while (i < trimmed.length) {
        const c = trimmed[i];
        if (c === "\\" && i + 1 < trimmed.length) {
          value += trimmed[i + 1];
          i += 2;
          continue;
        }
        if (c === quote) {
          i += 1;
          break;
        }
        value += c;
        i += 1;
      }
      tokens.push(value);
      continue;
    }

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    let word = "";
    while (i < trimmed.length) {
      const c = trimmed[i];
      if (/\s/.test(c) || c === '"' || c === "'") break;
      if (c === "\\" && i + 1 < trimmed.length) {
        word += trimmed[i + 1];
        i += 2;
        continue;
      }
      word += c;
      i += 1;
    }
    tokens.push(word);
  }

  return tokens;
}
