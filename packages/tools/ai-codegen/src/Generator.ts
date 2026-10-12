/**
 * Code generator service wrapping @effect/openapi-generator.
 *
 * @since 4.0.0
 */
import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import * as OpenApiPatch from "@effect/openapi-generator/OpenApiPatch"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as JsonSchema from "effect/JsonSchema"
import * as Layer from "effect/Layer"
import * as Path_ from "effect/Path"
import * as Predicate from "effect/Predicate"
import type * as Schema from "effect/Schema"
import type { DiscoveredProvider } from "./Discovery.ts"

/**
 * Error during code generation.
 *
 * **Example** (Creating a generation error)
 *
 * ```ts import.meta.vitest
 * import * as Generator from "@effect/ai-codegen/Generator"
 *
 * const error = new Generator.GenerationError({
 *   provider: "openai",
 *   cause: new Error("Invalid spec")
 * })
 *
 * error._tag // => "GenerationError"
 * error.provider // => "openai"
 * ```
 *
 * @category errors
 * @since 4.0.0
 */
export class GenerationError extends Data.TaggedError("GenerationError")<{
  readonly provider: string
  readonly cause: unknown
}> {}

/**
 * Error during patch application.
 *
 * **Example** (Creating a patch error)
 *
 * ```ts import.meta.vitest
 * import * as Generator from "@effect/ai-codegen/Generator"
 *
 * const error = new Generator.PatchError({
 *   provider: "openai",
 *   cause: new Error("Invalid patch")
 * })
 *
 * error._tag // => "PatchError"
 * error.provider // => "openai"
 * ```
 *
 * @category errors
 * @since 4.0.0
 */
export class PatchError extends Data.TaggedError("PatchError")<{
  readonly provider: string
  readonly cause: unknown
}> {}

/**
 * Service for generating Effect code from OpenAPI specs.
 *
 * @category services
 * @since 4.0.0
 */
export interface CodeGenerator {
  readonly generate: (
    provider: DiscoveredProvider,
    spec: unknown
  ) => Effect.Effect<string, GenerationError | PatchError, FileSystem.FileSystem | Path_.Path>
}

/**
 * Service tag for generating Effect client code from OpenAPI specifications.
 *
 * @category services
 * @since 4.0.0
 */
export const CodeGenerator: Context.Service<CodeGenerator, CodeGenerator> = Context.Service(
  "@effect/ai-codegen/CodeGenerator"
)

const isRecord = (u: unknown): u is { readonly [x: string]: unknown } =>
  Predicate.isObjectOrArray(u) && !Array.isArray(u)

/** A bare `{ "type": "string" }` branch - the open half of an open enum. */
const isOpenStringBranch = (branch: unknown): boolean =>
  isRecord(branch) && branch.type === "string" && Object.keys(branch).length === 1

/** The value of a `{ "const": "..." }` branch, when it is a string const. */
const constBranchValue = (branch: unknown): string | undefined =>
  isRecord(branch) && Predicate.isString(branch.const) ? branch.const : undefined

/**
 * Collapse an open enum's const branches into a single `enum` branch.
 *
 * Stainless-generated specs encode an open enum as
 * `anyOf: [{ type: "string" }, { const: "a" }, { const: "b" }]` - "any string is valid, and these are
 * the known values". Left as-is, each const becomes its own `Schema.Literal` member, so consumers
 * cannot recover the literal union from the generated schema (the union's `Type` is just `string`).
 *
 * Rewriting the const branches to `anyOf: [{ type: "string" }, { enum: ["a", "b"] }]` emits
 * `Schema.Union([Schema.String, Schema.Literals(["a", "b"])])` instead, which decodes any string while
 * still exposing the known values as `members[1]` for autocomplete.
 */
