/**
 * Generate TypeScript source for JSON Schema declarations extracted from
 * OpenAPI documents.
 *
 * This module is the schema-rendering stage of the OpenAPI generator. Callers
 * register named OpenAPI 3.0 or 3.1 schemas, provide the reusable component
 * definitions for the document, and receive source text containing exported
 * TypeScript aliases plus Effect Schema runtime values. The generator first
 * normalizes OpenAPI-specific schema shapes into Effect's JSON Schema model,
 * then delegates recursive analysis and runtime expression construction to
 * `SchemaRepresentation`.
 *
 * The renderer keeps the emitted module usable for both human maintainers and
 * automated code-generation consumers by grouping recursive declarations,
 * reusable references, and locally registered schemas. It also contains the
 * HttpApi-specific multipart file substitutions that map generated schemas to
 * Effect's multipart runtime types.
 *
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import * as JsonSchema from "effect/JsonSchema"
import * as Rec from "effect/Record"
import * as Schema from "effect/Schema"
import * as SchemaRepresentation from "effect/SchemaRepresentation"

type Source = "openapi-3.0" | "openapi-3.1"
interface GenerateOptions {
  readonly onEnter?: ((js: JsonSchema.JsonSchema) => JsonSchema.JsonSchema) | undefined
  readonly multipartSchemaRefs?: MultipartSchemaRefs | undefined
  readonly includeSchemas?: ReadonlyArray<string> | undefined
  /**
   * Generate `type: ["string", "integer"]`, `format: "int64"` schemas as
   * bigints branded as `Int64`, decoded through a shared codec.
   */
  readonly int64AsBigInt?: boolean | undefined
}

interface HttpApiMultipartSchemaRefs {
  readonly kind: "httpapi"
  readonly singleFile: string
  readonly files: string
}

type MultipartSchemaRefs = HttpApiMultipartSchemaRefs | { readonly kind: "client"; readonly singleFile: string }

/**
 * Create a stateful JSON Schema code generator for OpenAPI-derived schemas.
 *
 * **Details**
 *
 * Schemas registered with the returned generator are converted into TypeScript
 * type aliases and Effect Schema runtime declarations, with reusable OpenAPI
 * component definitions supplied at generation time.
 *
 * @category code generation
 * @since 4.0.0
 */
export function make() {
  return makeWithRepresentation()
}

