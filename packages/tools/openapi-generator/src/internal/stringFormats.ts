import type * as SchemaRepresentation from "effect/SchemaRepresentation"

type Representation = SchemaRepresentation.Representation

/** Whether formatted strings keep their wire type or decode to Effect values. */
export type StringFormats = "encoded" | "decoded"

/** Named schemas and the component definitions they reference. */
export interface SchemaDocument {
  readonly schemas: Readonly<Record<string, Representation>>
  readonly references: SchemaRepresentation.References
}

interface FormatCodec {
  readonly runtime: string
  readonly Type: string
  readonly importDeclarations: ReadonlyArray<string>
}

const bigIntCodec = (minimum: string, maximum: string): FormatCodec => ({
  runtime:
    `Schema.BigIntFromString.check(Schema.isBetweenBigInt({ minimum: globalThis.BigInt("${minimum}"), maximum: globalThis.BigInt("${maximum}") }))`,
  Type: "bigint",
  importDeclarations: []
})

const formatCodecs: ReadonlyMap<string, FormatCodec> = new Map([
  ["date-time", {
    runtime: "Schema.DateTimeUtcFromString",
    Type: "DateTime.Utc",
    importDeclarations: [`import type * as DateTime from "effect/DateTime"`]
  }],
  ["int64", bigIntCodec("-9223372036854775808", "9223372036854775807")],
  ["uint64", bigIntCodec("0", "18446744073709551615")]
])

function formatCodec(representation: Representation): FormatCodec | undefined {
  if (representation._tag !== "String") return undefined
  const format = representation.annotations?.format
  return typeof format === "string" ? formatCodecs.get(format) : undefined
}

/**
 * Children whose decoded values are part of the parent's decoded value. Check schemas, template literal parts
 * and record keys describe wire text, so they are not listed.
 */
function valueChildren(representation: Representation): ReadonlyArray<Representation> {
  switch (representation._tag) {
    case "Declaration":
      return representation.typeParameters
    case "Suspend":
      return [representation.thunk]
    case "Arrays":
      return [...representation.elements.map((element) => element.type), ...representation.rest]
    case "Objects":
      return [
        ...representation.propertySignatures.map((property) => property.type),
        ...representation.indexSignatures.map((signature) => signature.type)
      ]
    case "Union":
      return representation.types
    default:
      return []
  }
}

/** Every child, including the wire-only ones `valueChildren` leaves out. */
function allChildren(representation: Representation): ReadonlyArray<Representation> {
  if (representation._tag === "Reference") return []
  const checkSchemas = representation.checks.flatMap(checkRepresentations)
  switch (representation._tag) {
    case "TemplateLiteral":
      return [...representation.parts, ...checkSchemas]
    case "Objects":
      return [
        ...valueChildren(representation),
        ...representation.indexSignatures.map((signature) => signature.parameter),
        ...checkSchemas
      ]
    default:
      return [...valueChildren(representation), ...checkSchemas]
  }
}

function checkRepresentations(check: SchemaRepresentation.Check): ReadonlyArray<Representation> {
  const own = check.representation?.schemas ?? []
  return check._tag === "FilterGroup" ? [...own, ...check.checks.flatMap(checkRepresentations)] : own
}

function collectReferences(representation: Representation, into: Set<string>): void {
  if (representation._tag === "Reference") into.add(representation.$ref)
  for (const child of allChildren(representation)) collectReferences(child, into)
}

/**
 * Definitions referenced from a suspended schema. Core codegen annotates those references as `Schema.Codec<T>`,
 * which requires matching decoded and encoded types, so these definitions keep their wire types.
 */
function suspendedDefinitions(document: SchemaDocument): ReadonlySet<string> {
  const suspended = new Set<string>()
  const findSuspends = (representation: Representation): void => {
    if (representation._tag === "Suspend") collectReferences(representation.thunk, suspended)
    allChildren(representation).forEach(findSuspends)
  }
  Object.values(document.references).forEach(findSuspends)
  Object.values(document.schemas).forEach(findSuspends)
  return suspended
}

/** Whether a representation's decoded type differs from its wire type, given the definitions that do. */
const makeDecodes = (decoding: ReadonlySet<string>) => {
  const decodes = (representation: Representation): boolean =>
    representation._tag === "Reference"
      ? decoding.has(representation.$ref)
      : formatCodec(representation) !== undefined || valueChildren(representation).some(decodes)
  return decodes
}

/** Definitions whose decoded type differs from their wire type once formatted strings decode. */
function decodingDefinitions(document: SchemaDocument, suspended: ReadonlySet<string>): ReadonlySet<string> {
  const decoding = new Set<string>()
  const decodes = makeDecodes(decoding)
  for (let changed = true; changed;) {
    changed = false
    for (const [$ref, definition] of Object.entries(document.references)) {
      if (suspended.has($ref) || decoding.has($ref) || !decodes(definition)) continue
      decoding.add($ref)
      changed = true
    }
  }
  return decoding
}

/**
 * Rewrites strings with a `date-time`, `int64` or `uint64` format so they decode to `DateTime.Utc` or `bigint`
 * after their wire checks.
 *
 * **Details**
 *
 * Each formatted string becomes a declaration whose code pipes the wire schema into the format's codec. Checks
 * on its parents run on decoded values. Check schemas, template literal parts and record keys stay on the wire:
 * references there to decoding definitions are rendered as `Schema.toEncoded`. Definitions referenced from a
 * suspended schema keep their wire types in the same way.
 *
 * Objects that combine named properties with index signatures are refused when a named property decodes,
 * because the index signatures would also check that property's decoded value.
 */