const normalizeOpenEnum = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  const anyOf = js.anyOf
  if (!Array.isArray(anyOf) || anyOf.length < 2) return js

  const [head, ...tail] = anyOf
  if (!isOpenStringBranch(head)) return js

  const literals: Array<string> = []
  for (const branch of tail) {
    const value = constBranchValue(branch)
    if (value === undefined) return js
    literals.push(value)
  }

  return { ...js, anyOf: [head, { enum: literals }] }
}

const isStringArray = (u: unknown): u is ReadonlyArray<string> => Array.isArray(u) && u.every(Predicate.isString)

/** A `{ "required": ["key"] }` branch that only requires a single key. */
const requiredKey = (branch: unknown): string | undefined =>
  isRecord(branch) && Object.keys(branch).length === 1 && isStringArray(branch.required) &&
    branch.required.length === 1
    ? branch.required[0]
    : undefined

const choiceMode = (js: JsonSchema.JsonSchema): "anyOf" | "oneOf" | undefined =>
  Array.isArray(js.oneOf)
    ? (js.anyOf === undefined ? "oneOf" : undefined)
    : Array.isArray(js.anyOf)
    ? "anyOf"
    : undefined

/** Requires every listed key to be absent. */
const absent = (keys: ReadonlyArray<string>): JsonSchema.JsonSchema => ({
  properties: Object.fromEntries(keys.map((key) => [key, false]))
})

const jsonTypes = ["null", "boolean", "object", "array", "number", "string"]

/** The types left over by `not: { type: [...] }`, or `undefined` when there is no exact complement. */
const typeComplement = (not: { readonly [x: string]: unknown }, current: unknown): unknown => {
  if (Object.keys(not).length !== 1) return undefined
  const excluded = Predicate.isString(not.type) ? [not.type] : not.type
  // `integer` is a subset of `number`, so excluding it alone leaves no type-level complement
  if (!isStringArray(excluded) || excluded.includes("integer") && !excluded.includes("number")) return undefined
  const types = current === undefined ? jsonTypes : Predicate.isString(current) ? [current] : current
  if (!isStringArray(types)) return undefined
  const remaining = types.filter((type) => !excluded.includes(type === "integer" ? "number" : type))
  return remaining.length === 0 ? undefined : remaining.length === 1 ? remaining[0] : remaining
}

/** `not: { pattern: "[^...]" }` - no character outside a class - as a positive pattern. */
const negatedClassPattern = (not: { readonly [x: string]: unknown }): string | undefined => {
  if (Object.keys(not).length !== 1 || !Predicate.isString(not.pattern)) return undefined
  const match = /^\[\^((?:[^\\[\]]|\\.)+)\]$/.exec(not.pattern)
  return match === null ? undefined : `^[${match[1]}]*$`
}

/**
 * Rewrite the `not` forms found in provider specs as equivalent positive constraints.
 *
 * Effect has no negation, but these forms have exact positive equivalents:
 *
 * - `not: { type }` keeps the complementary types.
 * - `not: { pattern: "[^...]" }` requires every character to be in the class.
 * - `anyOf: [{ required: [a] }, { required: [b] }]` with `not: { required: [a, b] }` is exactly one of
 *   them: `oneOf`.
 * - `not: { required: [...] }`, optionally with `anyOf` single-key branches, requires some of those keys
 *   to be absent, which is expressed with `false` property schemas.
 *
 * Any other `not` is left for the importer to reject.
 */
