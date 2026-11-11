import type { Import } from "../codegen.ts"

export type Imports = ReadonlyArray<
  Import | {
    readonly kind: "SideEffect"
    readonly module: string
    readonly attributes: string
  }
>

interface Token {
  readonly kind: "identifier" | "string" | "punctuation"
  readonly value: string
}

/** Parse import declarations only. Callback expressions remain opaque to this adapter. */
export function parse(source: string): Imports {
  const tokens: Array<Token> = []
  let offset = 0
  const fail = (): never => {
    throw new Error(`Invalid import declaration: ${source}`)
  }
  const escape = (): string => {
    const char = source[offset++]
    if (char === undefined) return fail()
    if (char === "\n") return ""
    if (char === "\r") {
      if (source[offset] === "\n") offset++
      return ""
    }
    if (char === "x" || char === "u") {
      const braced = char === "u" && source[offset] === "{"
      if (braced) offset++
      const end = braced ? source.indexOf("}", offset) : offset + (char === "u" ? 4 : 2)
      const digits = source.slice(offset, end)
      if (end < offset || !/^[\da-f]+$/i.test(digits) || (!braced && digits.length !== (char === "u" ? 4 : 2))) {
        return fail()
      }
      const value = Number.parseInt(digits, 16)
      if (value > 0x10ffff) return fail()
      offset = end + (braced ? 1 : 0)
      return String.fromCodePoint(value)
    }
    if (/[1-9]/.test(char) || (char === "0" && /\d/.test(source[offset] ?? ""))) return fail()
    switch (char) {
      case "n":
        return "\n"
      case "r":
        return "\r"
      case "t":
        return "\t"
      case "b":
        return "\b"
      case "f":
        return "\f"
      case "v":
        return "\v"
      case "0":
        return "\0"
      default:
        return char
    }
  }
  while (offset < source.length) {
    const char = String.fromCodePoint(source.codePointAt(offset)!)
    if (/\s/u.test(char)) {
      offset++
      continue
    }
    if (source.startsWith("//", offset)) {
      while (offset < source.length && source[offset] !== "\n" && source[offset] !== "\r") offset++
      continue
    }
    if (source.startsWith("/*", offset)) {
      const end = source.indexOf("*/", offset + 2)
      if (end === -1) return fail()
      offset = end + 2
      continue
    }
    if (char === "\"" || char === "'") {
      offset++
      let value = ""
      while (offset < source.length && source[offset] !== char) {
        const next = source[offset++]
        if (next === "\n" || next === "\r") return fail()
        value += next === "\\" ? escape() : next
      }
      if (source[offset++] !== char) return fail()
      tokens.push({ kind: "string", value })
      continue
    }
    if (/[$_\p{ID_Start}]/u.test(char) || char === "\\") {
      let value = ""
      do {
        if (source[offset] === "\\") {
          offset++
          if (source[offset] !== "u") return fail()
          value += escape()
        } else {
          const point = String.fromCodePoint(source.codePointAt(offset)!)
          value += point
          offset += point.length
        }
      } while (
        offset < source.length &&
        (/[$\u200c\u200d\p{ID_Continue}]/u.test(String.fromCodePoint(source.codePointAt(offset)!)) ||
          source[offset] === "\\")
      )
      if (!/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(value)) return fail()
      tokens.push({ kind: "identifier", value })
      continue
    }
    if (!"*{},:;".includes(char)) return fail()
    tokens.push({ kind: "punctuation", value: char })
    offset++
  }

  let index = 0
  const at = (value: string): boolean => tokens[index]?.value === value && tokens[index]?.kind !== "string"
  const take = (value: string): boolean => at(value) ? (index++, true) : false
  const expect = (value: string): void => {
    if (!take(value)) fail()
  }
  const identifier = (): string => {
    const token = tokens[index++]
    return token?.kind === "identifier" ? token.value : fail()
  }
  const string = (): string => {
    const token = tokens[index++]
    return token?.kind === "string" ? token.value : fail()
  }
  const imports: Array<Imports[number]> = []
  while (index < tokens.length) {
    expect("import")
    const clause: Array<Omit<Import, "module" | "attributes">> = []
    let typeOnly = false
    if (tokens[index]?.kind !== "string") {
      typeOnly = at("type") && tokens[index + 1]?.value !== "from" && tokens[index + 1]?.value !== ","
        ? (index++, true)
        : false
      if (tokens[index]?.kind === "identifier") {
        clause.push({ kind: "Default", imported: "default", local: identifier(), typeOnly })
        if (!take(",")) expect("from")
      }
      if (take("*")) {
        expect("as")
        clause.push({ kind: "Namespace", imported: "*", local: identifier(), typeOnly })
        expect("from")
      } else if (take("{")) {
        while (!take("}")) {
          let itemTypeOnly = typeOnly
          let token = tokens[index++]
          if (token?.kind !== "identifier" && token?.kind !== "string") return fail()
          if (
            token.kind === "identifier" && token.value === "type" && (
              tokens[index]?.kind === "string" ||
              (tokens[index]?.kind === "identifier" && !at("as")) ||
              (at("as") && ["as", ",", "}"].includes(tokens[index + 1]?.value))
            )
          ) {
            itemTypeOnly = true
            token = tokens[index++]
          }
          const imported = token.value
          const local = take("as") ? identifier() : token.kind === "identifier" ? imported : fail()
          clause.push({ kind: "Named", imported, local, typeOnly: itemTypeOnly })
          if (!take(",")) {
            expect("}")
            break
          }
        }
        expect("from")
      } else if (clause.length === 0) {
        return fail()
      }
    }
    const module = string()
    let attributes = ""
    if (at("with") || at("assert")) {
      const keyword = tokens[index++].value
      expect("{")
      const entries: Array<readonly [string, string]> = []
      while (!take("}")) {
        const key = tokens[index]?.kind === "string" ? string() : identifier()
        expect(":")
        entries.push([key, string()])
        if (!take(",")) {
          expect("}")
          break
        }
      }
      attributes = ` ${keyword} { ${
        entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) =>
          `${JSON.stringify(key)}: ${JSON.stringify(value)}`
        ).join(", ")
      } }`
    }
    for (const binding of clause) imports.push({ ...binding, module, attributes })
    // Specifier-level type modifiers preserve module evaluation with verbatimModuleSyntax.
    if (!typeOnly && clause.every((binding) => binding.typeOnly)) {
      imports.push({ kind: "SideEffect", module, attributes })
    }
    take(";")
  }
  return imports
}