function makeWithRepresentation() {
  const store = Object.create(null) as Record<string, JsonSchema.JsonSchema>

  function addSchema(name: string, schema: JsonSchema.JsonSchema): string {
    if (Object.hasOwn(store, name)) {
      throw new Error(`Schema ${name} already exists`)
    }
    store[name] = schema
    return name
  }

  function generate(
    source: Source,
    components: JsonSchema.Definitions,
    typeOnly: boolean,
    options?: GenerateOptions
  ) {
    const generated = makeCodeDocument(source, components, options)
    if (generated === undefined) {
      return ""
    }

    const nonRecursiveReferences = generated.codeDocument.references.nonRecursives
    const recursiveReferences = Object.entries(generated.codeDocument.references.recursives)

    const nonRecursives = [
      ...generated.int64Definitions,
      ...nonRecursiveReferences.map(({ $ref, code }) => renderSchemaTypeAndRuntime($ref, code, typeOnly, options))
    ]

    const recursiveDeclarations: Array<string> = []
    const recursives: Array<string> = []

    if (typeOnly) {
      for (const [$ref, code] of recursiveReferences) {
        recursives.push(renderSchemaTypeAndRuntime($ref, code, true, options))
      }
    } else {
      const recursivelyForwardReferenced = collectForwardReferencedRecursives(
        nonRecursiveReferences,
        recursiveReferences
      )
      const recursiveInternalNames = makeRecursiveInternalNameMap(
        recursivelyForwardReferenced,
        [
          ...nonRecursiveReferences.map(({ $ref }) => $ref),
          ...recursiveReferences.map(([$ref]) => $ref),
          ...generated.nameMap
        ]
      )

      for (const [$ref, code] of recursiveReferences) {
        const encoded = generated.encodedTypes.get($ref)
        if (recursivelyForwardReferenced.has($ref)) {
          const internalName = recursiveInternalNames.get($ref)!
          recursiveDeclarations.push(renderRecursiveReferenceDeclaration($ref, code, internalName, encoded))
          recursives.push(`const ${internalName} = ${code.runtime}`)
          continue
        }

        recursives.push(renderSchemaTypeAndRuntime($ref, code, false, options, encoded))
      }
    }

    const codes = generated.nameMap.map((name, i) =>
      renderSchemaTypeAndRuntime(name, generated.codeDocument.codes[i], typeOnly, options)
    )

    return renderImportArtifacts(generated.codeDocument, !typeOnly, generated.int64Definitions.length > 0) +
      render("recursive declarations", recursiveDeclarations) +
      render("non-recursive definitions", nonRecursives) +
      render("recursive definitions", recursives) +
      render("schemas", codes)
  }

  function generateHttpApi(
    source: Source,
    components: JsonSchema.Definitions,
    options?: GenerateOptions
  ) {
    const generated = makeCodeDocument(source, components, options)
    if (generated === undefined) {
      return ""
    }

    const nonRecursiveReferences = generated.codeDocument.references.nonRecursives
    const recursiveReferences = Object.entries(generated.codeDocument.references.recursives)

    const nonRecursives = [
      ...generated.int64Definitions,
      ...nonRecursiveReferences.map(({ $ref, code }) => renderSchemaTypeAndRuntime($ref, code, false, options))
    ]

    const recursivelyForwardReferenced = collectForwardReferencedRecursives(nonRecursiveReferences, recursiveReferences)
    const recursiveInternalNames = makeRecursiveInternalNameMap(
      recursivelyForwardReferenced,
      [
        ...nonRecursiveReferences.map(({ $ref }) => $ref),
        ...recursiveReferences.map(([$ref]) => $ref),
        ...generated.nameMap
      ]
    )

    const recursiveDeclarations: Array<string> = []
    const recursives: Array<string> = []

    for (const [$ref, code] of recursiveReferences) {
      const encoded = generated.encodedTypes.get($ref)
      if (recursivelyForwardReferenced.has($ref)) {
        const internalName = recursiveInternalNames.get($ref)!
        recursiveDeclarations.push(renderRecursiveReferenceDeclaration($ref, code, internalName, encoded))
        recursives.push(`const ${internalName} = ${code.runtime}`)
        continue
      }

      recursives.push(renderSchemaTypeAndRuntime($ref, code, false, options, encoded))
    }

    const codes = generated.nameMap.map((name, i) =>
      renderSchemaTypeAndRuntime(name, generated.codeDocument.codes[i], false, options)
    )

    return renderImportArtifacts(generated.codeDocument, true, generated.int64Definitions.length > 0) +
      render("recursive declarations", recursiveDeclarations) +
      render("non-recursive definitions", nonRecursives) +
      render("recursive definitions", recursives) +
      render("schemas", codes)
  }

  function makeCodeDocument(
    source: Source,
    components: JsonSchema.Definitions,
    options?: GenerateOptions
  ): {
    readonly nameMap: Array<string>
    readonly codeDocument: SchemaRepresentation.CodeDocument
    readonly int64Definitions: ReadonlyArray<string>
    readonly encodedTypes: ReadonlyMap<string, EncodedType>
  } | undefined {
    const nameMap: Array<string> = []
    const schemas: Array<JsonSchema.JsonSchema> = []

    const definitions: JsonSchema.Definitions = Rec.map(
      components,
      (js) => fromSchemaOpenApi(source, js).schema
    )

    for (const [name, js] of Object.entries(store)) {
      nameMap.push(name)
      schemas.push(fromSchemaOpenApi(source, js).schema)
    }
    // Unnamed roots, so included components are emitted as definitions without an alias
    for (const name of options?.includeSchemas ?? []) {
      if (!Object.hasOwn(components, name)) {
        throw new Error(`Included schema ${name} is not a component`)
      }
      schemas.push(fromSchemaOpenApi(source, { $ref: `#/components/schemas/${name}` }).schema)
    }

    if (!Arr.isArrayNonEmpty(schemas)) {
      return
    }

    const document = {
      dialect: "draft-2020-12" as const,
      schemas,
      definitions
    }
    const schemasWithExamples: Array<JsonSchema.JsonSchema> = []
    const preparedSchemas = new WeakMap<JsonSchema.JsonSchema, JsonSchema.JsonSchema>()
    const preparedOutputs = new WeakSet<JsonSchema.JsonSchema>()
    const int64 = options?.int64AsBigInt === true
    const importerOptions: SchemaRepresentation.FromJsonSchemaOptions = {
      patterns: "apply",
      ...(int64 ? { includeAnnotationKey: (key: string) => key === int64Marker } : undefined),
      onEnter(js: JsonSchema.JsonSchema) {
        if (preparedOutputs.has(js)) return js
        const cached = preparedSchemas.get(js)
        if (cached !== undefined) return cached

        const out = { ...js }
        let transformed = { ...(options?.onEnter === undefined ? out : options.onEnter(out)) }
        if (int64 && isStringOrIntegerInt64(transformed)) {
          transformed = { ...transformed, [int64Marker]: true }
        }
        preparedSchemas.set(js, transformed)
        preparedOutputs.add(transformed)
        if (Array.isArray(transformed.examples)) {
          schemasWithExamples.push(transformed)
        }
        return transformed
      }
    }
    let rootSchemas = SchemaRepresentation.fromJsonSchemaMultiDocument(document, importerOptions)
    if (Arr.isArrayNonEmpty(schemasWithExamples)) {
      const exampleSchemas = SchemaRepresentation.fromJsonSchemaMultiDocument(
        { ...document, schemas: schemasWithExamples },
        importerOptions
      )
      for (let i = 0; i < schemasWithExamples.length; i++) {
        const node = schemasWithExamples[i]
        const examples = node.examples as ReadonlyArray<unknown>
        const validExamples = examples.filter(Schema.is(exampleSchemas[i]))
        if (validExamples.length === examples.length) continue
        if (validExamples.length === 0) {
          delete node.examples
        } else {
          node.examples = validExamples
        }
      }
      rootSchemas = SchemaRepresentation.fromJsonSchemaMultiDocument(document, importerOptions)
    }
    const representations = SchemaRepresentation.toRepresentations(Arr.map(rootSchemas, (schema) => schema.ast))
    if (!int64) {
      return {
        nameMap,
        codeDocument: SchemaRepresentation.toCodeDocument(representations),
        int64Definitions: [],
        encodedTypes: new Map()
      }
    }

    return { nameMap, ...toInt64CodeDocument(representations, nameMap) }
  }

  return {
    addSchema,
    generate,
    generateHttpApi,
    schemas: store as Readonly<Record<string, JsonSchema.JsonSchema>>
  } as const
}