const rewriteNot = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  const not = js.not
  if (!isRecord(not)) return js
  const { not: _, ...rest } = js

  const type = typeComplement(not, rest.type)
  if (type !== undefined) return { ...rest, type }

  const pattern = negatedClassPattern(not)
  if (pattern !== undefined) {
    if (rest.pattern === undefined) return { ...rest, pattern }
    // The existing pattern already restricts every character to the same class
    if (rest.pattern === pattern || rest.pattern === pattern.replace(/\*\$$/, "+$")) return rest
    return { ...rest, allOf: [...(Array.isArray(rest.allOf) ? rest.allOf : []), { pattern }] }
  }

  // `required` holds for any non-object, so its negation only has a key-absence equivalent on objects
  if (!isStringArray(not.required) || rest.type !== "object") return js
  const required = not.required
  const notKeys = Object.keys(not)
  if (notKeys.length === 1 && required.length === 2 && rest.oneOf === undefined && Array.isArray(rest.anyOf)) {
    const keys = rest.anyOf.map(requiredKey)
    if (keys.length === 2 && required.every((key) => keys.includes(key)) && keys[0] !== keys[1]) {
      const { anyOf, ...base } = rest
      return { ...base, oneOf: anyOf }
    }
  }
  if (rest.anyOf !== undefined || rest.oneOf !== undefined) return js
  if (notKeys.length === 1) return { ...rest, anyOf: required.map((key) => absent([key])) }
  const alternatives = Array.isArray(not.anyOf) ? not.anyOf.map(requiredKey) : []
  if (notKeys.length === 2 && alternatives.length > 0 && isStringArray(alternatives)) {
    return { ...rest, anyOf: [...required.map((key) => absent([key])), absent(alternatives)] }
  }
  return js
}

/**
 * Rewrite `if`/`else` without `then` as `anyOf: [if, else]`.
 *
 * `(if and then) or (not if and else)` with an always-valid `then` reduces to `if or else`, so the
 * rewrite is exact and needs no negation.
 */
const rewriteConditional = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  if (js.if === undefined || js.else === undefined || js.then !== undefined || js.anyOf !== undefined) return js
  const { else: otherwise, if: condition, ...rest } = js
  return { ...rest, anyOf: [condition, otherwise] }
}

const isNullableMarker = (member: unknown): boolean =>
  isRecord(member) && member.nullable === true && Object.keys(member).length === 1

/**
 * Honour OpenAPI 3.0 `nullable: true` markers left in an OpenAPI 3.1 spec, where the keyword has no
 * meaning. They appear on a schema, or as an `allOf: [{ $ref }, { nullable: true }]` member, and are
 * rewritten as `anyOf: [schema, { type: "null" }]`.
 */
const rewriteNullable = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  const allOf = Array.isArray(js.allOf) ? js.allOf : undefined
  if (js.nullable !== true && !allOf?.some(isNullableMarker)) return js
  const { nullable: _, ...rest } = js
  const members = allOf?.filter((member) => !isNullableMarker(member))
  const schema = members === undefined ? rest : members.length === 0 ? omitAllOf(rest) : { ...rest, allOf: members }
  const annotations = pick(schema, isAnnotation)
  return { ...annotations, anyOf: [pick(schema, (key) => !isAnnotation(key)), { type: "null" }] }
}

const omitAllOf = ({ allOf: _, ...rest }: JsonSchema.JsonSchema): JsonSchema.JsonSchema => rest

const objectKeys = new Set(["type", "properties", "required", "additionalProperties"])
const annotationKeys = new Set([
  "title",
  "description",
  "deprecated",
  "readOnly",
  "writeOnly",
  "default",
  "examples",
  "$comment",
  "discriminator"
])

const isAnnotation = (key: string): boolean => annotationKeys.has(key) || key.startsWith("x-")

const pick = (js: JsonSchema.JsonSchema, predicate: (key: string) => boolean): JsonSchema.JsonSchema =>
  Object.fromEntries(Object.entries(js).filter(([key]) => predicate(key)))

/** An object schema made only of `properties`, `required`, `additionalProperties` and annotations. */
const isPlainObject = (js: JsonSchema.JsonSchema): boolean =>
  (js.type === undefined || js.type === "object") &&
  (js.additionalProperties === undefined || Predicate.isBoolean(js.additionalProperties)) &&
  (js.properties === undefined || isRecord(js.properties)) &&
  (js.required === undefined || isStringArray(js.required)) &&
  Object.keys(js).every((key) => objectKeys.has(key) || isAnnotation(key))

/** A schema whose `type` rules out objects, so object constraints never apply to it. */
const excludesObject = (js: JsonSchema.JsonSchema): boolean =>
  Predicate.isString(js.type) ? js.type !== "object" : isStringArray(js.type) && !js.type.includes("object")

