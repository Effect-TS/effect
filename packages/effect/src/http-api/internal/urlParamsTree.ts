import { identity } from "../../Function.ts"
import { assignProperty } from "../../internal/record.ts"
import { isObject } from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"

type FlatParams = { readonly [key: string]: unknown }

/**
 * Rebuilds the `a[b][c]` keys `UrlParams.fromInput` writes for nested objects
 * inside a URL parameters codec.
 *
 * Each object on the codec's encoded side, through unions and suspensions,
 * rebuilds only its own fields that can decode an object. Keys of an optional
 * field that an index signature accepts, by field name or wire key, reach the
 * schema flat, as before, as does every other key. So union members keep
 * their own interpretation and flat keys an index signature accepts keep
 * decoding.
 *
 * @internal
 */
export function toCodecUrlParams<S extends Schema.Top>(schema: S): S {
  return schema.rebuild(rebuildAST(schema.ast)) as S
}

const rebuildAST: (ast: SchemaAST.AST) => SchemaAST.AST = SchemaAST.applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  switch (ast._tag) {
    case "Union":
    case "Suspend":
      return ast.recur(rebuildAST)
    case "Objects":
      return rebuildObjects(ast)
  }
  return ast
})

function rebuildObjects(ast: SchemaAST.Objects): SchemaAST.AST {
  const isIndexKey = makeIsIndexKey(ast)
  const declared = new Set<string>()
  const required = new Set<string>()
  const optional = new Set<string>()
  for (const ps of ast.propertySignatures) {
    if (typeof ps.name !== "string") continue
    declared.add(ps.name)
    if (!canBeObject(ps.type)) continue
    if (!SchemaAST.isOptional(ps.type)) required.add(ps.name)
    else if (!isIndexKey(ps.name)) optional.add(ps.name)
  }
  if (required.size === 0 && optional.size === 0) return ast
  // A required object has no flat interpretation, so its keys are always
  // rebuilt. An optional one leaves any key an index signature accepts flat,
  // as it was before nested objects were rebuilt.
  const isNestable = (base: string, key: string) => required.has(base) || (optional.has(base) && !isIndexKey(key))
  // The flat input keeps the wire literals of the required literal fields, so
  // unions still select members by them before any rebuilding
  const discriminators: Array<SchemaAST.PropertySignature> = []
  for (const ps of ast.propertySignatures) {
    const literal = SchemaAST.isOptional(ps.type) ? undefined : getWireLiteral(ps.type)
    if (literal !== undefined) discriminators.push(new SchemaAST.PropertySignature(ps.name, literal))
  }
  const flat = new SchemaAST.Objects(discriminators, [
    new SchemaAST.IndexSignature(SchemaAST.string, SchemaAST.unknown)
  ])
  return SchemaAST.decodeTo(
    flat,
    ast,
    SchemaTransformation.transform<unknown, unknown>({
      decode: (input) => isObject(input) ? fromFlatParams(input, declared, isNestable) : input,
      encode: identity
    })
  )
}

// The literal a field decodes from, following its encodings as union member
// selection does
function getWireLiteral(field: SchemaAST.AST): SchemaAST.AST | undefined {
  let ast = field
  while (ast.encoding !== undefined) {
    if (
      ast.encoding.some((link) => link.transformation._tag === "Middleware" && link.transformation.decode !== identity)
    ) return undefined
    ast = ast.encoding[ast.encoding.length - 1].to
  }
  return SchemaAST.isLiteral(ast) || SchemaAST.isUniqueSymbol(ast)
    ? SchemaAST.replaceContext(ast, undefined)
    : undefined
}

const stringTree = SchemaAST.unknownToStringTree.to as SchemaAST.Declaration

// Whether the encoded side of a field can be an object
function canBeObject(field: SchemaAST.AST, seen = new Set<SchemaAST.AST>()): boolean {
  const ast = SchemaAST.getLastEncoding(field)
  if (seen.has(ast)) return false
  seen.add(ast)
  switch (ast._tag) {
    case "Objects":
    case "ObjectKeyword":
    case "Unknown":
    case "Any":
      return true
    case "Declaration":
      // The string tree `Unknown` and `ObjectKeyword` fields encode to
      return ast.run === stringTree.run
    case "Union":
      return ast.types.some((type) => canBeObject(type, seen))
    case "Suspend":
      return canBeObject(ast.thunk(), seen)
  }
  return false
}

function makeIsIndexKey(ast: SchemaAST.Objects): (key: string) => boolean {
  const matchers = ast.indexSignatures.map((is) => Schema.is(Schema.make(SchemaAST.toEncoded(is.parameter))))
  return (key) => matchers.some((matches) => matches(key))
}

const bracketKey = /^([^[\]]+)((?:\[[^[\]]+\])+)$/

/**
 * Rebuilds the `a[b][c]` keys `isNestable` accepts for their base. Keys listed in
 * `declared` are kept as is, so literal bracket keys keep decoding. A key that
 * conflicts with a shorter one, such as `a[b]` next to `a`, stays flat.
 */
function fromFlatParams(
  params: FlatParams,
  declared: ReadonlySet<string>,
  isNestable: (base: string, key: string) => boolean
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const nested: Array<{ readonly key: string; readonly path: ReadonlyArray<string> }> = []
  for (const key of Object.keys(params)) {
    const match = declared.has(key) ? null : bracketKey.exec(key)
    if (match !== null && isNestable(match[1], key)) {
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
