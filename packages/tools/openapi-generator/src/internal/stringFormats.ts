import * as Arr from "effect/Array"
import { identity } from "effect/Function"
import * as Rec from "effect/Record"
import type * as Schema from "effect/Schema"
import * as SchemaRepresentation from "effect/SchemaRepresentation"

type Representation = SchemaRepresentation.Representation
type Node = Exclude<Representation, SchemaRepresentation.Reference>

/** @internal */
export interface SchemaDocument {
  readonly schemas: Readonly<Record<string, Representation>>
  readonly references: SchemaRepresentation.References
}

const declare = (
  typeParameters: ReadonlyArray<Representation>,
  toCode: (
    ...typeParameters: ReadonlyArray<SchemaRepresentation.Code>
  ) => SchemaRepresentation.Generation.DeclarationOutput,
  annotations?: Schema.Annotations.Annotations
): SchemaRepresentation.Declaration => ({
  _tag: "Declaration",
  typeParameters,
  checks: [],
  annotations: {
    ...annotations,
    toCode: (input: SchemaRepresentation.Generation.DeclarationInput) => toCode(...input.typeParameters)
  }
})

const bigIntCodec = (minimum: string, maximum: string): Representation =>
  declare([], () => ({
    runtime:
      `Schema.BigIntFromString.check(Schema.isBetweenBigInt({ minimum: globalThis.BigInt("${minimum}"), maximum: globalThis.BigInt("${maximum}") }))`,
    Type: "bigint"
  }))

const codecs: ReadonlyMap<string, Representation> = new Map([
  [
    "date-time",
    declare([], () => ({
      runtime: "Schema.DateTimeUtcFromString",
      Type: "DateTime.Utc",
      importDeclarations: [`import type * as DateTime from "effect/DateTime"`]
    }))
  ],
  ["int64", bigIntCodec("-9223372036854775808", "9223372036854775807")],
  ["uint64", bigIntCodec("0", "18446744073709551615")]
])

const codecOf = (representation: Representation): Representation | undefined => {
  const format = representation._tag === "Reference" ? undefined : representation.annotations?.format
  return typeof format === "string" ? codecs.get(format) : undefined
}

const decodeTo = (wire: Representation, decoded: Representation): Representation =>
  declare([wire, decoded], (from, to) => ({
    runtime: `${from.runtime}.pipe(Schema.decodeTo(${to.runtime}))`,
    Type: to.Type
  }))

const toEncoded = (reference: SchemaRepresentation.Reference): Representation =>
  declare([reference], (schema) => ({
    runtime: `Schema.toEncoded(${schema.runtime})`,
    Type: `typeof ${schema.runtime}.Encoded`
  }))

const annotate = (
  representation: Representation,
  annotations: Schema.Annotations.Annotations | undefined
): Representation =>
  annotations === undefined
    ? representation
    : representation._tag === "Reference"
    ? declare([representation], identity, annotations)
    : { ...representation, annotations: { ...annotations, ...representation.annotations } }

const isString = (representation: Representation): boolean =>
  representation._tag === "String" ||
  (representation._tag === "Literal" && typeof representation.literal === "string")

const isUniqueCheck = (check: SchemaRepresentation.Check): boolean =>
  check._tag === "Filter"
    ? check.representation?.id === SchemaRepresentation.isUniqueReviver.id
    : check.checks.some(isUniqueCheck)