const isObjectSchema = (js: JsonSchema.JsonSchema): boolean =>
  js.type === "object" || (js.type === undefined && isPlainObject(js) && (js.properties ?? js.required) !== undefined)

/** Both objects at once: properties are combined, and a property defined twice must satisfy both. */
const mergeObjects = (left: JsonSchema.JsonSchema, right: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  const properties: { [x: string]: unknown } = { ...(left.properties as object | undefined) }
  for (const [key, schema] of Object.entries((right.properties as object | undefined) ?? {})) {
    const current = properties[key]
    properties[key] = current === undefined || JSON.stringify(current) === JSON.stringify(schema)
      ? schema
      : current === false || schema === false
      ? false
      : { allOf: [current, schema] }
  }
  const required = [...new Set([...(left.required as Array<string> ?? []), ...(right.required as Array<string> ?? [])])]
  const additionalProperties = left.additionalProperties === false || right.additionalProperties === false
    ? false
    : left.additionalProperties ?? right.additionalProperties
  return {
    ...(left.type === "object" || right.type === "object" ? { type: "object" } : {}),
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(required.length > 0 ? { required } : {}),
    ...(additionalProperties !== undefined ? { additionalProperties } : {})
  }
}

type Part =
  | { readonly _tag: "Object"; readonly schema: JsonSchema.JsonSchema }
  | {
    readonly _tag: "Choice"
    readonly mode: "anyOf" | "oneOf"
    readonly branches: ReadonlyArray<JsonSchema.JsonSchema>
  }

const mergeParts = (left: Part, right: Part): Part | undefined => {
  if (left._tag === "Object") {
    return right._tag === "Object"
      ? { _tag: "Object", schema: mergeObjects(left.schema, right.schema) }
      : mergeIntoChoice(left.schema, right)
  }
  return right._tag === "Object" ? mergeIntoChoice(right.schema, left) : undefined
}

/**
 * Distributes object constraints into each branch. A branch that cannot be an object is unaffected by
 * them, and is dropped when the object constraints require `type: "object"`.
 */
const mergeIntoChoice = (
  object: JsonSchema.JsonSchema,
  choice: Extract<Part, { readonly _tag: "Choice" }>
): Part | undefined => {
  const branches = choice.branches.flatMap((branch) =>
    excludesObject(branch)
      ? object.type === "object" ? [] : [branch]
      : [{ ...pick(branch, isAnnotation), ...mergeObjects(object, branch) }]
  )
  return branches.length === 0 ? undefined : { ...choice, branches }
}

/**
 * Normalizes object compositions the Effect JSON Schema importer cannot translate as-is.
 *
 * - `allOf` members that are plain objects are merged into one object. Each member is closed
 *   separately when `additionalProperties` is disabled, and the intersection of two closed objects
 *   with different properties is `Never`.
 * - Object constraints next to `anyOf`/`oneOf` are distributed into each branch. The importer cannot
 *   intersect an object with nested choices with several branches without expanding them.
 * - `type: "object"` next to branches that are all objects is redundant and dropped, so the union keeps
 *   its references and the wrapper is not closed into an empty object.
 *
 * Every rewrite is exact. Anything else is returned unchanged for the importer to handle.
 */