function fromSchemaOpenApi(source: Source, jsonSchema: JsonSchema.JsonSchema) {
  switch (source) {
    case "openapi-3.1":
      return JsonSchema.fromSchemaOpenApi3_1(jsonSchema)
    case "openapi-3.0":
      return JsonSchema.fromSchemaOpenApi3_0(jsonSchema)
  }
}

function renderSchemaTypeAndRuntime(
  $ref: string,
  code: SchemaRepresentation.Code,
  typeOnly: boolean,
  options?: GenerateOptions,
  encoded?: EncodedType
) {
  code = multipartCode($ref, options?.multipartSchemaRefs) ?? code
  const strings = [`export type ${$ref} = ${code.Type}`]
  if (encoded !== undefined) {
    strings.push(`export type ${encoded.alias} = ${encoded.Type}`)
  }
  if (!typeOnly) {
    strings.push(`export const ${$ref} = ${code.runtime}`)
  }
  return strings.join("\n")
}

function multipartCode(
  $ref: string,
  refs: MultipartSchemaRefs | undefined
): SchemaRepresentation.Code | undefined {
  if (refs === undefined) {
    return undefined
  }
  if ($ref === refs.singleFile) {
    return refs.kind === "httpapi"
      ? { Type: "Multipart.PersistedFile", runtime: "Multipart.SingleFileSchema" }
      : {
        Type: "globalThis.File | globalThis.Blob",
        runtime: `Schema.instanceOf(globalThis.Blob, { expected: "File | Blob" })`
      }
  }
  if (refs.kind === "httpapi" && $ref === refs.files) {
    return { Type: "ReadonlyArray<Multipart.PersistedFile>", runtime: "Multipart.FilesSchema" }
  }
  return undefined
}

