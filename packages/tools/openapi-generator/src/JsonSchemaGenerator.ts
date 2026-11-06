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
import * as JsonPointer from "effect/JsonPointer"
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
   * Name of the synthetic definition that `type: ["string", "integer"]`,
   * `format: "int64"` schemas are redirected to. When set, those schemas are
   * generated as a shared branded `bigint` codec.
   */
  readonly int64Schema?: string | undefined
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

    const nonRecursives = nonRecursiveReferences.map(({ $ref, code }) =>
      renderSchemaTypeAndRuntime($ref, code, typeOnly, options)
    )

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
        if (recursivelyForwardReferenced.has($ref)) {
          const internalName = recursiveInternalNames.get($ref)!
          recursiveDeclarations.push(renderRecursiveReferenceDeclaration($ref, code, internalName))
          recursives.push(`const ${internalName} = ${code.runtime}`)
          continue
        }

        recursives.push(renderSchemaTypeAndRuntime($ref, code, false, options))
      }
    }

    const codes = generated.nameMap.map((name, i) =>
      renderSchemaTypeAndRuntime(name, generated.codeDocument.codes[i], typeOnly, options)
    )

    return renderImportArtifacts(generated.codeDocument, !typeOnly, options) +
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

    const nonRecursives = nonRecursiveReferences.map(({ $ref, code }) =>
      renderSchemaTypeAndRuntime($ref, code, false, options)
    )

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
      if (recursivelyForwardReferenced.has($ref)) {
        const internalName = recursiveInternalNames.get($ref)!
        recursiveDeclarations.push(renderRecursiveReferenceDeclaration($ref, code, internalName))
        recursives.push(`const ${internalName} = ${code.runtime}`)
        continue
      }

      recursives.push(renderSchemaTypeAndRuntime($ref, code, false, options))
    }

    const codes = generated.nameMap.map((name, i) =>
      renderSchemaTypeAndRuntime(name, generated.codeDocument.codes[i], false, options)
    )

    return renderImportArtifacts(generated.codeDocument, true, options) +
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
  } | undefined {
    const nameMap: Array<string> = []
    const schemas: Array<JsonSchema.JsonSchema> = []

    const definitions: JsonSchema.Definitions = Rec.map(
      components,
      (js) => fromSchemaOpenApi(source, js).schema
    )
    const int64 = options?.int64Schema
    // The wire shape keeps example filtering consistent; the rendered code is replaced by `int64Code`.
    const int64Definition: JsonSchema.JsonSchema = { type: ["string", "integer"], format: "int64" }
    const int64WireNodes = new WeakSet<object>()
    if (int64 !== undefined) {
      // Recursive declarations are typed `Schema.Codec<T>`, which requires matching decoded and encoded
      // types, so definitions in or reachable from a cycle keep the wire type.
      for (const name of collectRecursivelyReachableDefinitions(definitions)) {
        collectNodes(definitions[name], int64WireNodes)
      }
      Rec.assignProperty(definitions, int64, int64Definition)
    }

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
    const importerOptions: SchemaRepresentation.FromJsonSchemaOptions = {
      patterns: "apply",
      onEnter(js: JsonSchema.JsonSchema) {
        if (preparedOutputs.has(js)) return js
        const cached = preparedSchemas.get(js)
        if (cached !== undefined) return cached

        const out = { ...js }
        let transformed = { ...(options?.onEnter === undefined ? out : options.onEnter(out)) }
        if (
          int64 !== undefined && js !== int64Definition && !int64WireNodes.has(js) &&
          isStringOrIntegerInt64(transformed)
        ) {
          // `default` and `examples` hold wire values, which do not match the decoded bigint annotations.
          const { default: _default, examples: _examples, format: _format, type: _type, ...siblings } = transformed
          transformed = { ...siblings, $ref: `#/$defs/${int64}` }
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
    const codeDocument = SchemaRepresentation.toCodeDocument(
      SchemaRepresentation.toRepresentations(Arr.map(rootSchemas, (schema) => schema.ast))
    )

    return {
      nameMap,
      codeDocument
    }
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

const definitionRefPrefix = "#/$defs/"

// Names of definitions that are part of a reference cycle or reachable from one.
function collectRecursivelyReachableDefinitions(definitions: JsonSchema.Definitions): Set<string> {
  const directRefs = new Map<string, Set<string>>()
  for (const [name, schema] of Object.entries(definitions)) {
    const refs = new Set<string>()
    collectDefinitionRefs(schema, refs)
    directRefs.set(name, refs)
  }
  const reachable = (name: string): Set<string> => {
    const seen = new Set<string>()
    const stack = [...(directRefs.get(name) ?? [])]
    while (stack.length > 0) {
      const next = stack.pop()!
      if (seen.has(next) || !directRefs.has(next)) continue
      seen.add(next)
      stack.push(...directRefs.get(next)!)
    }
    return seen
  }
  const out = new Set<string>()
  for (const name of directRefs.keys()) {
    if (out.has(name)) continue
    const fromName = reachable(name)
    if (fromName.has(name)) {
      for (const reached of fromName) out.add(reached)
    }
  }
  return out
}

// Every nested `$ref` counts, including ones inside data keywords: an extra edge only keeps more int64
// schemas on the wire type, while a missed edge would emit code that does not type-check.
function collectDefinitionRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectDefinitionRefs(item, refs)
    return
  }
  if (typeof value !== "object" || value === null) return
  for (const [key, item] of Object.entries(value)) {
    if (key === "$ref" && typeof item === "string" && item.startsWith(definitionRefPrefix)) {
      refs.add(JsonPointer.unescapeToken(item.slice(definitionRefPrefix.length)))
    } else {
      collectDefinitionRefs(item, refs)
    }
  }
}

function collectNodes(value: unknown, nodes: WeakSet<object>): void {
  if (typeof value !== "object" || value === null || nodes.has(value)) return
  nodes.add(value)
  for (const item of Object.values(value)) collectNodes(item, nodes)
}

function isStringOrIntegerInt64(js: JsonSchema.JsonSchema): boolean {
  return js.format === "int64" && Array.isArray(js.type) && js.type.length === 2 &&
    js.type.includes("string") && js.type.includes("integer")
}

function int64Code($ref: string): SchemaRepresentation.Code {
  return {
    Type: `typeof ${$ref}.Type`,
    runtime: `Schema.Union([Schema.String.check(Schema.isStringBigInt()), Schema.Int]).pipe(
  Schema.decodeTo(
    Schema.BigInt.check(
      Schema.isBetweenBigInt({ minimum: -9223372036854775808n, maximum: 9223372036854775807n })
    ).pipe(Schema.brand("Int64")),
    SchemaTransformation.transform({ decode: (value) => BigInt(value), encode: (value) => String(value) })
  )
)`
  }
}

function renderSchemaTypeAndRuntime(
  $ref: string,
  code: SchemaRepresentation.Code,
  typeOnly: boolean,
  options?: GenerateOptions
) {
  if ($ref === options?.int64Schema) {
    code = int64Code($ref)
  } else {
    code = multipartCode($ref, options?.multipartSchemaRefs) ?? code
    if (options?.int64Schema !== undefined) {
      code = { ...code, runtime: unsuspendInt64(code.runtime, options.int64Schema) }
    }
  }
  const strings = [`export type ${$ref} = ${code.Type}`]
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
  internalName: string
): string {
  return [
    `export type ${$ref} = ${code.Type}`,
    `export const ${$ref} = Schema.suspend((): Schema.Codec<${$ref}> => ${internalName})`
  ].join("\n")
}

// An annotated reference is rendered as `Schema.suspend((): Schema.Codec<T> => T)`, which assumes the encoded
// and decoded types match. `Int64` is never recursive and is declared before its dependents, so a direct
// reference is equivalent and keeps the encoded side intact.
function unsuspendInt64(runtime: string, $ref: string): string {
  return runtime.replaceAll(`Schema.suspend((): Schema.Codec<${$ref}> => ${$ref})`, $ref)
}

function render(title: string, as: ReadonlyArray<string>) {
  if (as.length === 0) return ""
  return "// " + title + "\n" + as.join("\n") + "\n"
}

function renderImportArtifacts(
  codeDocument: SchemaRepresentation.CodeDocument,
  enabled: boolean,
  options: GenerateOptions | undefined
): string {
  if (!enabled) return ""
  const imports = codeDocument.artifacts.flatMap((artifact) =>
    artifact._tag === "Import" ? [artifact.importDeclaration] : []
  )
  if (codeDocument.references.nonRecursives.some(({ $ref }) => $ref === options?.int64Schema)) {
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