const makeNormalizer = (resolve: (key: string) => JsonSchema.JsonSchema | undefined) => {
  const resolving = new Set<string>()

  const prepare = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema =>
    rewriteNot(rewriteConditional(rewriteNullable(js)))

  /** The normalized schema, with a `$ref` replaced by its definition. */
  const dereference = (member: unknown): JsonSchema.JsonSchema | undefined => {
    if (!isRecord(member)) return undefined
    if (!Predicate.isString(member.$ref)) return compose(prepare(member))
    const { $ref, ...siblings } = member
    const key = JsonSchema.getReferenceKey($ref)
    if (key === undefined || resolving.has(key) || !Object.keys(siblings).every(isAnnotation)) return undefined
    const definition = resolve(key)
    if (definition === undefined) return undefined
    resolving.add(key)
    try {
      return { ...compose(prepare(definition)), ...siblings }
    } finally {
      resolving.delete(key)
    }
  }

  const toPart = (member: unknown): Part | undefined => {
    const schema = dereference(member)
    if (schema === undefined) return undefined
    if (isPlainObject(schema)) return { _tag: "Object", schema }
    const mode = choiceMode(schema)
    if (mode === undefined || !Object.keys(schema).every((key) => key === mode || isAnnotation(key))) return undefined
    const branches: Array<JsonSchema.JsonSchema> = []
    for (const branch of schema[mode] as ReadonlyArray<unknown>) {
      const resolved = dereference(branch)
      if (resolved === undefined || !(isPlainObject(resolved) || excludesObject(resolved))) return undefined
      branches.push(resolved)
    }
    return { _tag: "Choice", mode, branches }
  }

  const compose = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
    const mode = choiceMode(js)
    const allOf = Array.isArray(js.allOf) ? js.allOf : []
    const { allOf: _allOf, anyOf: _anyOf, oneOf: _oneOf, ...rest } = js
    if (!isPlainObject(rest)) return js
    const own = pick(rest, (key) => objectKeys.has(key))
    const hasOwn = own.properties !== undefined || own.required !== undefined
    const members = mode === undefined ? allOf : [...allOf, { [mode]: js[mode] }]
    // Leave a single source of constraints alone, so a lone `$ref` keeps its name
    if ((hasOwn ? 1 : 0) + members.length < 2) return js
    let part: Part = { _tag: "Object", schema: own }
    for (const member of members) {
      const next = toPart(member)
      const merged: Part | undefined = next === undefined ? undefined : mergeParts(part, next)
      if (merged === undefined) return js
      part = merged
    }
    const annotations = pick(rest, isAnnotation)
    return part._tag === "Object"
      ? { ...annotations, ...part.schema }
      : { ...annotations, [part.mode]: part.branches }
  }

  const dropRedundantObjectType = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
    const mode = choiceMode(js)
    if (mode === undefined || js.type !== "object") return js
    const { type: _, ...rest } = js
    if (!Object.keys(rest).every((key) => key === mode || isAnnotation(key))) return js
    const branches = rest[mode] as ReadonlyArray<unknown>
    return branches.every((branch) => {
        const resolved = dereference(branch)
        return resolved !== undefined && isObjectSchema(resolved)
      })
      ? rest
      : js
  }

  return (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => dropRedundantObjectType(compose(prepare(js)))
}

/**
 * Resolves `#/$defs` keys against the spec's component schemas, converted to Draft 2020-12 the same
 * way the OpenAPI generator converts them.
 */
const makeResolver = (spec: Schema.Json) => {
  const components = isRecord(spec) && isRecord(spec.components) && isRecord(spec.components.schemas)
    ? spec.components.schemas
    : {}
  const openapi = isRecord(spec) && Predicate.isString(spec.openapi) ? spec.openapi : ""
  const convert = openapi.trim().startsWith("3.0") ? JsonSchema.fromSchemaOpenApi3_0 : JsonSchema.fromSchemaOpenApi3_1
  const cache = new Map<string, JsonSchema.JsonSchema | undefined>()
  return (key: string): JsonSchema.JsonSchema | undefined => {
    if (!cache.has(key)) {
      const definition = Object.hasOwn(components, key) ? components[key] : undefined
      cache.set(key, isRecord(definition) ? convert(definition).schema : undefined)
    }
    return cache.get(key)
  }
}

/** A closed object without properties would drop every key, so only objects with properties are closed. */
const shouldClose = (js: JsonSchema.JsonSchema): boolean =>
  js.type === "object" &&
  isRecord(js.properties) && Object.keys(js.properties).length > 0 &&
  js.additionalProperties === undefined &&
  js.allOf === undefined && js.anyOf === undefined && js.oneOf === undefined