function renderRecursiveReferenceDeclaration(
  $ref: string,
  code: SchemaRepresentation.Code,
  internalName: string,
  encoded: EncodedType | undefined
): string {
  return [
    `export type ${$ref} = ${code.Type}`,
    ...(encoded === undefined ? [] : [`export type ${encoded.alias} = ${encoded.Type}`]),
    `export const ${$ref} = Schema.suspend((): Schema.Codec<${$ref}${
      encoded === undefined ? "" : `, ${encoded.alias}`
    }> => ${internalName})`
  ].join("\n")
}

function render(title: string, as: ReadonlyArray<string>) {
  if (as.length === 0) return ""
  return "// " + title + "\n" + as.join("\n") + "\n"
}

function renderImportArtifacts(
  codeDocument: SchemaRepresentation.CodeDocument,
  enabled: boolean,
  int64: boolean
): string {
  if (!enabled) return ""
  const imports = codeDocument.artifacts.flatMap((artifact) =>
    artifact._tag === "Import" ? [artifact.importDeclaration] : []
  )
  if (int64) {
    imports.push(`import * as SchemaTransformation from "effect/SchemaTransformation"`)
  }
  return imports.length === 0 ? "" : imports.join("\n") + "\n"
}

const tokenPattern = /[A-Za-z_$][A-Za-z0-9_$]*/g

function collectForwardReferencedRecursives(
  nonRecursives: ReadonlyArray<{
    readonly $ref: string
    readonly code: SchemaRepresentation.Code
  }>,
  recursives: ReadonlyArray<readonly [string, SchemaRepresentation.Code]>
): Set<string> {
  const recursiveNames = new Set(recursives.map(([name]) => name))
  const recursiveIndexes = new Map(recursives.map(([name], index) => [name, index]))
  const referenced = new Set<string>()

  for (const { code } of nonRecursives) {
    for (const token of code.runtime.matchAll(tokenPattern)) {
      const identifier = token[0]
      if (recursiveNames.has(identifier)) {
        referenced.add(identifier)
      }
    }
  }

  for (let index = 0; index < recursives.length; index++) {
    const [, code] = recursives[index]
    for (const token of code.runtime.matchAll(tokenPattern)) {
      const identifier = token[0]
      const referencedIndex = recursiveIndexes.get(identifier)
      if (referencedIndex !== undefined && referencedIndex > index) {
        referenced.add(identifier)
      }
    }
  }

  return referenced
}

function makeRecursiveInternalNameMap(
  recursiveNames: ReadonlySet<string>,
  existingNames: ReadonlyArray<string>
): Map<string, string> {
  const usedNames = new Set(existingNames)
  const internalNames = new Map<string, string>()

  for (const name of recursiveNames) {
    let candidate = `__recursive_${name}`
    while (usedNames.has(candidate)) {
      candidate = `_${candidate}`
    }
    usedNames.add(candidate)
    internalNames.set(name, candidate)
  }

  return internalNames
}

// The encoded type of a recursive declaration that differs from its decoded type.
interface EncodedType {
  readonly alias: string
  readonly Type: string
}

// Carried from the importer to the representation rewrite to mark `type: ["string", "integer"], format: "int64"`.
const int64Marker = "x-effect-openapi-int64"