export function render(imports: ReadonlyArray<Imports>): ReadonlyArray<string> {
  const bindings = new Map<string, Import>()
  const sideEffects = new Set<string>()
  const ordered: Array<string | Import> = []
  for (const imported of imports.flat()) {
    if (imported.kind === "SideEffect") {
      const source = `import ${JSON.stringify(imported.module)}${imported.attributes}`
      if (!sideEffects.has(source)) {
        sideEffects.add(source)
        ordered.push(source)
      }
    } else {
      const previous = bindings.get(imported.local)
      if (previous === undefined || (previous.typeOnly && !imported.typeOnly)) {
        bindings.set(imported.local, imported)
        ordered.push(imported)
      }
    }
  }
  return ordered.flatMap((binding) => {
    if (typeof binding === "string") return [binding]
    if (bindings.get(binding.local) !== binding) return []
    const clause = binding.kind === "Namespace" ?
      `* as ${binding.local}`
      : binding.kind === "Default" ?
      binding.local
      : `{ ${
        binding.imported === binding.local ?
          binding.imported :
          `${
            /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(binding.imported)
              ? binding.imported :
              JSON.stringify(binding.imported)
          } as ${binding.local}`
      } }`
    return [
      `import ${binding.typeOnly ? "type " : ""}${clause} from ${JSON.stringify(binding.module)}${binding.attributes}`
    ]
  })
}
