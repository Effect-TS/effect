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
 * rebuilds the keys of its required object fields, and those of its optional
 * object fields and object-valued index entries when no index signature could
 * take any of their keys as a string. Every other key reaches the schema flat,
 * as before, so union members keep their own interpretation and flat keys an
 * index signature may accept keep decoding.
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
  const indexes = ast.indexSignatures.map((is) => ({
    matches: Schema.is(Schema.make(SchemaAST.toEncoded(is.parameter))),
    object: canBeObject(is.type),
    string: canBeString(is.type)
  }))
  const declared = new Set<string>()
  const required = new Set<string>()
  const optional = new Set<string>()
  for (const ps of ast.propertySignatures) {
    if (typeof ps.name !== "string") continue
    declared.add(ps.name)
    if (!canBeObject(ps.type)) continue
    if (!SchemaAST.isOptional(ps.type)) required.add(ps.name)
    else optional.add(ps.name)
  }
  if (required.size === 0 && optional.size === 0 && !indexes.some((i) => i.object && !i.string)) return ast
  // A key an index signature could take as a string may be a flat entry
  const isFlatKey = (key: string) => indexes.some((i) => i.string && i.matches(key))
  // An undeclared base only an object can satisfy is an object-valued entry
  const isObjectEntry = (base: string) => indexes.some((i) => i.object && !i.string && i.matches(base))
  // A required object has no flat interpretation, so its keys are always
  // rebuilt. Otherwise a base is rebuilt only when none of its keys may be a
  // flat entry or is declared, and all of its keys stay flat, as before, when
  // one is.
  const isNestable = (base: string, keys: ReadonlyArray<string>, hasDeclaredKey: boolean) =>
    required.has(base) ||
    ((optional.has(base) || (!declared.has(base) && isObjectEntry(base))) && !hasDeclaredKey &&
      !keys.some(isFlatKey))
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

// Whether the encoded side of a field can be a string
function canBeString(field: SchemaAST.AST, seen = new Set<SchemaAST.AST>()): boolean {
  const ast = SchemaAST.getLastEncoding(field)
  if (seen.has(ast)) return false
  seen.add(ast)
  switch (ast._tag) {
    case "String":
    case "TemplateLiteral":
    case "Unknown":
    case "Any":
      return true
    case "Objects":
      // An object schema with no properties or index signatures accepts any
      // non-nullish value
      return ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0
    case "Literal":
      return typeof ast.literal === "string"
    case "Enum":
      return ast.enums.some(([, value]) => typeof value === "string")
    case "Declaration":
      return ast.run === stringTree.run
    case "Union":
      return ast.types.some((type) => canBeString(type, seen))
    case "Suspend":
      return canBeString(ast.thunk(), seen)
  }
  return false
}

const bracketKey = /^([^[\]]+)((?:\[[^[\]]+\])+)$/

/**
 * Rebuilds the `a[b][c]` keys of each base `isNestable` accepts, given all of
 * that base's keys and whether one of its keys is declared. Keys listed in
 * `declared` are kept as is, so literal bracket keys keep decoding. A key that conflicts with a shorter one, such as
 * `a[b]` next to `a`, stays flat.
 */
function fromFlatParams(
  params: FlatParams,
  declared: ReadonlySet<string>,
  isNestable: (base: string, keys: ReadonlyArray<string>, hasDeclaredKey: boolean) => boolean
): Record<string, unknown> {
  type Entry = { readonly key: string; readonly path: ReadonlyArray<string> }
  const out: Record<string, unknown> = {}
  const byBase = new Map<string, Array<Entry>>()
  // Bases with a declared bracket key in the input, which stays flat
  const flatBases = new Set<string>()
  for (const key of Object.keys(params)) {
    const match = bracketKey.exec(key)
    if (match === null || declared.has(key)) {
      assignProperty(out, key, params[key])
      if (match !== null) flatBases.add(match[1])
      continue
    }
    const entries = byBase.get(match[1])
    const entry = { key, path: [match[1], ...match[2].slice(1, -1).split("][")] }
    if (entries === undefined) byBase.set(match[1], [entry])
    else entries.push(entry)
  }
  const nested: Array<Entry> = []
  for (const [base, entries] of byBase) {
    if (isNestable(base, entries.map((entry) => entry.key), flatBases.has(base))) {
      nested.push(...entries)
    } else {
      for (const { key } of entries) assignProperty(out, key, params[key])
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