/**
 * Layer providing the CodeGenerator service.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<
  CodeGenerator,
  never,
  OpenApiGenerator.OpenApiGenerator | FileSystem.FileSystem | Path_.Path
> = Effect.gen(function*() {
  const openApiGen = yield* OpenApiGenerator.OpenApiGenerator
  const pathService = yield* Path_.Path

  const applyPatches = Effect.fn("applyPatches")(function*(
    provider: DiscoveredProvider,
    spec: Schema.Json
  ) {
    const patchInputs = provider.config.patchList
    if (patchInputs.length === 0) {
      return spec
    }

    // Parse all patches, resolving file paths relative to the provider package
    const parsedPatches = yield* Effect.forEach(patchInputs, (input) => {
      // If it looks like a file path and is not absolute, resolve relative to package
      const trimmed = input.trimStart()
      const resolvedInput = !trimmed.startsWith("[") && !pathService.isAbsolute(trimmed)
        ? pathService.join(provider.packagePath, trimmed)
        : trimmed
      return OpenApiPatch.parsePatchInput(resolvedInput).pipe(
        Effect.map((patch) => ({ source: resolvedInput, patch }))
      )
    }).pipe(
      Effect.mapError((cause) => new PatchError({ provider: provider.name, cause }))
    )

    // Apply all patches to the spec
    return yield* OpenApiPatch.applyPatches(parsedPatches, spec).pipe(
      Effect.mapError((cause) => new PatchError({ provider: provider.name, cause }))
    )
  })

  const generate = Effect.fn("generate")(function*(
    provider: DiscoveredProvider,
    spec: unknown
  ) {
    // Apply patches if any are configured
    const patchedSpec = yield* applyPatches(provider, spec as Schema.Json)

    const excludeAnnotations = provider.config.excludeAnnotationsList
    const disableAdditionalProperties = provider.config.shouldDisableAdditionalProperties

    const exclude = excludeAnnotations ? new Set(excludeAnnotations) : undefined
    const normalize = makeNormalizer(makeResolver(patchedSpec))
    const onEnter = (js: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
      const out = { ...normalize(normalizeOpenEnum(js)) }
      if (exclude) {
        for (const key of exclude) delete out[key]
      }
      if (disableAdditionalProperties && shouldClose(out)) {
        out.additionalProperties = false
        // Specs sometimes require keys they never declare; closing must not make those keys impossible
        const properties = out.properties as { readonly [x: string]: unknown }
        const undeclared = isStringArray(out.required)
          ? out.required.filter((key) => !Object.hasOwn(properties, key))
          : []
        if (undeclared.length > 0) {
          out.properties = { ...properties, ...Object.fromEntries(undeclared.map((key) => [key, {}])) }
        }
      }
      return out
    }

    return yield* openApiGen
      .generate(patchedSpec as unknown as Parameters<typeof openApiGen.generate>[0], {
        name: provider.config.clientName,
        format: provider.config.isTypeOnly ? "httpclient-type-only" : "httpclient",
        onEnter
      })
      .pipe(
        Effect.mapError((cause) => new GenerationError({ provider: provider.name, cause }))
      )
  })

  return { generate }
}).pipe(Layer.effect(CodeGenerator))

/**
 * Layer providing the CodeGenerator with schema transformer (default).
 *
 * @category layers
 * @since 4.0.0
 */
export const layerSchema: Layer.Layer<CodeGenerator, never, FileSystem.FileSystem | Path_.Path> = layer.pipe(
  Layer.provide(OpenApiGenerator.layerTransformerSchema)
)

/**
 * Layer providing the CodeGenerator with TypeScript-only transformer.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerTypeScript: Layer.Layer<CodeGenerator, never, FileSystem.FileSystem | Path_.Path> = layer.pipe(
  Layer.provide(OpenApiGenerator.layerTransformerTs)
)
