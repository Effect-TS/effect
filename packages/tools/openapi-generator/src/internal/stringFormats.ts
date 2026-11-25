import type * as Schema from "effect/Schema"
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

const findCyclicDefinitions = (references: SchemaRepresentation.References): ReadonlySet<string> => {
  const edges = new Map<string, ReadonlySet<string>>()
  for (const [$ref, definition] of Object.entries(references)) {
    const deps = new Set<string>()
    collectReferences(definition, deps)
    edges.set($ref, deps)
  }
  const cyclic = new Set<string>()
  for (const start of edges.keys()) {
    const visited = new Set<string>()
    const stack = [...(edges.get(start) ?? [])]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (current === start) {
        cyclic.add(start)
        break
      }
      if (visited.has(current)) continue
      visited.add(current)
      for (const next of edges.get(current) ?? []) {
        stack.push(next)
      }
    }
  }
  return cyclic
}

const isNonRecursiveRefSuspend = (
  representation: SchemaRepresentation.Suspend,
  cyclic: ReadonlySet<string>
): representation is SchemaRepresentation.Suspend & { readonly thunk: SchemaRepresentation.Reference } =>
  representation.thunk._tag === "Reference" && !cyclic.has(representation.thunk.$ref)

// Core Schema codegen types `Schema.suspend` as `Schema.Codec<T>`, which requires
// decoded and encoded types to match. Definitions targeted by kept suspends keep wire types.
const findSuspendedDefinitions = (
  document: SchemaDocument,
  cyclic: ReadonlySet<string>
): ReadonlySet<string> => {
  const suspended = new Set<string>()
  const visit = (representation: Representation): void => {
    if (representation._tag === "Suspend" && !isNonRecursiveRefSuspend(representation, cyclic)) {
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

const wrapDecodeTo = (
  wire: Representation,
  codec: FormatCodec
): SchemaRepresentation.Declaration => ({
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

const attachAnnotations = (
  target: Representation,
  annotations: Schema.Annotations.Annotations | undefined
): Representation => {
  if (annotations === undefined) return target
  if (target._tag === "Reference") {
    return {
      _tag: "Declaration",
      typeParameters: [target],
      checks: [],
      annotations: {
        ...annotations,
        toCode: ({ typeParameters: [schema] }: SchemaRepresentation.Generation.DeclarationInput) => ({
          runtime: schema.runtime,
          Type: schema.Type
        })
      }
    }
  }
  return {
    ...target,
    annotations: { ...annotations, ...target.annotations }
  }
}

// An inlined target is no longer the named definition, and the use-site format replaces its own.
const omitTargetAnnotations = (
  annotations: Schema.Annotations.Annotations | undefined
): Schema.Annotations.Annotations | undefined => {
  if (annotations === undefined) return undefined
  const { identifier: _identifier, format: _format, ...rest } = annotations
  return Object.keys(rest).length === 0 ? undefined : rest
}

/** @internal */
export function decodeStringFormats(document: SchemaDocument): SchemaDocument {
  const cyclic = findCyclicDefinitions(document.references)
  const suspended = findSuspendedDefinitions(document, cyclic)

  const isEligibleRef = ($ref: string): boolean =>
    !suspended.has($ref) && !cyclic.has($ref) && Object.hasOwn(document.references, $ref)

  const isStringOnlySchema = (representation: Representation): boolean => {
    if (isStringOnly(representation)) return true
    if (representation._tag === "Reference") {
      return isEligibleRef(representation.$ref) && isStringOnlySchema(document.references[representation.$ref])
    }
    if (representation._tag === "Suspend" && isNonRecursiveRefSuspend(representation, cyclic)) {
      return isStringOnlySchema(representation.thunk)
    }
    if (representation._tag === "Union") {
      return representation.types.length > 0 && representation.types.every(isStringOnlySchema)
    }
    return false
  }

  const refOwnFormat = ($ref: string): FormatCodec | undefined => {
    if (!isEligibleRef($ref)) return undefined
    const def = document.references[$ref]
    const own = getFormatCodec(def)
    if (own !== undefined) return own
    if (def._tag === "Reference") return refOwnFormat(def.$ref)
    if (def._tag === "Suspend" && isNonRecursiveRefSuspend(def, cyclic)) {
      return refOwnFormat(def.thunk.$ref)
    }
    return undefined
  }

  const hasStringBranch = (representation: Representation): boolean => {
    switch (representation._tag) {
      case "String":
        return true
      case "Literal":
        return typeof representation.literal === "string"
      case "Reference":
        return isEligibleRef(representation.$ref) &&
          hasStringBranch(document.references[representation.$ref])
      case "Suspend":
        return isNonRecursiveRefSuspend(representation, cyclic) &&
          hasStringBranch(representation.thunk)
      case "Union":
        return representation.types.some(hasStringBranch)
      default:
        return false
    }
  }

  const decoding = new Set<string>()
  const decodes = (representation: Representation, inherited?: FormatCodec): boolean => {
    switch (representation._tag) {
      case "Reference":
        if (decoding.has(representation.$ref)) return true
        return inherited !== undefined && isEligibleRef(representation.$ref) &&
          hasStringBranch(document.references[representation.$ref])
      case "Suspend":
        return isNonRecursiveRefSuspend(representation, cyclic) &&
          decodes(representation.thunk, getFormatCodec(representation) ?? inherited)
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

  let changed = true
  while (changed) {
    changed = false
    for (const [$ref, definition] of Object.entries(document.references)) {
      if (suspended.has($ref) || decoding.has($ref) || !decodes(definition)) continue
      decoding.add($ref)
      changed = true
    }
  }

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
        return isNonRecursiveRefSuspend(representation, cyclic)
          ? attachAnnotations(rewriteWire(representation.thunk), representation.annotations)
          : { ...representation, thunk: rewriteWire(representation.thunk) }
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

  // `useSite` marks a format from a referencing use site, which takes precedence over
  // formats inside the inlined target.
  const rewriteValue = (
    representation: Representation,
    path: string,
    inherited?: FormatCodec,
    useSite = false
  ): Representation => {
    if (representation._tag === "Reference") {
      if (inherited === undefined || !isEligibleRef(representation.$ref)) return representation
      const def = document.references[representation.$ref]
      if (isStringOnlySchema(def)) {
        if (decoding.has(representation.$ref)) {
          return refOwnFormat(representation.$ref) === inherited
            ? representation
            : wrapDecodeTo(wrapToEncoded(representation), inherited)
        }
        return wrapDecodeTo(representation, inherited)
      }
      if (hasStringBranch(def)) {
        const inlined = def._tag === "Reference"
          ? def
          : { ...def, annotations: omitTargetAnnotations(def.annotations) }
        return rewriteValue(inlined, path, inherited, true)
      }
      return representation
    }
    const codec = useSite ? inherited : getFormatCodec(representation) ?? inherited
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
        if (isNonRecursiveRefSuspend(representation, cyclic)) {
          return attachAnnotations(rewriteValue(representation.thunk, path, codec, useSite), representation.annotations)
        }
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
          types: representation.types.map((type, index) => rewriteValue(type, `${path}/${index}`, codec, useSite))
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
