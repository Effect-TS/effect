import type * as SchemaRepresentation from "effect/SchemaRepresentation"

type Representation = SchemaRepresentation.Representation

/** @internal */
export type StringFormats = "encoded" | "decoded"

/** @internal */
export interface SchemaDocument {
  readonly schemas: Readonly<Record<string, Representation>>
  readonly references: SchemaRepresentation.References
}

interface FormatCodec {
  readonly runtime: string
  readonly Type: string
  readonly importDeclarations: ReadonlyArray<string>
}

const bigIntFormat = (minimum: string, maximum: string): FormatCodec => ({
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
  ["int64", bigIntFormat("-9223372036854775808", "9223372036854775807")],
  ["uint64", bigIntFormat("0", "18446744073709551615")]
])

const getFormatCodec = (representation: Representation): FormatCodec | undefined => {
  if (representation._tag === "Reference") return undefined
  const format = representation.annotations?.format
  return typeof format === "string" ? formatCodecs.get(format) : undefined
}

const isStringLiteral = (representation: Representation): boolean =>
  representation._tag === "Literal" && typeof representation.literal === "string"

const isStringOnly = (representation: Representation): boolean =>
  representation._tag === "String" || isStringLiteral(representation)

const isUniqueCheck = (check: SchemaRepresentation.Check): boolean =>
  check._tag === "Filter"
    ? check.representation?.id === "effect/schema/isUnique"
    : check.checks.some(isUniqueCheck)

