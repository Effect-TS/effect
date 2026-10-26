import { assignProperty } from "../../internal/record.ts"
import * as SchemaAST from "../../SchemaAST.ts"

/** @internal */
export type FlatParams = { readonly [key: string]: string | ReadonlyArray<string> }

/**
 * Collects the top-level property names of a schema's encoded side, through
 * unions and suspensions.
 *
 * @internal
 */
export function getPropertyNames(ast: SchemaAST.AST): ReadonlySet<string> {
  const names = new Set<string>()
  const seen = new Set<SchemaAST.AST>()
  const go = (ast: SchemaAST.AST): void => {
    if (seen.has(ast)) return
    seen.add(ast)
    switch (ast._tag) {
      case "Objects":
        for (const ps of ast.propertySignatures) {
          if (typeof ps.name === "string") names.add(ps.name)
        }
        return
      case "Union":
        return ast.types.forEach(go)
      case "Suspend":
        return go(ast.thunk())
    }
  }
  go(SchemaAST.toEncoded(ast))
  return names
}

const bracketKey = /^([^[\]]+)((?:\[[^[\]]+\])+)$/

/**
 * Rebuilds the `a[b][c]` keys `UrlParams.fromInput` writes for nested objects.
 *
 * Only keys whose base is one of `names` are rebuilt, and keys listed in
 * `names` are kept as is, so literal bracket keys keep decoding. A key that
 * conflicts with a shorter one, such as `a[b]` next to `a`, stays flat.
 *
 * @internal
 */
export function fromFlatParams(params: FlatParams, names: ReadonlySet<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const nested: Array<{ readonly key: string; readonly path: ReadonlyArray<string> }> = []
  for (const key of Object.keys(params)) {
    const match = names.has(key) ? null : bracketKey.exec(key)
    if (match !== null && names.has(match[1])) {
      nested.push({ key, path: [match[1], ...match[2].slice(1, -1).split("][")] })
    } else {
      assignProperty(out, key, params[key])
    }
  }
  // Shorter paths win, whatever order the keys arrived in
  nested.sort((a, b) => a.path.length - b.path.length)
  for (const { key, path } of nested) {
    if (!setPath(out, path, params[key])) {
      assignProperty(out, key, params[key])
    }
  }
  return out
}

function setPath(out: Record<string, unknown>, path: ReadonlyArray<string>, value: unknown): boolean {
  let node = out
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]
    if (!Object.hasOwn(node, segment)) {
      const child = {}
      assignProperty(node, segment, child)
      node = child
      continue
    }
    const child = node[segment]
    // Parameter values are strings or arrays, so any other object was built here
    if (typeof child !== "object" || child === null || Array.isArray(child)) return false
    node = child as Record<string, unknown>
  }
  const leaf = path[path.length - 1]
  if (Object.hasOwn(node, leaf)) return false
  assignProperty(node, leaf, value)
  return true
}
