import type * as Schema from "../../../Schema.ts"
import * as SchemaAST from "../../../SchemaAST.ts"

/** @internal */
export function getParamNames(schema: Schema.Constraint | undefined): ReadonlySet<string> | undefined {
  if (schema === undefined) return undefined
  const ast = SchemaAST.getLastEncoding(schema.ast)
  // Fall back to the existing path syntax when the encoded keys cannot be enumerated.
  return SchemaAST.isObjects(ast) && ast.indexSignatures.length === 0
    ? new Set(ast.propertySignatures.map((ps) => String(ps.name)))
    : undefined
}

/** @internal */
export function toRouterPath(path: string, schema: Schema.Constraint | undefined): string {
  if (!path.includes(":")) return path
  const paramNames = getParamNames(schema)
  if (paramNames === undefined) return path

  let out = ""
  let depth = 0
  let regexStart = -1
  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    // Leave explicit regex constraints intact, including their escapes and nested groups.
    if (depth > 0 || i === regexStart) {
      out += char
      if (char === "\\") out += path[++i] ?? ""
      else if (char === "(") depth++
      else if (char === ")") depth--
      continue
    }
    if (char !== ":") {
      out += char
      continue
    }
    if (path[i + 1] === ":") {
      out += "::"
      i++
      continue
    }

    // Preserve router parameter names that contain characters outside the client's word syntax.
    const name = /^:([^/().?-]+)/.exec(path.slice(i))
    if (name !== null && paramNames.has(name[1])) {
      out += name[0]
      i += name[0].length - 1
      if (path[i + 1] === "(") regexStart = i + 1
      continue
    }
    const param = /^:(\w+)/.exec(path.slice(i))
    if (param !== null && paramNames.has(param[1])) {
      out += param[0]
      i += param[0].length - 1
      // Delimit the capture before an adjacent colon; FindMyWay otherwise includes it in the name.
      if (path[i + 1] === ":") out += "(.*?)"
    } else {
      out += "::"
    }
  }
  return out
}
