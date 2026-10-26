import { assignProperty } from "../../internal/record.ts"
import * as SchemaAST from "../../SchemaAST.ts"

/** @internal */
export type FlatParams = { readonly [key: string]: string | ReadonlyArray<string> }

/**
 * Collects the top-level property names of a schema's encoded side, and
 * whether it has an index signature, through unions and suspensions.
 *
 * @internal
 */
export function getTopLevelKeys(ast: SchemaAST.AST): {
  readonly names: ReadonlySet<string>
  readonly hasIndexSignature: boolean
} {
  const names = new Set<string>()
  let hasIndexSignature = false
  const seen = new Set<SchemaAST.AST>()
  const go = (ast: SchemaAST.AST): void => {
    if (seen.has(ast)) return
    seen.add(ast)
    switch (ast._tag) {
      case "Objects":
        for (const ps of ast.propertySignatures) {
          if (typeof ps.name === "string") names.add(ps.name)
        }
        if (ast.indexSignatures.length > 0) hasIndexSignature = true
        return
      case "Union":
        return ast.types.forEach(go)
      case "Suspend":
        return go(ast.thunk())
    }
  }
  go(SchemaAST.toEncoded(ast))
  return { names, hasIndexSignature }
}

/**
 * Collects the key schemas of a schema's top-level index signatures on its
 * decoded side, through unions and suspensions. Returns `undefined` when a
 * transformation hides which decoded keys came from which encoded ones.
 *
 * @internal
 */
export function getIndexSignatureKeys(ast: SchemaAST.AST): ReadonlyArray<SchemaAST.AST> | undefined {
  const keys: Array<SchemaAST.AST> = []
  const seen = new Set<SchemaAST.AST>()
  const go = (ast: SchemaAST.AST): boolean => {
    if (seen.has(ast)) return true
    seen.add(ast)
    if (ast.encoding !== undefined) return false
    switch (ast._tag) {
      case "Objects":
        for (const is of ast.indexSignatures) keys.push(is.parameter)
        return true
      case "Union":
        return ast.types.every(go)
      case "Suspend":
        return go(ast.thunk())
    }
    return true
  }
  return go(ast) ? keys : undefined
}

const bracketKey = /^([^[\]]+)((?:\[[^[\]]+\])+)$/

/**
 * Rebuilds the `a[b][c]` keys `UrlParams.fromInput` writes for nested objects.
 *
 * Only keys whose base is one of `names` are rebuilt, and keys listed in
 * `names` are kept as is, so literal bracket keys keep decoding. A key that
 * conflicts with a shorter one, such as `a[b]` next to `a`, stays flat.
 * Returns the rebuilt record with the flat keys it consumed, or `undefined`
 * when no key was rebuilt.
 *
 * @internal
 */
export function fromFlatParams(
  params: FlatParams,
  names: ReadonlySet<string>
): { readonly tree: Record<string, unknown>; readonly rebuiltKeys: ReadonlyArray<string> } | undefined {
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
  const rebuiltKeys: Array<string> = []
  for (const { key, path } of nested) {
    if (setPath(out, path, params[key])) {
      rebuiltKeys.push(key)
    } else {
      assignProperty(out, key, params[key])
    }
  }
  return rebuiltKeys.length > 0 ? { tree: out, rebuiltKeys } : undefined
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