function isStringOrIntegerInt64(js: JsonSchema.JsonSchema): boolean {
  return js.format === "int64" && Array.isArray(js.type) && js.type.length === 2 &&
    js.type.includes("string") && js.type.includes("integer")
}

function renderInt64Definition(name: string): string {
  return `export type ${name} = typeof ${name}.Type
export const ${name} = Schema.Union([Schema.String.check(Schema.isStringBigInt()), Schema.Int]).pipe(
  Schema.decodeTo(
    Schema.BigInt.check(
      Schema.isBetweenBigInt({ minimum: -9223372036854775808n, maximum: 9223372036854775807n })
    ).pipe(Schema.brand("Int64")),
    SchemaTransformation.transform({ decode: (value) => BigInt(value), encode: (value) => String(value) })
  )
)`
}

const plainInt64Wires = new Set([
  "Schema.Union([Schema.String, Schema.Int])",
  "Schema.Union([Schema.Int, Schema.String])"
])

function children(
  representation: SchemaRepresentation.Representation
): ReadonlyArray<SchemaRepresentation.Representation> {
  switch (representation._tag) {
    case "Declaration":
      return representation.typeParameters
    case "Suspend":
      return [representation.thunk]
    case "TemplateLiteral":
      return representation.parts
    case "Arrays":
      return [...representation.elements.map((element) => element.type), ...representation.rest]
    case "Objects":
      return [
        ...representation.propertySignatures.map((property) => property.type),
        ...representation.indexSignatures.flatMap((signature) => [signature.parameter, signature.type])
      ]
    case "Union":
      return representation.types
    default:
      return []
  }
}

function hasInt64Marker(representation: SchemaRepresentation.Representation): boolean {
  return representation._tag !== "Reference" && representation.annotations?.[int64Marker] === true
}

function collectReferences(representation: SchemaRepresentation.Representation, refs: Set<string>): void {
  if (representation._tag === "Reference") {
    refs.add(representation.$ref)
    return
  }
  for (const child of children(representation)) collectReferences(child, refs)
}

// `default` and `examples` hold wire values, which do not type-check against decoded bigints.
function omitWireValues(annotations: Schema.Annotations.Annotations | undefined) {
  if (annotations === undefined) return undefined
  const { default: _default, examples: _examples, [int64Marker]: _marker, ...rest } = annotations
  return rest
}

/**
 * Renders a document whose marked int64 nodes decode through a shared `Int64` codec.
 *
 * Schemas containing `Int64`, directly or through references, have different decoded and encoded types, so
 * references to them carry an explicit encoded type wherever the generated code is typed as `Schema.Codec`.
 * Recursive declarations get an exported `<Name>Encoded` alias, taken from a second rendering of the same
 * document in which int64 nodes keep their wire type.
 *
 * Which declarations are recursive, and which identifiers are taken, is only known once core codegen has
 * rendered the document, so the document is rendered again if the generated names have to change.
 */
function toInt64CodeDocument(
  document: SchemaRepresentation.MultiDocument,
  reservedNames: ReadonlyArray<string>
): {
  readonly codeDocument: SchemaRepresentation.CodeDocument
  readonly int64Definitions: ReadonlyArray<string>
  readonly encodedTypes: ReadonlyMap<string, EncodedType>
} {
  const rewrite = makeInt64Rewrite(document)
  let codeDocument = SchemaRepresentation.toCodeDocument(rewrite.decoded)

  const taken = new Set([
    ...reservedNames,
    ...codeDocument.references.nonRecursives.map(({ $ref }) => $ref),
    ...Object.keys(codeDocument.references.recursives)
  ])
  const allocate = (base: string): string => {
    let name = base
    for (let index = 2; taken.has(name); index++) name = `${base}${index}`
    taken.add(name)
    return name
  }
  const int64 = allocate(defaultInt64Name)
  const encodedAliases = new Map(
    Object.keys(codeDocument.references.recursives)
      .filter((identifier) => rewrite.transformedIdentifiers.has(identifier))
      .map((identifier) => [identifier, allocate(defaultEncodedAlias(identifier))])
  )
  if (
    int64 !== defaultInt64Name ||
    [...encodedAliases].some(([identifier, alias]) => alias !== defaultEncodedAlias(identifier))
  ) {
    rewrite.names.int64 = int64
    rewrite.names.encodedAliases = encodedAliases
    codeDocument = SchemaRepresentation.toCodeDocument(rewrite.decoded)
  }
  rewrite.names.recursives = new Set(Object.keys(codeDocument.references.recursives))

  const encodedTypes = new Map<string, EncodedType>()
  if (encodedAliases.size > 0) {
    const { references } = SchemaRepresentation.toCodeDocument(rewrite.encoded)
    const types = new Map([
      ...references.nonRecursives.map(({ $ref, code }) => [$ref, code.Type] as const),
      ...Object.entries(references.recursives).map(([identifier, code]) => [identifier, code.Type] as const)
    ])
    for (const [identifier, alias] of encodedAliases) {
      encodedTypes.set(identifier, { alias, Type: types.get(identifier)! })
    }
  }

  return {
    codeDocument,
    int64Definitions: rewrite.isUsed() ? [renderInt64Definition(int64)] : [],
    encodedTypes
  }
}

