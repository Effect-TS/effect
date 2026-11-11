import { code, type Fragment, join } from "../codegen.ts"

interface Token {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly kind: "identifier" | "literal" | "punctuation"
}

/** Parse schema expressions and types, keeping their spelling except for tracked references. */
export function parse(source: string, references: ReadonlyMap<string, Fragment>, kind: "runtime" | "Type"): Fragment {
  const tokens: Array<Token> = []
  const replacements: Array<{ readonly token: Token; readonly fragment: Fragment }> = []
  let offset = 0
  let index = 0
  const fail = (position = tokens[index]?.start ?? offset): never => {
    throw new Error(`Unsupported ${kind} syntax at offset ${position}: ${source}`)
  }
  while (offset < source.length) {
    if (/\s/u.test(source[offset])) {
      offset++
      continue
    }
    if (source.startsWith("//", offset)) {
      while (offset < source.length && !/[\r\n\u2028\u2029]/u.test(source[offset])) offset++
      continue
    }
    if (source.startsWith("/*", offset)) {
      const end = source.indexOf("*/", offset + 2)
      if (end === -1) fail(offset)
      offset = end + 2
      continue
    }
    const start = offset
    const char = source[offset]
    let tokenKind: Token["kind"] = "punctuation"
    if (char === "'" || char === "\"") {
      tokenKind = "literal"
      offset++
      while (offset < source.length && source[offset] !== char) {
        if (source[offset] === "\\") {
          offset++
          if (source[offset] === "\r" && source[offset + 1] === "\n") offset++
        } else if (source[offset] === "\r" || source[offset] === "\n") {
          fail(offset)
        }
        offset++
      }
      if (source[offset++] !== char) fail(offset - 1)
    } else {
      const remaining = source.slice(offset)
      const identifier = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u.exec(remaining)
      const number = /^(?:0[xX][\da-fA-F]+n?|0[bB][01]+n?|0[oO][0-7]+n?|\d+n|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/
        .exec(remaining)
      if (identifier !== null) {
        tokenKind = "identifier"
        offset += identifier[0].length
      } else if (number !== null) {
        tokenKind = "literal"
        offset += number[0].length
      } else if (remaining.startsWith("...")) {
        offset += 3
      } else if (remaining.startsWith("=>")) {
        offset += 2
      } else if (".()[]{}<>,:;?|&+-!".includes(char)) {
        offset++
      } else {
        fail(offset)
      }
    }
    tokens.push({ text: source.slice(start, offset), start, end: offset, kind: tokenKind })
  }

  const at = (text: string): boolean => tokens[index]?.text === text
  const take = (text: string): boolean => at(text) ? (index++, true) : false
  const expect = (text: string): void => {
    if (!take(text)) fail()
  }
  const identifier = (): Token => {
    const token = tokens[index]
    if (token?.kind !== "identifier") return fail()
    index++
    return token
  }
  const reference = (token: Token, shorthand = false): void => {
    const fragment = references.get(token.text)
    if (fragment !== undefined) {
      replacements.push({ token, fragment: shorthand ? code`${token.text}: ${fragment}` : fragment })
    }
  }
  const list = (end: string, item: () => void): void => {
    if (take(end)) return
    do {
      item()
      if (!take(",")) break
    } while (!at(end))
    expect(end)
  }
  const path = (): void => {
    reference(identifier())
    while (take(".")) identifier()
  }
  const type = (): void => {
    typeMember()
    while (take("|") || take("&")) typeMember()
  }
  const typeMember = (): void => {
    if (take("readonly") || take("typeof")) {
      typeMember()
      return
    }
    if (take("(")) {
      type()
      expect(")")
    } else if (take("[")) {
      list("]", () => {
        take("...")
        type()
        take("?")
      })
    } else if (take("{")) {
      while (!take("}")) {
        take("readonly")
        if (take("[")) {
          if (tokens[index]?.kind === "identifier" && tokens[index + 1]?.text === ":") {
            identifier()
            expect(":")
            type()
          } else {
            expression()
          }
          expect("]")
        } else if (tokens[index]?.kind === "identifier" || tokens[index]?.kind === "literal") {
          index++
        } else {
          fail()
        }
        take("?")
        expect(":")
        type()
        if (!take(",") && !take(";") && !at("}")) fail()
      }
    } else if (take("-")) {
      if (tokens[index++]?.kind !== "literal") fail()
    } else if (tokens[index]?.kind === "literal") {
      index++
    } else {
      path()
      if (take("<")) list(">", type)
    }
    while (take("[")) expect("]")
  }
  const expression = (): void => {
    if (take("-") || take("+") || take("!")) {
      expression()
      return
    }
    if (take("new")) {
      path()
      expect("(")
      list(")", expression)
    } else if (take("(")) {
      if (take(")")) {
        if (take(":")) type()
        expect("=>")
        expression()
        return
      }
      expression()
      expect(")")
    } else if (take("[")) {
      list("]", () => {
        take("...")
        expression()
      })
    } else if (take("{")) {
      list("}", () => {
        if (take("...")) {
          expression()
          return
        }
        if (take("[")) {
          expression()
          expect("]")
          expect(":")
          expression()
          return
        }
        const key = tokens[index++]
        if (key?.kind !== "identifier" && key?.kind !== "literal") fail()
        if (take(":")) expression()
        else if (key.kind === "identifier") reference(key, true)
        else fail()
      })
    } else if (tokens[index]?.kind === "literal") {
      index++
    } else {
      if (["function", "class", "await", "yield", "import", "const", "let", "return"].includes(tokens[index]?.text)) {
        fail()
      }
      reference(identifier())
    }
    while (true) {
      if (take(".")) {
        identifier()
      } else if (take("[")) {
        expression()
        expect("]")
      } else if (take("(")) {
        list(")", () => {
          take("...")
          expression()
        })
      } else if (take("<")) {
        list(">", type)
        expect("(")
        list(")", expression)
      } else {
        break
      }
    }
  }
  if (kind === "Type") type()
  else expression()
  if (index !== tokens.length) fail()

  const parts: Array<Fragment> = []
  let end = 0
  for (const { token, fragment } of replacements) {
    parts.push(source.slice(end, token.start), fragment)
    end = token.end
  }
  parts.push(source.slice(end))
  return join(parts, "")
}
