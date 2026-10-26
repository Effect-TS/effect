import { identity } from "../../Function.ts"
import { assignProperty } from "../../internal/record.ts"
import { isObject } from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"

/**
 * Rebuilds the `a[b][c]` keys `UrlParams.fromInput` writes for nested objects
 * inside a URL parameters codec.
 *
 * Each object on the codec's encoded side, through unions and suspensions,
 * always rebuilds the keys of its required object fields. It rebuilds those of
 * its optional object fields and object-valued index entries only when none of
 * them may also be a flat entry: a key the schema declares, or one an index
 * signature could take as a string. Every other key reaches the schema flat, as
 * before, so union members keep their own interpretation.
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

type KeyMatcher = (key: string) => boolean

function rebuildObjects(ast: SchemaAST.Objects): SchemaAST.AST {
  // Index signatures whose value may be a string, so a matching key may be a flat entry
  const flatKeys: Array<KeyMatcher> = []
  // Index signatures whose value must be an object, so a matching base is an object-valued entry
  const objectEntries: Array<KeyMatcher> = []
  for (const is of ast.indexSignatures) {
    const matches = Schema.is(Schema.make(SchemaAST.toEncoded(is.parameter)))
    if (canBeString(is.type)) flatKeys.push(matches)
    else if (canBeObject(is.type)) objectEntries.push(matches)
  }
  const declared = new Set<string>()
  const required = new Set<string>()
  const optional = new Set<string>()
  // The flat input keeps the wire literals of the required literal fields, so
  // unions still select members by them before any rebuilding
  const discriminators: Array<SchemaAST.PropertySignature> = []
  for (const ps of ast.propertySignatures) {
    const wireOptional = SchemaAST.isOptional(SchemaAST.toEncoded(ps.type))
    const literal = wireOptional ? undefined : getWireLiteral(ps.type)
    if (literal !== undefined) discriminators.push(new SchemaAST.PropertySignature(ps.name, literal))
    if (typeof ps.name !== "string") continue
    declared.add(ps.name)
    if (!canBeObject(ps.type)) continue
    if (wireOptional) optional.add(ps.name)
    else required.add(ps.name)
  }
  if (required.size === 0 && optional.size === 0 && objectEntries.length === 0) return ast
  const isFlatKey = (key: string) => declared.has(key) || flatKeys.some((matches) => matches(key))
  // A required object has no flat interpretation, so its keys are always
  // rebuilt. An optional object field, or an undeclared base only an object can
  // satisfy, is rebuilt unless one of its keys may be a flat entry, in which
  // case all of its keys stay flat, as before.
  const isNestable = (base: string, keys: ReadonlyArray<string>) =>
    required.has(base) ||
    ((optional.has(base) || (!declared.has(base) && objectEntries.some((matches) => matches(base)))) &&
      !keys.some(isFlatKey))
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

// The AST a field decodes from, following its encodings as union member
// selection does. A decoding middleware may accept any input.
function getWire(field: SchemaAST.AST): SchemaAST.AST {
  let ast = field
  while (ast.encoding !== undefined) {
    if (
      ast.encoding.some((link) => link.transformation._tag === "Middleware" && link.transformation.decode !== identity)
    ) return SchemaAST.unknown
    ast = ast.encoding[ast.encoding.length - 1].to
  }
  return ast
}

// The literal a field decodes from
function getWireLiteral(field: SchemaAST.AST): SchemaAST.AST | undefined {
  const ast = getWire(field)
  return SchemaAST.isLiteral(ast) || SchemaAST.isUniqueSymbol(ast)
    ? SchemaAST.replaceContext(ast, undefined)
    : undefined
}

// Whether the AST a field decodes from, through unions and suspensions, may be
// one `predicate` accepts
function wireSome(
  field: SchemaAST.AST,
  predicate: (ast: SchemaAST.AST) => boolean,
  seen = new Set<SchemaAST.AST>()
): boolean {
  const ast = getWire(field)
  if (seen.has(ast)) return false
  seen.add(ast)
  switch (ast._tag) {
    case "Union":
      return ast.types.some((type) => wireSome(type, predicate, seen))
    case "Suspend":
      return wireSome(ast.thunk(), predicate, seen)
  }
  return predicate(ast)
}

const stringTree = SchemaAST.unknownToStringTree.to as SchemaAST.Declaration

// Whether the encoded side of a field can be an object
function canBeObject(field: SchemaAST.AST): boolean {
  return wireSome(field, (ast) => {
    switch (ast._tag) {
      case "Objects":
      case "ObjectKeyword":
      case "Unknown":
      case "Any":
        return true
      case "Declaration":
        // The string tree `Unknown` and `ObjectKeyword` fields encode to
        return ast.run === stringTree.run
    }
    return false
  })
}

// Whether the encoded side of a field can be a string
function canBeString(field: SchemaAST.AST): boolean {
  return wireSome(field, (ast) => {
    switch (ast._tag) {
      case "String":
      case "TemplateLiteral":
      case "Unknown":
      case "Any":
      // An opaque declaration may accept strings
      case "Declaration":
        return true
      case "Objects":
        // An object schema with no properties or index signatures accepts any
        // non-nullish value
        return ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0
      case "Literal":
        return typeof ast.literal === "string"
      case "Enum":
        return ast.enums.some(([, value]) => typeof value === "string")
    }
    return false
  })
}

const bracketKey = /^([^[\]]+)((?:\[[^[\]]+\])+)$/

/**
 * Rebuilds the `a[b][c]` keys of each base `isNestable` accepts, given all of
 * that base's keys. Keys listed in `declared` are kept as is, so literal bracket
 * keys keep decoding. A key that conflicts with a shorter one, such as `a[b]`
 * next to `a`, stays flat.
 */
function fromFlatParams(
  params: Record<string, unknown>,
  declared: ReadonlySet<string>,
  isNestable: (base: string, keys: ReadonlyArray<string>) => boolean
): Record<string, unknown> {
  type Entry = { readonly key: string; readonly path: ReadonlyArray<string> }
  const out: Record<string, unknown> = {}
  const byBase = new Map<string, Array<Entry>>()
  for (const key of Object.keys(params)) {
    const match = bracketKey.exec(key)
    if (match === null) {
      assignProperty(out, key, params[key])
      continue
    }
    const [, base, segments] = match
    const entry = { key, path: [base, ...segments.slice(1, -1).split("][")] }
    const entries = byBase.get(base)
    if (entries === undefined) byBase.set(base, [entry])
    else entries.push(entry)
  }
  const nested: Array<Entry> = []
  for (const [base, entries] of byBase) {
    const rebuild = isNestable(base, entries.map((entry) => entry.key))
    for (const entry of entries) {
      if (rebuild && !declared.has(entry.key)) nested.push(entry)
      else assignProperty(out, entry.key, params[entry.key])
    }
  }
  // Shorter paths win, whatever order the keys arrived in
  nested.sort((a, b) => a.path.length - b.path.length)
  for (const { key, path } of nested) {
    if (!setPath(out, path, params[key])) assignProperty(out, key, params[key])
  }
  return out
}

function setPath(out: Record<string, unknown>, path: ReadonlyArray<string>, value: unknown): boolean {
  let node = out
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]
    if (!Object.hasOwn(node, segment)) assignProperty(node, segment, {})
    const child = node[segment]
    // Parameter values are strings or arrays, so any other object was built here
    if (!isObject(child)) return false
    node = child
  }
  const leaf = path[path.length - 1]
  if (Object.hasOwn(node, leaf)) return false
  assignProperty(node, leaf, value)
  return true
}