const defaultInt64Name = "Int64"
const defaultEncodedAlias = (identifier: string): string => `${identifier}Encoded`

/**
 * Rewrites marked int64 nodes into `Int64` declarations, in two variants of the same document:
 *
 * - `decoded` is rendered as the generated schemas.
 * - `encoded` only provides the encoded types of recursive declarations.
 *
 * Generated names are read from `names` while rendering.
 */
function makeInt64Rewrite(document: SchemaRepresentation.MultiDocument) {
  const definitionRefs = new Map<string, Set<string>>()
  const transformedDefinitions = new Set<string>()
  const containsInt64 = (representation: SchemaRepresentation.Representation): boolean =>
    hasInt64Marker(representation) || children(representation).some(containsInt64)
  for (const [$ref, representation] of Object.entries(document.references)) {
    const refs = new Set<string>()
    collectReferences(representation, refs)
    definitionRefs.set($ref, refs)
    if (containsInt64(representation)) transformedDefinitions.add($ref)
  }
  for (let changed = true; changed;) {
    changed = false
    for (const [$ref, refs] of definitionRefs) {
      if (!transformedDefinitions.has($ref) && [...refs].some((ref) => transformedDefinitions.has(ref))) {
        transformedDefinitions.add($ref)
        changed = true
      }
    }
  }

  const names: {
    int64: string
    encodedAliases: ReadonlyMap<string, string>
    // Identifiers that the decoded rendering declares as recursive.
    recursives: ReadonlySet<string>
  } = { int64: defaultInt64Name, encodedAliases: new Map(), recursives: new Set() }
  const encodedAlias = (identifier: string): string =>
    names.encodedAliases.get(identifier) ?? defaultEncodedAlias(identifier)
  const transformedIdentifiers = new Set<string>()

  const transformed = new WeakMap<SchemaRepresentation.Representation, boolean>()
  const isTransformed = (representation: SchemaRepresentation.Representation): boolean => {
    if (representation._tag === "Reference") return transformedDefinitions.has(representation.$ref)
    let out = transformed.get(representation)
    if (out === undefined) {
      out = hasInt64Marker(representation) || children(representation).some(isTransformed)
      transformed.set(representation, out)
    }
    return out
  }

  let used = false
  const passthrough: SchemaRepresentation.Generation.Declaration = ({ typeParameters: [code] }) => code

  const make = (mode: "decoded" | "encoded") => {
    const cache = new WeakMap<SchemaRepresentation.Representation, SchemaRepresentation.Representation>()

    const reference = (representation: SchemaRepresentation.Reference): SchemaRepresentation.Declaration => ({
      _tag: "Declaration",
      typeParameters: [representation],
      checks: [],
      annotations: {
        toCode: ({ typeParameters: [code] }: SchemaRepresentation.Generation.DeclarationInput) => {
          const identifier = code.Type
          transformedIdentifiers.add(identifier)
          if (mode === "encoded") {
            return {
              runtime: code.runtime,
              Type: names.recursives.has(identifier) ? encodedAlias(identifier) : `typeof ${identifier}.Encoded`
            }
          }
          // Core codegen suspends references to the declarations it renders as recursive.
          return {
            runtime: code.runtime === identifier
              ? identifier
              : `Schema.suspend((): Schema.Codec<${identifier}, ${encodedAlias(identifier)}> => ${identifier})`,
            Type: identifier
          }
        }
      }
    })

    const int64Node = (
      representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>
    ): SchemaRepresentation.Representation => {
      const { annotations, ...wire } = representation
      if (mode === "encoded") return wire
      const { format: _format, ...rest } = omitWireValues(annotations) ?? {}
      return {
        _tag: "Declaration",
        typeParameters: [wire],
        checks: [],
        annotations: {
          ...rest,
          toCode: ({ typeParameters: [code] }: SchemaRepresentation.Generation.DeclarationInput) => {
            used = true
            return {
              runtime: plainInt64Wires.has(code.runtime)
                ? names.int64
                : `${code.runtime}.pipe(Schema.decodeTo(${names.int64}))`,
              Type: names.int64
            }
          }
        }
      }
    }

    const rewrite = (representation: SchemaRepresentation.Representation): SchemaRepresentation.Representation => {
      if (!isTransformed(representation)) return representation
      if (representation._tag === "Reference") return reference(representation)
      let out = cache.get(representation)
      if (out === undefined) {
        out = rewriteNode(representation)
        cache.set(representation, out)
      }
      return out
    }

    const rewriteNode = (
      representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>
    ): SchemaRepresentation.Representation => {
      if (hasInt64Marker(representation)) return int64Node(representation)
      const annotations = omitWireValues(representation.annotations)
      switch (representation._tag) {
        case "Suspend":
          // Rendered without the suspension: the generated `Schema.Codec<T>` annotation assumes matching
          // decoded and encoded types, and recursive references are already suspended by `reference`.
          return {
            _tag: "Declaration",
            typeParameters: [rewrite(representation.thunk)],
            checks: [],
            annotations: { ...annotations, toCode: passthrough }
          }
        case "Declaration":
          return { ...representation, annotations, typeParameters: representation.typeParameters.map(rewrite) }
        case "TemplateLiteral":
          return { ...representation, annotations, parts: representation.parts.map(rewrite) }
        case "Arrays":
          return {
            ...representation,
            annotations,
            elements: representation.elements.map((element) => ({ ...element, type: rewrite(element.type) })),
            rest: representation.rest.map(rewrite)
          }
        case "Union":
          return { ...representation, annotations, types: representation.types.map(rewrite) }
        case "Objects": {
          // Index signatures also check declared keys, so they must accept the transformed property values.
          const seen = new Set<string>()
          const transformedTypes: Array<SchemaRepresentation.Representation> = []
          for (const property of representation.propertySignatures) {
            if (!isTransformed(property.type)) continue
            const key = JSON.stringify(property.type)
            if (seen.has(key)) continue
            seen.add(key)
            transformedTypes.push(rewrite(property.type))
          }
          return {
            ...representation,
            annotations,
            propertySignatures: representation.propertySignatures.map((property) => ({
              ...property,
              type: rewrite(property.type)
            })),
            indexSignatures: representation.indexSignatures.map((signature) => ({
              parameter: rewrite(signature.parameter),
              type: transformedTypes.length === 0 ? rewrite(signature.type) : {
                _tag: "Union",
                types: [rewrite(signature.type), ...transformedTypes],
                checks: []
              }
            }))
          }
        }
        default:
          return { ...representation, annotations }
      }
    }

    return {
      representations: Arr.map(document.representations, rewrite),
      references: Rec.map(document.references, rewrite)
    }
  }

  return {
    decoded: make("decoded"),
    encoded: make("encoded"),
    names,
    transformedIdentifiers: transformedIdentifiers as ReadonlySet<string>,
    isUsed: () => used
  }
}