const valueChildren = (representation: Representation): ReadonlyArray<Representation> => {
  switch (representation._tag) {
    case "Declaration":
      return representation.typeParameters
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

const checkSchemas = (check: SchemaRepresentation.Check): ReadonlyArray<Representation> => {
  const own = check.representation?.schemas ?? []
  return check._tag === "FilterGroup" ? [...own, ...check.checks.flatMap(checkSchemas)] : own
}

const allChildren = (representation: Representation): ReadonlyArray<Representation> => {
  if (representation._tag === "Reference") return []
  const fromChecks = representation.checks.flatMap(checkSchemas)
  switch (representation._tag) {
    case "Suspend":
      return [representation.thunk]
    case "String":
      return representation.content?.schema === undefined
        ? fromChecks
        : [representation.content.schema, ...fromChecks]
    case "TemplateLiteral":
      return [...representation.parts, ...fromChecks]
    case "Objects":
      return [
        ...valueChildren(representation),
        ...representation.indexSignatures.map((signature) => signature.parameter),
        ...fromChecks
      ]
    default:
      return [...valueChildren(representation), ...fromChecks]
  }
}

const collectReferences = (representation: Representation, into: Set<string>): void => {
  if (representation._tag === "Reference") {
    into.add(representation.$ref)
    return
  }
  for (const child of allChildren(representation)) {
    collectReferences(child, into)
  }
}

// Core Schema codegen types `Schema.suspend` as `Schema.Codec<T>`, which requires
// decoded and encoded types to match. Definitions targeted by a suspend keep wire types.
const findSuspendedDefinitions = (document: SchemaDocument): ReadonlySet<string> => {
  const suspended = new Set<string>()
  const visit = (representation: Representation): void => {
    if (representation._tag === "Suspend") {
      collectReferences(representation.thunk, suspended)
    }
    for (const child of allChildren(representation)) {
      visit(child)
    }
  }
  for (const schema of Object.values(document.references)) visit(schema)
  for (const schema of Object.values(document.schemas)) visit(schema)
  return suspended
}

const makeDecodes = (decoding: ReadonlySet<string>) => {
  const decodes = (representation: Representation, inherited?: FormatCodec): boolean => {
    switch (representation._tag) {
      case "Reference":
        return decoding.has(representation.$ref)
      case "Suspend":
        return false
      case "String":
        return (getFormatCodec(representation) ?? inherited) !== undefined
      case "Literal":
        return typeof representation.literal === "string" &&
          (getFormatCodec(representation) ?? inherited) !== undefined
      case "Union": {
        const codec = getFormatCodec(representation) ?? inherited
        return representation.types.some((type) => decodes(type, codec))
      }
      default:
        return valueChildren(representation).some((child) => decodes(child))
    }
  }
  return decodes
}

const findDecodingDefinitions = (
  document: SchemaDocument,
  suspended: ReadonlySet<string>
): ReadonlySet<string> => {
  const decoding = new Set<string>()
  const decodes = makeDecodes(decoding)
  let changed = true
  while (changed) {
    changed = false
    for (const [$ref, definition] of Object.entries(document.references)) {
      if (suspended.has($ref) || decoding.has($ref) || !decodes(definition)) continue
      decoding.add($ref)
      changed = true
    }
  }
  return decoding
}

const wrapDecodeTo = (wire: Representation, codec: FormatCodec): SchemaRepresentation.Declaration => ({
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
})

const wrapWireThenDecode = (
  wire: Representation,
  decoded: Representation
): SchemaRepresentation.Declaration => ({
  _tag: "Declaration",
  typeParameters: [wire, decoded],
  checks: [],
  annotations: {
    toCode: ({ typeParameters: [wireCode, decodedCode] }: SchemaRepresentation.Generation.DeclarationInput) => ({
      runtime: `${wireCode.runtime}.pipe(Schema.decodeTo(${decodedCode.runtime}))`,
      Type: decodedCode.Type
    })
  }
})

const wrapToEncoded = (reference: SchemaRepresentation.Reference): SchemaRepresentation.Declaration => ({
  _tag: "Declaration",
  typeParameters: [reference],
  checks: [],
  annotations: {
    toCode: ({ typeParameters: [schema] }: SchemaRepresentation.Generation.DeclarationInput) => ({
      runtime: `Schema.toEncoded(${schema.runtime})`,
      Type: `typeof ${schema.runtime}.Encoded`
    })
  }
})

/** @internal */
export function decodeStringFormats(document: SchemaDocument): SchemaDocument {
  const suspended = findSuspendedDefinitions(document)
  const decoding = findDecodingDefinitions(document, suspended)
  const decodes = makeDecodes(decoding)

  const rewriteCheck = (check: SchemaRepresentation.Check): SchemaRepresentation.Check => {
    const representation = check.representation?.schemas === undefined
      ? check.representation
      : { ...check.representation, schemas: check.representation.schemas.map(rewriteWire) }
    if (check._tag === "Filter") return { ...check, representation }
    const [head, ...tail] = check.checks
    return { ...check, representation, checks: [rewriteCheck(head), ...tail.map(rewriteCheck)] }
  }

  const rewriteWire = (representation: Representation): Representation => {
    if (representation._tag === "Reference") {
      return decoding.has(representation.$ref) ? wrapToEncoded(representation) : representation
    }
    const checks = representation.checks.map(rewriteCheck)
    switch (representation._tag) {
      case "Declaration":
        return { ...representation, checks, typeParameters: representation.typeParameters.map(rewriteWire) }
      case "Suspend":
        return { ...representation, thunk: rewriteWire(representation.thunk) }
      case "String":
        return representation.content?.schema === undefined
          ? { ...representation, checks }
          : {
            ...representation,
            checks,
            content: { ...representation.content, schema: rewriteWire(representation.content.schema) }
          }
      case "TemplateLiteral":
        return { ...representation, checks, parts: representation.parts.map(rewriteWire) }
      case "Arrays":
        return {
          ...representation,
          checks,
          elements: representation.elements.map((element) => ({ ...element, type: rewriteWire(element.type) })),
          rest: representation.rest.map(rewriteWire)
        }
      case "Objects":
        return {
          ...representation,
          checks,
          propertySignatures: representation.propertySignatures.map((property) => ({
            ...property,
            type: rewriteWire(property.type)
          })),
          indexSignatures: representation.indexSignatures.map((signature) => ({
            parameter: rewriteWire(signature.parameter),
            type: rewriteWire(signature.type)
          }))
        }
      case "Union":
        return { ...representation, checks, types: representation.types.map(rewriteWire) }
      default:
        return { ...representation, checks }
    }
  }

  const rewriteValue = (
    representation: Representation,
    path: string,
    inherited?: FormatCodec
  ): Representation => {
    if (representation._tag === "Reference") return representation
    const codec = getFormatCodec(representation) ?? inherited
    if (codec !== undefined && isStringOnly(representation)) {
      return wrapDecodeTo(rewriteWire(representation), codec)
    }
    const checks = representation.checks.map(rewriteCheck)
    switch (representation._tag) {
      case "Declaration":
        return {
          ...representation,
          checks,
          typeParameters: representation.typeParameters.map((type, index) => rewriteValue(type, `${path}/${index}`))
        }
      case "Suspend":
        return { ...representation, thunk: rewriteWire(representation.thunk) }
      case "TemplateLiteral":
        return rewriteWire(representation)
      case "Arrays": {
        const elements = representation.elements.map((element, index) => ({
          ...element,
          type: rewriteValue(element.type, `${path}/${index}`)
        }))
        const rest = representation.rest.map((item, index) => rewriteValue(item, `${path}/rest/${index}`))
        const hasUnique = representation.checks.some(isUniqueCheck)
        if (hasUnique && valueChildren(representation).some((child) => decodes(child))) {
          const uniqueChecks = representation.checks.filter(isUniqueCheck).map(rewriteCheck)
          const otherChecks = representation.checks.filter((check) => !isUniqueCheck(check)).map(rewriteCheck)
          const wireArray = rewriteWire({
            ...representation,
            annotations: undefined,
            checks: uniqueChecks
          })
          const decodedArray: SchemaRepresentation.Arrays = {
            ...representation,
            checks: otherChecks,
            elements,
            rest
          }
          return wrapWireThenDecode(wireArray, decodedArray)
        }
        return { ...representation, checks, elements, rest }
      }
      case "Objects": {
        if (
          representation.propertySignatures.length > 0 &&
          representation.indexSignatures.length > 0 &&
          (
            representation.propertySignatures.some((property) => decodes(property.type)) ||
            representation.indexSignatures.some((signature) => decodes(signature.type))
          )
        ) {
          throw new Error(
            `Cannot decode string formats at ${path}: objects combining named properties and additional properties ` +
              "cannot decode formatted strings"
          )
        }
        return {
          ...representation,
          checks,
          propertySignatures: representation.propertySignatures.map((property) => ({
            ...property,
            type: rewriteValue(property.type, `${path}/${String(property.name)}`)
          })),
          indexSignatures: representation.indexSignatures.map((signature) => ({
            parameter: rewriteWire(signature.parameter),
            type: rewriteValue(signature.type, `${path}/*`)
          }))
        }
      }
      case "Union": {
        if (
          codec !== undefined &&
          representation.types.length > 0 &&
          representation.types.every(isStringOnly)
        ) {
          return wrapDecodeTo(rewriteWire(representation), codec)
        }
        return {
          ...representation,
          checks,
          types: representation.types.map((type, index) => rewriteValue(type, `${path}/${index}`, codec))
        }
      }
      default:
        return { ...representation, checks }
    }
  }

  return {
    schemas: Object.fromEntries(
      Object.entries(document.schemas).map(([name, schema]) => [name, rewriteValue(schema, name)])
    ),
    references: Object.fromEntries(
      Object.entries(document.references).map(([$ref, schema]) => [
        $ref,
        suspended.has($ref) ? rewriteWire(schema) : rewriteValue(schema, $ref)
      ])
    )
  }
}