// Maps the children of a node. Check schemas, record keys, template literal parts and suspended thunks
// are `wire` children: they describe wire text, never decoded values.
const mapChildren = (
  representation: Node,
  value: (child: Representation, segment: string | number) => Representation,
  wire: (child: Representation) => Representation
): Node => {
  const mapCheck = (check: SchemaRepresentation.Check): SchemaRepresentation.Check => {
    const representation = check.representation?.schemas === undefined
      ? check.representation
      : { ...check.representation, schemas: check.representation.schemas.map((schema) => wire(schema)) }
    return check._tag === "Filter"
      ? { ...check, representation }
      : { ...check, representation, checks: Arr.map(check.checks, mapCheck) }
  }
  const checks = representation.checks.map(mapCheck)
  switch (representation._tag) {
    case "Declaration":
      return { ...representation, checks, typeParameters: representation.typeParameters.map(value) }
    case "Suspend":
      return { ...representation, thunk: wire(representation.thunk) }
    case "TemplateLiteral":
      return { ...representation, checks, parts: representation.parts.map((part) => wire(part)) }
    case "Arrays":
      return {
        ...representation,
        checks,
        elements: representation.elements.map((element, index) => ({ ...element, type: value(element.type, index) })),
        rest: representation.rest.map((item, index) => value(item, `rest/${index}`))
      }
    case "Objects":
      return {
        ...representation,
        checks,
        propertySignatures: representation.propertySignatures.map((property) => ({
          ...property,
          type: value(property.type, String(property.name))
        })),
        indexSignatures: representation.indexSignatures.map((signature) => ({
          parameter: wire(signature.parameter),
          type: value(signature.type, "*")
        }))
      }
    case "Union":
      return { ...representation, checks, types: representation.types.map(value) }
    default:
      return { ...representation, checks }
  }
}

// Collects through `mapChildren`, which alone knows the shape of each node.
const children = (representation: Representation, only?: "values"): ReadonlyArray<Representation> => {
  const out: Array<Representation> = []
  const collect = (child: Representation) => {
    out.push(child)
    return child
  }
  if (representation._tag !== "Reference") {
    mapChildren(representation, collect, only === "values" ? identity : collect)
  }
  return out
}

const collectReferences = (representation: Representation, into = new Set<string>()): Set<string> => {
  if (representation._tag === "Reference") {
    into.add(representation.$ref)
  } else {
    for (const child of children(representation)) collectReferences(child, into)
  }
  return into
}

const findCyclicDefinitions = (references: SchemaRepresentation.References): ReadonlySet<string> => {
  const edges = new Map(
    Object.entries(references).map(([$ref, definition]) => [$ref, collectReferences(definition)])
  )
  const reaches = (from: string, target: string, seen: Set<string>): boolean => {
    for (const next of edges.get(from) ?? []) {
      if (next === target || (!seen.has(next) && reaches(next, target, seen.add(next)))) return true
    }
    return false
  }
  return new Set(Object.keys(references).filter(($ref) => reaches($ref, $ref, new Set())))
}

