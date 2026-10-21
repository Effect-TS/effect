import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"

const emptyParamNames: ReadonlySet<string> = new Set()

/**
 * @internal
 */
export function getParamNames(schema: Schema.Constraint | undefined): ReadonlySet<string> | undefined {
  if (schema === undefined) return emptyParamNames
  const ast = SchemaAST.getLastEncoding(schema.ast)
  return SchemaAST.isObjects(ast) && ast.indexSignatures.length === 0
    ? new Set(ast.propertySignatures.map((ps) => String(ps.name)))
    : undefined
}

/**
 * @internal
 */
export function toRouterPath(path: string, schema: Schema.Constraint | undefined): string {
  // Preserve undeclared params for raw RouteContext consumers.
  if (schema === undefined || !path.includes(":")) return path
  const paramNames = getParamNames(schema)
  if (paramNames === undefined) return path

  let out = ""
  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    if (char !== ":") {
      out += char
      continue
    }
    if (path[i + 1] === ":") {
      out += "::"
      i++
      continue
    }

    const param = /^:(\w+)/.exec(path.slice(i))
    if (param !== null && paramNames.has(param[1])) {
      out += param[0]
      i += param[0].length - 1
      const next = path[i + 1]
      if (next === "(") {
        const end = regexEnd(path, i + 1)
        out += path.slice(i + 1, end)
        i = end - 1
      } else if (next !== undefined && !"/.-?".includes(next)) {
        // FindMyWay needs a regex to end the parameter name here.
        out += "(.*?)"
      }
    } else {
      out += "::"
    }
  }
  return out
}

/**
 * @internal
 */
export function stripParamRegexes(path: string, paramNames: ReadonlySet<string> | undefined): string {
  const params = /::|:(\w+)/g
  let out = ""
  let last = 0
  for (let param = params.exec(path); param !== null; param = params.exec(path)) {
    const name = param[1]
    if (name === undefined || paramNames?.has(name) === false || path[params.lastIndex] !== "(") continue
    out += path.slice(last, params.lastIndex)
    last = params.lastIndex = regexEnd(path, params.lastIndex)
  }
  return out + path.slice(last)
}

function regexEnd(path: string, start: number): number {
  let depth = 0
  for (let i = start; i < path.length; i++) {
    const char = path[i]
    if (char === "\\") i++
    else if (char === "(") depth++
    else if (char === ")" && --depth === 0) return i + 1
  }
  return path.length
}