export function decodeStringFormats(document: SchemaDocument): SchemaDocument {
  const suspended = suspendedDefinitions(document)
  const decoding = decodingDefinitions(document, suspended)
  const decodes = makeDecodes(decoding)

  const value = (representation: Representation, path: string): Representation => {
    if (representation._tag === "Reference") return representation
    const codec = formatCodec(representation)
    if (codec !== undefined) return decodeTo(wire(representation), codec)
    const checks = representation.checks.map(wireCheck)
    switch (representation._tag) {
      case "Declaration":
        return {
          ...representation,
          checks,
          typeParameters: representation.typeParameters.map((type, index) => value(type, `${path}/${index}`))
        }
      case "Suspend":
        return { ...representation, thunk: value(representation.thunk, path) }
      case "Arrays":
        return {
          ...representation,
          checks,
          elements: representation.elements.map((element, index) => ({
            ...element,
            type: value(element.type, `${path}/${index}`)
          })),
          rest: representation.rest.map((item, index) => value(item, `${path}/rest/${index}`))
        }
      case "Objects": {
        if (
          representation.indexSignatures.length > 0 &&
          representation.propertySignatures.some((property) => decodes(property.type))
        ) {
          throw new Error(
            `Cannot decode string formats at ${path}: an object with named properties and index signatures would ` +
              "check the decoded properties against its index signatures"
          )
        }
        return {
          ...representation,
          checks,
          propertySignatures: representation.propertySignatures.map((property) => ({
            ...property,
            type: value(property.type, `${path}/${String(property.name)}`)
          })),
          indexSignatures: representation.indexSignatures.map((signature) => ({
            parameter: wire(signature.parameter),
            type: value(signature.type, `${path}/*`)
          }))
        }
      }
      case "Union":
        return {
          ...representation,
          checks,
          types: representation.types.map((type, index) => value(type, `${path}/${index}`))
        }
      case "TemplateLiteral":
        return wire(representation)
      default:
        return { ...representation, checks }
    }
  }

  const wire = (representation: Representation): Representation => {
    if (representation._tag === "Reference") {
      return decoding.has(representation.$ref) ? toEncoded(representation) : representation
    }
    const checks = representation.checks.map(wireCheck)
    switch (representation._tag) {
      case "Declaration":
        return { ...representation, checks, typeParameters: representation.typeParameters.map(wire) }
      case "Suspend":
        return { ...representation, thunk: wire(representation.thunk) }
      case "TemplateLiteral":
        return { ...representation, checks, parts: representation.parts.map(wire) }
      case "Arrays":
        return {
          ...representation,
          checks,
          elements: representation.elements.map((element) => ({ ...element, type: wire(element.type) })),
          rest: representation.rest.map(wire)
        }
      case "Objects":
        return {
          ...representation,
          checks,
          propertySignatures: representation.propertySignatures.map((property) => ({
            ...property,
            type: wire(property.type)
          })),
          indexSignatures: representation.indexSignatures.map((signature) => ({
            parameter: wire(signature.parameter),
            type: wire(signature.type)
          }))
        }
      case "Union":
        return { ...representation, checks, types: representation.types.map(wire) }
      default:
        return { ...representation, checks }
    }
  }

  const wireCheck = (check: SchemaRepresentation.Check): SchemaRepresentation.Check => {
    const representation = check.representation?.schemas === undefined ? check.representation : {
      ...check.representation,
      schemas: check.representation.schemas.map(wire)
    }
    if (check._tag === "Filter") return { ...check, representation }
    const [first, ...rest] = check.checks
    return { ...check, representation, checks: [wireCheck(first), ...rest.map(wireCheck)] }
  }

  const definition = (representation: Representation, $ref: string): Representation =>
    suspended.has($ref) ? wire(representation) : value(representation, $ref)

  return {
    schemas: Object.fromEntries(
      Object.entries(document.schemas).map(([name, schema]) => [name, value(schema, name)])
    ),
    references: Object.fromEntries(
      Object.entries(document.references).map(([$ref, schema]) => [$ref, definition(schema, $ref)])
    )
  }
}

function decodeTo(wire: Representation, codec: FormatCodec): SchemaRepresentation.Declaration {
  return {
    _tag: "Declaration",
    typeParameters: [wire],
    checks: [],
    annotations: {
      toCode: ({ typeParameters: [schema] }: SchemaRepresentation.Generation.DeclarationInput) => ({
        runtime: `${schema.runtime}.pipe(Schema.decodeTo(${codec.runtime}))`,
        Type: codec.Type,
        importDeclarations: codec.importDeclarations
      })
    }
  }
}

function toEncoded(reference: SchemaRepresentation.Reference): SchemaRepresentation.Declaration {
  return {
    _tag: "Declaration",
    typeParameters: [reference],
    checks: [],
    annotations: {
      toCode: ({ typeParameters: [schema] }: SchemaRepresentation.Generation.DeclarationInput) => ({
        runtime: `Schema.toEncoded(${schema.runtime})`,
        Type: `typeof ${schema.runtime}.Encoded`
      })
    }
  }
}