/** @internal */
export function decodeStringFormats(document: SchemaDocument): SchemaDocument {
  const cyclic = findCyclicDefinitions(document.references)

  // A `$ref` with sibling keywords is imported as a suspend carrying them. Unless the target is recursive,
  // the suspend is only an alias and is replaced by its target.
  const isAlias = (
    representation: SchemaRepresentation.Suspend
  ): representation is SchemaRepresentation.Suspend & { readonly thunk: SchemaRepresentation.Reference } =>
    representation.thunk._tag === "Reference" && !cyclic.has(representation.thunk.$ref)

  // Core Schema codegen types `Schema.suspend` as `Schema.Codec<T>`, which requires decoded and encoded
  // types to match. Definitions referenced from kept suspends keep wire types.
  const suspended = new Set<string>()
  const findSuspended = (representation: Representation): void => {
    if (representation._tag === "Suspend" && !isAlias(representation)) {
      collectReferences(representation.thunk, suspended)
    }
    children(representation).forEach(findSuspended)
  }
  Object.values(document.references).forEach(findSuspended)
  Object.values(document.schemas).forEach(findSuspended)

  // The target a use-site format can decode: a non-recursive definition, or the thunk of an alias.
  const targetOf = (representation: Representation): Representation | undefined => {
    if (representation._tag === "Suspend") return isAlias(representation) ? representation.thunk : undefined
    if (representation._tag !== "Reference") return undefined
    const $ref = representation.$ref
    return !suspended.has($ref) && !cyclic.has($ref) && Object.hasOwn(document.references, $ref)
      ? document.references[$ref]
      : undefined
  }

  const hasStrings = (quantifier: "some" | "every") => {
    const go = (representation: Representation): boolean => {
      if (isString(representation)) return true
      if (representation._tag === "Union") {
        return representation.types.length > 0 && representation.types[quantifier](go)
      }
      const target = targetOf(representation)
      return target !== undefined && go(target)
    }
    return go
  }
  const hasStringBranch = hasStrings("some")
  const isStringOnly = hasStrings("every")

  const formatOf = (representation: Representation): Representation | undefined => {
    const target = targetOf(representation)
    return codecOf(representation) ?? (target && formatOf(target))
  }

  const decoding = new Set<string>()
  const decodes = (representation: Representation, inherited?: Representation): boolean => {
    if (representation._tag === "Reference") {
      return decoding.has(representation.$ref) || (inherited !== undefined && hasStringBranch(representation))
    }
    const codec = codecOf(representation) ?? inherited
    switch (representation._tag) {
      case "Suspend":
        return isAlias(representation) && decodes(representation.thunk, codec)
      case "Union":
        return representation.types.some((type) => decodes(type, codec))
      default:
        return isString(representation)
          ? codec !== undefined
          : children(representation, "values").some((child) => decodes(child))
    }
  }

  let changed = true
  while (changed) {
    changed = false
    for (const [$ref, definition] of Object.entries(document.references)) {
      if (suspended.has($ref) || decoding.has($ref) || !decodes(definition)) continue
      decoding.add($ref)
      changed = true
    }
  }

  const rewriteWire = (representation: Representation): Representation => {
    if (representation._tag === "Reference") {
      return decoding.has(representation.$ref) ? toEncoded(representation) : representation
    }
    return representation._tag === "Suspend" && isAlias(representation)
      ? annotate(rewriteWire(representation.thunk), representation.annotations)
      : mapChildren(representation, rewriteWire, rewriteWire)
  }

  // `useSite` marks a format from a referencing use site, which takes precedence over
  // formats inside the inlined target.
  const rewriteValue = (
    representation: Representation,
    path: string,
    inherited?: Representation,
    useSite = false
  ): Representation => {
    if (representation._tag === "Reference") {
      const target = targetOf(representation)
      if (inherited === undefined || target === undefined || !hasStringBranch(target)) return representation
      if (isStringOnly(target)) {
        return formatOf(representation) === inherited
          ? representation
          : decodeTo(rewriteWire(representation), inherited)
      }
      // The target is inlined to keep its other branches. It is no longer the named definition, and the
      // use-site format replaces its own.
      if (target._tag === "Reference") return rewriteValue(target, path, inherited, true)
      const { format: _format, identifier: _identifier, ...annotations } = target.annotations ?? {}
      return rewriteValue({ ...target, annotations }, path, inherited, true)
    }
    const codec = useSite ? inherited : codecOf(representation) ?? inherited
    const isUnion = representation._tag === "Union"
    if (
      codec !== undefined &&
      (isString(representation) || (isUnion && representation.types.length > 0 && representation.types.every(isString)))
    ) {
      return decodeTo(rewriteWire(representation), codec)
    }
    switch (representation._tag) {
      case "Suspend":
        if (!isAlias(representation)) break
        return annotate(rewriteValue(representation.thunk, path, codec, useSite), representation.annotations)
      case "Arrays": {
        const unique = representation.checks.filter(isUniqueCheck)
        if (unique.length === 0 || !decodes(representation)) break
        // Distinct wire items can decode to equal values, so uniqueness is checked before decoding.
        return decodeTo(
          rewriteWire({ ...representation, annotations: undefined, checks: unique }),
          rewriteValue(
            { ...representation, checks: representation.checks.filter((check) => !isUniqueCheck(check)) },
            path
          )
        )
      }
      case "Objects":
        if (
          representation.propertySignatures.length > 0 &&
          representation.indexSignatures.length > 0 &&
          decodes(representation)
        ) {
          throw new Error(
            `Cannot decode string formats at ${path}: objects combining named properties and additional properties ` +
              "cannot decode formatted strings"
          )
        }
    }
    return mapChildren(
      representation,
      (child, segment) => rewriteValue(child, `${path}/${segment}`, isUnion ? codec : undefined, isUnion && useSite),
      rewriteWire
    )
  }

  return {
    schemas: Rec.map(document.schemas, (schema, name) => rewriteValue(schema, name)),
    references: Rec.map(
      document.references,
      (definition, $ref) => suspended.has($ref) ? rewriteWire(definition) : rewriteValue(definition, $ref)
    )
  }
}
