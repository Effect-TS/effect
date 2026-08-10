/**
 * Helpers for normalizing and converting JSON Schema and OpenAPI schema
 * documents. Supported inputs include JSON Schema Draft-07, Draft 2020-12,
 * OpenAPI 3.0, and OpenAPI 3.1; conversions normalize through
 * `Document<"draft-2020-12">` before emitting another dialect, including
 * JSON Schema Draft-04. The module also defines document types, meta-schema
 * constants, OpenAPI component-key helpers, and `$ref` resolution utilities.
 *
 * @since 4.0.0
 */
import * as Arr from "./Array.ts"
import * as InternalRecord from "./internal/record.ts"
import { unescapeToken } from "./JsonPointer.ts"
import * as Predicate from "./Predicate.ts"
import * as Rec from "./Record.ts"

/**
 * A plain object representing a single JSON Schema node.
 *
 * **When to use**
 *
 * Use to represent an arbitrary JSON Schema object regardless of dialect.
 *
 * **Details**
 *
 * This is an open record type (`[x: string]: unknown`) so it can hold any JSON
 * Schema keyword. Most functions in this module accept or return this type.
 *
 * @category models
 * @since 4.0.0
 */
export interface JsonSchema {
  [x: string]: unknown
}

/**
 * The set of JSON Schema dialects supported by this module.
 *
 * **When to use**
 *
 * Use as the dialect marker for `JsonSchema` documents when parsing,
 * converting, or emitting schemas across the supported formats.
 *
 * **Details**
 *
 * Supported values are `"draft-04"` for JSON Schema Draft-04, `"draft-07"`
 * for JSON Schema Draft-07, `"draft-2020-12"` for JSON Schema Draft 2020-12
 * and the canonical internal form, `"openapi-3.1"` for OpenAPI 3.1, and
 * `"openapi-3.0"` for OpenAPI 3.0.
 *
 * @see {@link Document} for a single root schema tagged with a dialect
 * @see {@link MultiDocument} for multiple root schemas tagged with a dialect
 *
 * @category models
 * @since 4.0.0
 */
export type Dialect = "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.1" | "openapi-3.0"

/**
 * The JSON Schema primitive type names.
 *
 * **When to use**
 *
 * Use to restrict a JSON Schema `type` keyword to the supported primitive names.
 *
 * @category models
 * @since 4.0.0
 */
export type Type = "string" | "number" | "boolean" | "array" | "object" | "null" | "integer"

/**
 * A record of named JSON Schema definitions, keyed by definition name.
 *
 * **When to use**
 *
 * Use as the shared lookup table for named JSON Schema nodes that are
 * referenced from JSON Schema documents.
 *
 * **Details**
 *
 * The map is dialect-neutral. Conversion APIs emit it as `$defs`,
 * `definitions`, or `components.schemas` depending on the target format.
 *
 * @see {@link Document} for a single root schema with definitions
 * @see {@link MultiDocument} for multiple root schemas sharing definitions
 * @see {@link resolve$ref} for resolving a `$ref` against definitions
 *
 * @category models
 * @since 4.0.0
 */
export interface Definitions extends Record<string, JsonSchema> {}

/**
 * A structured container for a single JSON Schema and its associated
 * definitions.
 *
 * **When to use**
 *
 * Use when you need to carry a root schema together with its shared
 * definitions, or when converting between dialects with the `from*` and `to*`
 * functions.
 *
 * **Details**
 *
 * The `schema` field holds the root schema *without* the definitions
 * collection. Root definitions are stored separately in `definitions` and
 * referenced via `#/$defs/<name>` for Draft-2020-12, `#/definitions/<name>`
 * for Draft-04 and Draft-07, and `#/components/schemas/<name>` for OpenAPI 3.1
 * and OpenAPI 3.0.
 *
 * **Example** (Inspecting a parsed document)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const raw: JsonSchema.JsonSchema = {
 *   type: "string",
 *   $defs: { Trimmed: { type: "string", minLength: 1 } }
 * }
 *
 * const doc = JsonSchema.fromSchemaDraft2020_12(raw)
 *
 * doc.dialect // => "draft-2020-12"
 * doc.schema // => { type: "string" }
 * doc.definitions // => { Trimmed: { type: "string", minLength: 1 } }
 * ```
 *
 * @see {@link MultiDocument}
 * @see {@link fromSchemaDraft2020_12}
 * @category models
 * @since 4.0.0
 */
export interface Document<D extends Dialect> {
  readonly dialect: D
  readonly schema: JsonSchema
  readonly definitions: Definitions
}

/**
 * Like {@link Document}, but carries multiple root schemas that share a
 * single definitions pool.
 *
 * **When to use**
 *
 * Use when generating several schemas, such as a request body
 * and a response body, that reference the same set of definitions.
 *
 * **Details**
 *
 * The `schemas` tuple is non-empty and contains at least one element.
 *
 * @see {@link Document}
 * @see {@link toMultiDocumentOpenApi3_1}
 * @category models
 * @since 4.0.0
 */
export interface MultiDocument<D extends Dialect> {
  readonly dialect: D
  readonly schemas: readonly [JsonSchema, ...Array<JsonSchema>]
  readonly definitions: Definitions
}

/**
 * Represents the `$schema` meta-schema URI for JSON Schema Draft-04.
 *
 * **When to use**
 *
 * Use when constructing a Draft-04 JSON Schema document and you need a stable
 * value for the root `$schema` field.
 *
 * @see {@link META_SCHEMA_URI_DRAFT_07} for the Draft-07 `$schema` URI
 * @category constants
 * @since 4.0.0
 */
export const META_SCHEMA_URI_DRAFT_04 = "http://json-schema.org/draft-04/schema#"

/**
 * Represents the `$schema` meta-schema URI for JSON Schema Draft-07.
 *
 * **When to use**
 *
 * Use when constructing a Draft-07 JSON Schema document and you need a stable
 * value for the root `$schema` field.
 *
 * **Details**
 *
 * The exported value is the literal string
 * `http://json-schema.org/draft-07/schema#`.
 *
 * @see {@link META_SCHEMA_URI_DRAFT_04} for the Draft-04 `$schema` URI
 * @see {@link META_SCHEMA_URI_DRAFT_2020_12} for the Draft 2020-12 `$schema` URI
 *
 * @category constants
 * @since 4.0.0
 */
export const META_SCHEMA_URI_DRAFT_07 = "http://json-schema.org/draft-07/schema#"

/**
 * Represents the `$schema` meta-schema URI for JSON Schema Draft 2020-12.
 *
 * **When to use**
 *
 * Use when you need to populate the `$schema` field while emitting a JSON
 * Schema document that should declare JSON Schema Draft 2020-12.
 *
 * **Details**
 *
 * The exported value is the literal string
 * `https://json-schema.org/draft/2020-12/schema`.
 *
 * @see {@link META_SCHEMA_URI_DRAFT_07} for the Draft-07 `$schema` URI
 *
 * @category constants
 * @since 4.0.0
 */
export const META_SCHEMA_URI_DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema"

const RE_DEFINITIONS = /^#\/definitions(?=\/|$)/
const RE_DEFS = /^#\/\$defs(?=\/|$)/
const RE_COMPONENTS_SCHEMAS = /^#\/components\/schemas(?=\/|$)/

const DRAFT_04_COPY_KEYWORDS = new Set([
  "$ref",
  "type",
  "required",
  "enum",
  "title",
  "description",
  "default",
  "format",
  "pattern",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
  "multipleOf",
  "uniqueItems"
])

const DRAFT_07_COPY_KEYWORDS = new Set([
  ...DRAFT_04_COPY_KEYWORDS,
  "const",
  "examples",
  "readOnly",
  "writeOnly",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum"
])

const DRAFT_04_SINGLE_SUBSCHEMA_KEYWORDS = new Set(["not"])
const DRAFT_07_SINGLE_SUBSCHEMA_KEYWORDS = new Set(["not", "additionalProperties", "propertyNames"])

const MAP_SUBSCHEMA_KEYWORDS = new Set(["properties", "patternProperties"])
const ARRAY_SUBSCHEMA_KEYWORDS = new Set(["allOf", "anyOf", "oneOf"])

/**
 * Parses a raw Draft-07 JSON Schema into a `Document<"draft-2020-12">`.
 *
 * **When to use**
 *
 * Use when you have a raw JSON Schema object that follows Draft-07 conventions
 * and need the canonical Draft-2020-12 document representation.
 *
 * **Details**
 *
 * This converts Draft-07 tuple syntax (`items` as array plus
 * `additionalItems`) to Draft-2020-12 form (`prefixItems` plus `items`),
 * rewrites `#/definitions/...` refs to `#/$defs/...`, and extracts root-level
 * `definitions` into the `definitions` field.
 *
 * **Gotchas**
 *
 * Unsupported keywords, such as `if`/`then`/`else` and `$id`, are dropped.
 *
 * **Example** (Parsing a Draft-07 schema)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const raw: JsonSchema.JsonSchema = {
 *   type: "object",
 *   properties: {
 *     tags: {
 *       type: "array",
 *       items: { type: "string" }
 *     }
 *   }
 * }
 *
 * const doc = JsonSchema.fromSchemaDraft07(raw)
 * doc.dialect // => "draft-2020-12"
 * doc.schema.properties // => { tags: { type: "array", items: { type: "string" } } }
 * ```
 *
 * @see {@link fromSchemaDraft2020_12}
 * @see {@link fromSchemaOpenApi3_0}
 * @see {@link toDocumentDraft07}
 * @category decoding
 * @since 4.0.0
 */
export function fromSchemaDraft07(js: JsonSchema): Document<"draft-2020-12"> {
  let definitions: Definitions | undefined

  const schema = walk(js, true) as JsonSchema
  return {
    dialect: "draft-2020-12",
    schema,
    definitions: definitions ?? {}
  }

  function walk(node: unknown, isRoot: boolean): unknown {
    if (Array.isArray(node)) return node.map(walkNested)
    if (!Predicate.isObject(node)) return node

    const out: Record<string, unknown> = {}

    let prefixItems: unknown = undefined
    let additionalItems: unknown = undefined

    for (const k of Object.keys(node)) {
      const v = node[k]

      if (k === "$ref") {
        out.$ref = typeof v === "string" ? v.replace(RE_DEFINITIONS, "#/$defs") : v
        continue
      }
      if (DRAFT_07_COPY_KEYWORDS.has(k)) {
        out[k] = v
        continue
      }
      if (rewriteSubschemaKeyword(out, k, v, walkNested, DRAFT_07_SINGLE_SUBSCHEMA_KEYWORDS)) continue

      switch (k) {
        case "definitions": {
          const mapped = mapObject(v, walkNested)
          if (isRoot) {
            definitions = mapped as Definitions | undefined
          } else {
            out.definitions = mapped ?? v
          }
          break
        }

        case "items":
          prefixItems = v
          break
        case "additionalItems":
          additionalItems = v
          break

        default:
          break
      }
    }

    // Draft-07 tuples -> 2020-12 tuples
    if (prefixItems !== undefined) {
      if (Array.isArray(prefixItems)) {
        out.prefixItems = prefixItems.map(walkNested)
        if (additionalItems !== undefined) out.items = walkNested(additionalItems)
      } else {
        out.items = walkNested(prefixItems)
      }
    }

    return out
  }

  function walkNested(node: unknown): unknown {
    return walk(node, false)
  }
}

/**
 * Parses a raw Draft-2020-12 JSON Schema into a `Document<"draft-2020-12">`.
 *
 * **When to use**
 *
 * Use when you already have a raw JSON Schema object in Draft-2020-12 format.
 *
 * **Details**
 *
 * This separates `$defs` from the root schema into the `definitions` field.
 * Unlike {@link fromSchemaDraft07}, this performs no keyword rewriting.
 *
 * **Example** (Parsing a Draft-2020-12 schema)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const raw: JsonSchema.JsonSchema = {
 *   type: "number",
 *   minimum: 0,
 *   $defs: { PositiveInt: { type: "integer", minimum: 1 } }
 * }
 *
 * const doc = JsonSchema.fromSchemaDraft2020_12(raw)
 * doc.schema // => { type: "number", minimum: 0 }
 * doc.definitions // => { PositiveInt: { type: "integer", minimum: 1 } }
 * ```
 *
 * @see {@link fromSchemaDraft07}
 * @see {@link fromSchemaOpenApi3_1}
 * @category decoding
 * @since 4.0.0
 */
export function fromSchemaDraft2020_12(js: JsonSchema): Document<"draft-2020-12"> {
  const { $defs, ...schema } = js
  return {
    dialect: "draft-2020-12",
    schema,
    definitions: Predicate.isObject($defs) ? ($defs as Definitions) : {}
  }
}

/**
 * Parses a raw OpenAPI 3.1 JSON Schema into a `Document<"draft-2020-12">`.
 *
 * **When to use**
 *
 * Use when you need to consume raw JSON Schema objects from an OpenAPI 3.1
 * specification.
 *
 * **Details**
 *
 * This rewrites `#/components/schemas/...` refs to `#/$defs/...`, then delegates
 * to {@link fromSchemaDraft2020_12}.
 *
 * **Example** (Parsing an OpenAPI 3.1 schema)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const raw: JsonSchema.JsonSchema = {
 *   type: "object",
 *   properties: {
 *     user: { $ref: "#/components/schemas/User" }
 *   }
 * }
 *
 * const doc = JsonSchema.fromSchemaOpenApi3_1(raw)
 * doc.schema.properties // => { user: { $ref: "#/$defs/User" } }
 * ```
 *
 * @see {@link fromSchemaOpenApi3_0}
 * @see {@link toMultiDocumentOpenApi3_1}
 * @category decoding
 * @since 4.0.0
 */
export function fromSchemaOpenApi3_1(js: JsonSchema): Document<"draft-2020-12"> {
  const schema = rewriteRefs(js, (ref) => ref.replace(RE_COMPONENTS_SCHEMAS, "#/$defs"))
  return fromSchemaDraft2020_12(schema)
}

/**
 * Parses a raw OpenAPI 3.0 JSON Schema into a `Document<"draft-2020-12">`.
 *
 * **When to use**
 *
 * Use when you need to consume raw JSON Schema objects from an OpenAPI 3.0
 * specification.
 *
 * **Details**
 *
 * This handles OpenAPI 3.0 extensions, including `nullable`, singular
 * `example`, and boolean `exclusiveMinimum` or `exclusiveMaximum`. It
 * normalizes the schema to Draft-07 first, then converts to Draft-2020-12 via
 * {@link fromSchemaDraft07}.
 *
 * **Example** (Parsing an OpenAPI 3.0 nullable schema)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const raw: JsonSchema.JsonSchema = {
 *   type: "string",
 *   nullable: true
 * }
 *
 * const doc = JsonSchema.fromSchemaOpenApi3_0(raw)
 * doc.schema.type // => ["string", "null"]
 * ```
 *
 * @see {@link fromSchemaOpenApi3_1}
 * @see {@link fromSchemaDraft07}
 * @category decoding
 * @since 4.0.0
 */
export function fromSchemaOpenApi3_0(schema: JsonSchema): Document<"draft-2020-12"> {
  const normalized = normalizeOpenApi3_0ToDraft07(schema)
  return fromSchemaDraft07(normalized as JsonSchema)
}

/**
 * Converts a `Document<"draft-2020-12">` to a `Document<"draft-07">`.
 *
 * **When to use**
 *
 * Use when you need to output a canonical JSON Schema document in Draft-07
 * format.
 *
 * **Details**
 *
 * This rewrites `#/$defs/...` refs to `#/definitions/...`, converts
 * Draft-2020-12 tuple syntax (`prefixItems` plus `items`) to Draft-07 form
 * (`items` as array plus `additionalItems`), and converts both the root schema
 * and all definitions.
 *
 * **Gotchas**
 *
 * Unsupported Draft-2020-12 keywords are dropped.
 *
 * **Example** (Converting to Draft-07)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const doc = JsonSchema.fromSchemaDraft2020_12({
 *   type: "array",
 *   prefixItems: [{ type: "string" }, { type: "number" }],
 *   items: { type: "boolean" }
 * })
 *
 * const draft07 = JsonSchema.toDocumentDraft07(doc)
 * draft07.dialect // => "draft-07"
 * draft07.schema.items // => [{ type: "string" }, { type: "number" }]
 * draft07.schema.additionalItems // => { type: "boolean" }
 * ```
 *
 * @see {@link fromSchemaDraft07}
 * @see {@link toDocumentDraft04} for converting to Draft-04
 * @see {@link toMultiDocumentOpenApi3_1}
 * @category encoding
 * @since 4.0.0
 */
export function toDocumentDraft07(document: Document<"draft-2020-12">): Document<"draft-07"> {
  return {
    dialect: "draft-07",
    schema: toSchemaDraft07(document.schema),
    definitions: Rec.map(document.definitions, toSchemaDraft07)
  }
}

/**
 * Converts a `Document<"draft-2020-12">` to a `Document<"draft-04">`.
 *
 * **When to use**
 *
 * Use when you need to output a canonical JSON Schema document in Draft-04
 * format.
 *
 * **Details**
 *
 * This rewrites `#/$defs/...` refs to `#/definitions/...`, converts tuple
 * syntax, lowers `const` to `enum`, converts numeric exclusive bounds to the
 * Draft-04 boolean form, and converts both the root schema and all definitions.
 *
 * **Gotchas**
 *
 * Unsupported Draft-2020-12 and Draft-07 keywords are dropped. For example,
 * `propertyNames` has no general Draft-04 equivalent and is omitted.
 *
 * **Example** (Converting exclusive bounds)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const doc = JsonSchema.fromSchemaDraft2020_12({
 *   type: "number",
 *   exclusiveMinimum: 0
 * })
 *
 * JsonSchema.toDocumentDraft04(doc).schema // => { type: "number", minimum: 0, exclusiveMinimum: true }
 * ```
 *
 * @see {@link toDocumentDraft07} for converting to Draft-07
 * @category encoding
 * @since 4.0.0
 */
export function toDocumentDraft04(document: Document<"draft-2020-12">): Document<"draft-04"> {
  const draft07 = toDocumentDraft07(document)
  return {
    dialect: "draft-04",
    schema: toSchemaDraft04(draft07.schema),
    definitions: Rec.map(draft07.definitions, toSchemaDraft04)
  }
}

function toSchemaDraft04(schema: JsonSchema): JsonSchema {
  return walk(schema) as JsonSchema

  function walk(node: unknown): unknown {
    if (node === true) return {}
    if (node === false) return { not: {} }
    if (Array.isArray(node)) return node.map(walk)
    if (!Predicate.isObject(node)) return node

    const src = node as Record<string, unknown>
    const out: Record<string, unknown> = {}

    let hasConst = false
    let constValue: unknown = undefined

    for (const k of Object.keys(src)) {
      const v = src[k]

      if (DRAFT_04_COPY_KEYWORDS.has(k)) {
        out[k] = v
        continue
      }
      if (rewriteSubschemaKeyword(out, k, v, walk, DRAFT_04_SINGLE_SUBSCHEMA_KEYWORDS)) continue

      switch (k) {
        case "const":
          hasConst = true
          constValue = v
          break

        case "minimum":
        case "maximum":
        case "exclusiveMinimum":
        case "exclusiveMaximum":
          break

        case "additionalProperties":
        case "additionalItems":
          out[k] = typeof v === "boolean" ? v : walk(v)
          break

        case "items":
          out.items = Array.isArray(v) ? v.map(walk) : walk(v)
          break

        default:
          break
      }
    }

    convertExclusiveBound(src, out, "minimum", "exclusiveMinimum", (bound, exclusive) => bound > exclusive)
    convertExclusiveBound(src, out, "maximum", "exclusiveMaximum", (bound, exclusive) => bound < exclusive)

    if (hasConst) {
      const constSchema = { enum: [constValue] }
      if (Object.hasOwn(src, "enum")) {
        out.allOf = Array.isArray(out.allOf) ? [...out.allOf, constSchema] : [constSchema]
      } else {
        out.enum = constSchema.enum
      }
    }

    return out
  }
}

function convertExclusiveBound(
  src: Record<string, unknown>,
  out: Record<string, unknown>,
  boundKey: "minimum" | "maximum",
  exclusiveKey: "exclusiveMinimum" | "exclusiveMaximum",
  isBoundStricter: (bound: number, exclusive: number) => boolean
): void {
  const bound = src[boundKey]
  const exclusive = src[exclusiveKey]

  if (typeof exclusive === "number") {
    if (typeof bound === "number" && isBoundStricter(bound, exclusive)) {
      out[boundKey] = bound
    } else {
      out[boundKey] = exclusive
      out[exclusiveKey] = true
    }
  } else if (bound !== undefined) {
    out[boundKey] = bound
  }
}

function toSchemaDraft07(schema: JsonSchema): JsonSchema {
  return transformSchema(schema, (src) => {
    rewriteSchemaRef(src, (ref) => ref.replace(RE_DEFS, "#/definitions"))
    const out: Record<string, unknown> = {}

    let prefixItems: unknown = undefined
    let items: unknown = undefined

    for (const k of Object.keys(src)) {
      const v = src[k]

      if (k === "required" && Array.isArray(v) && v.length === 0) continue
      if (DRAFT_07_COPY_KEYWORDS.has(k)) {
        out[k] = v
        continue
      }
      if (
        MAP_SUBSCHEMA_KEYWORDS.has(k) ||
        ARRAY_SUBSCHEMA_KEYWORDS.has(k) ||
        DRAFT_07_SINGLE_SUBSCHEMA_KEYWORDS.has(k)
      ) {
        out[k] = v
        continue
      }

      switch (k) {
        // Tuple handling (2020-12 form)
        case "prefixItems":
          prefixItems = v
          break
        case "items":
          items = v
          break

        default:
          // drop everything else (subset)
          break
      }
    }

    // 2020-12 tuples -> Draft-07 tuples
    if (prefixItems !== undefined) {
      if (Array.isArray(prefixItems)) {
        out.items = prefixItems
        if (items !== undefined) out.additionalItems = items
      } else {
        // Non-standard, but keep a reasonable behavior
        out.items = prefixItems
      }
    } else if (items !== undefined) {
      // Regular items schema stays as items
      out.items = items
    }

    const $ref = out.$ref
    if (typeof $ref === "string" && Object.keys(out).length > 1) {
      delete out.$ref
      out.allOf = [{ $ref }, ...(Array.isArray(out.allOf) ? out.allOf : [])]
    }

    return out
  }) as JsonSchema
}

/**
 * Converts a `MultiDocument<"draft-2020-12">` to a
 * `MultiDocument<"openapi-3.1">`.
 *
 * **When to use**
 *
 * Use when you need to emit an OpenAPI 3.1 multi-document from canonical JSON
 * Schema documents.
 *
 * **Details**
 *
 * This rewrites local `#/$defs/...` refs to `#/components/schemas/...` and
 * sanitizes definition keys to match the OpenAPI component key pattern
 * (`^[a-zA-Z0-9.\-_]+$`) by replacing invalid characters with `_`. Valid keys
 * are preserved. When sanitized keys collide, the converter appends the first
 * available `_1`, `_2`, and subsequent suffix, with allocation independent of
 * definition insertion order. All local refs are updated to use the allocated
 * keys, including refs to paths within a definition.
 *
 * **Gotchas**
 *
 * External refs and local refs outside `#/$defs` are left unchanged.
 *
 * **Example** (Converting to OpenAPI 3.1)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const multi: JsonSchema.MultiDocument<"draft-2020-12"> = {
 *   dialect: "draft-2020-12",
 *   schemas: [{ $ref: "#/$defs/User" }],
 *   definitions: {
 *     User: { type: "object", properties: { name: { type: "string" } } }
 *   }
 * }
 *
 * const openapi = JsonSchema.toMultiDocumentOpenApi3_1(multi)
 * openapi.dialect // => "openapi-3.1"
 * openapi.schemas[0] // => { $ref: "#/components/schemas/User" }
 * ```
 *
 * @see {@link toDocumentDraft07}
 * @see {@link MultiDocument}
 * @category encoding
 * @since 4.0.0
 */
export function toMultiDocumentOpenApi3_1(multiDocument: MultiDocument<"draft-2020-12">): MultiDocument<"openapi-3.1"> {
  const definitionKeys = Object.keys(multiDocument.definitions)
  const keyMap = new Map<string, string>()
  const usedKeys = new Set(definitionKeys.filter((key) => VALID_OPEN_API_COMPONENTS_SCHEMAS_KEY_REGEXP.test(key)))
  const invalidKeys = definitionKeys
    .filter((key) => !VALID_OPEN_API_COMPONENTS_SCHEMAS_KEY_REGEXP.test(key))
    .sort()
    .map((key) => [key, sanitizeOpenApiComponentsSchemasKey(key)] as const)
  for (const [key, base] of invalidKeys) {
    if (usedKeys.has(base)) continue
    usedKeys.add(base)
    keyMap.set(key, base)
  }
  for (const [key, base] of invalidKeys) {
    if (keyMap.has(key)) continue
    let candidate: string
    let suffix = 0
    do candidate = `${base}_${++suffix}`
    while (usedKeys.has(candidate))
    usedKeys.add(candidate)
    keyMap.set(key, candidate)
  }

  function rewrite(schema: JsonSchema): JsonSchema {
    return rewriteRefs(schema, ($ref) => {
      if (!$ref.startsWith("#/$defs/")) return $ref

      const path = $ref.slice("#/$defs/".length)
      const separatorIndex = path.indexOf("/")
      const token = separatorIndex === -1 ? path : path.slice(0, separatorIndex)
      const rest = separatorIndex === -1 ? "" : path.slice(separatorIndex)
      const key = keyMap.get(unescapeToken(token)) ?? token
      return `#/components/schemas/${key}${rest}`
    })
  }

  return {
    dialect: "openapi-3.1",
    schemas: Arr.map(multiDocument.schemas, rewrite),
    definitions: Rec.mapEntries(
      multiDocument.definitions,
      (definition, key) => [keyMap.get(key) ?? key, rewrite(definition)]
    )
  }
}

/** @internal */
export const VALID_OPEN_API_COMPONENTS_SCHEMAS_KEY_REGEXP = /^[a-zA-Z0-9.\-_]+$/

/**
 * Returns a sanitized key for an OpenAPI component schema.
 * Should match the `^[a-zA-Z0-9.\-_]+$` regular expression.
 *
 * @internal
 */
export function sanitizeOpenApiComponentsSchemasKey(s: string): string {
  return s.length === 0 ? "_" : s.replace(/[^a-zA-Z0-9._-]/gu, "_")
}

function transformSchema(
  node: unknown,
  transform: (schema: Record<string, unknown>) => Record<string, unknown>
): unknown {
  return walk(node)

  function walk(node: unknown): unknown {
    if (!Predicate.isObject(node)) return node

    const out: Record<string, unknown> = {}
    for (const key of Object.keys(node)) {
      const value = node[key]
      let transformed = value
      switch (key) {
        case "$defs":
        case "properties":
        case "patternProperties":
        case "dependentSchemas":
          transformed = mapObject(value, walk) ?? value
          break
        case "allOf":
        case "anyOf":
        case "oneOf":
        case "prefixItems":
          transformed = Array.isArray(value) ? value.map(walk) : value
          break
        case "not":
        case "additionalProperties":
        case "propertyNames":
        case "unevaluatedProperties":
        case "items":
        case "contains":
        case "unevaluatedItems":
        case "if":
        case "then":
        case "else":
        case "contentSchema":
          transformed = walk(value)
      }
      InternalRecord.assignProperty(out, key, transformed)
    }
    return transform(out)
  }
}

/** @internal */
export function rewriteRefs(schema: JsonSchema, rewrite: ($ref: string) => string): JsonSchema {
  return transformSchema(schema, (schema) => rewriteSchemaRef(schema, rewrite)) as JsonSchema
}

function rewriteSchemaRef(
  schema: Record<string, unknown>,
  rewrite: ($ref: string) => string
): Record<string, unknown> {
  if (typeof schema.$ref === "string") {
    InternalRecord.assignProperty(schema, "$ref", rewrite(schema.$ref))
  }
  return schema
}

function mapObject(value: unknown, f: (node: unknown) => unknown): Record<string, unknown> | undefined {
  return Predicate.isObject(value) ? Rec.map(value, f) : undefined
}

function rewriteSubschemaKeyword(
  out: Record<string, unknown>,
  key: string,
  value: unknown,
  rewrite: (node: unknown) => unknown,
  singleKeywords: ReadonlySet<string>
): boolean {
  if (MAP_SUBSCHEMA_KEYWORDS.has(key)) {
    out[key] = mapObject(value, rewrite) ?? value
    return true
  }
  if (ARRAY_SUBSCHEMA_KEYWORDS.has(key)) {
    out[key] = Array.isArray(value) ? value.map(rewrite) : value
    return true
  }
  if (!singleKeywords.has(key)) return false
  out[key] = rewrite(value)
  return true
}

function normalizeOpenApi3_0ToDraft07(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeOpenApi3_0ToDraft07)
  if (!Predicate.isObject(node)) return node

  const src = node as Record<string, unknown>
  let out: Record<string, unknown> = {}

  for (const k of Object.keys(src)) {
    const v = src[k]
    if (k === "$ref" && typeof v === "string") {
      InternalRecord.assignProperty(out, k, v.replace(RE_COMPONENTS_SCHEMAS, "#/definitions"))
    } else if (k === "example") {
      if (src.examples === undefined) {
        out.examples = [v]
      }
    } else if (Array.isArray(v) || Predicate.isObject(v)) {
      InternalRecord.assignProperty(out, k, normalizeOpenApi3_0ToDraft07(v))
    } else {
      InternalRecord.assignProperty(out, k, v)
    }
  }

  // Draft-04-style numeric exclusivity booleans
  out = adjustExclusivity(out)

  // OpenAPI 3.0 nullable
  if (out.nullable === true) {
    out = applyNullable(out)
  }
  delete out.nullable

  return out
}

function adjustExclusivity(node: Record<string, unknown>): Record<string, unknown> {
  return adjustExclusiveBound(
    adjustExclusiveBound(node, "minimum", "exclusiveMinimum"),
    "maximum",
    "exclusiveMaximum"
  )
}

function adjustExclusiveBound(
  node: Record<string, unknown>,
  boundKey: "minimum" | "maximum",
  exclusiveKey: "exclusiveMinimum" | "exclusiveMaximum"
): Record<string, unknown> {
  const exclusive = node[exclusiveKey]
  if (typeof exclusive !== "boolean") return node

  const out = { ...node }
  if (exclusive && typeof node[boundKey] === "number") {
    out[exclusiveKey] = node[boundKey]
    delete out[boundKey]
  } else {
    delete out[exclusiveKey]
  }
  return out
}

function applyNullable(node: Record<string, unknown>): Record<string, unknown> {
  // enum widening
  if (Array.isArray(node.enum)) {
    return widenType({
      ...node,
      enum: node.enum.includes(null) ? node.enum : [...node.enum, null]
    })
  }

  // type widening
  if (node.type !== undefined) return widenType(node)

  // const === null
  if (node.const === null) return node

  // fallback
  return { anyOf: [node, { type: "null" }] }
}

function widenType(node: Record<string, unknown>): Record<string, unknown> {
  const t = node.type
  if (typeof t === "string") return t === "null" ? node : { ...node, type: [t, "null"] }
  if (Array.isArray(t)) return t.includes("null") ? node : { ...node, type: [...t, "null"] }
  return node
}

/**
 * Resolves a `$ref` string by looking up the last path segment in a
 * definitions map.
 *
 * **When to use**
 *
 * Use when you need to dereference a `$ref` pointer to get the JSON Schema
 * object it points to.
 *
 * **Details**
 *
 * This only resolves the final segment of the ref path, such as `"User"` from
 * `"#/$defs/User"`. It returns `undefined` if the definition is not found.
 *
 * **Gotchas**
 *
 * This function does not follow arbitrary JSON Pointer paths.
 *
 * **Example** (Resolving a $ref)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const definitions: JsonSchema.Definitions = {
 *   User: { type: "object", properties: { name: { type: "string" } } }
 * }
 *
 * JsonSchema.resolve$ref("#/$defs/User", definitions) // => { type: "object", properties: { name: { type: "string" } } }
 * JsonSchema.resolve$ref("#/$defs/Unknown", definitions) // => undefined
 * ```
 *
 * @see {@link resolveTopLevel$ref}
 * @see {@link Definitions}
 * @category getters
 * @since 4.0.0
 */
export function resolve$ref($ref: string, definitions: Definitions): JsonSchema | undefined {
  const tokens = $ref.split("/")
  const identifier = unescapeToken(tokens[tokens.length - 1])
  if (Object.hasOwn(definitions, identifier)) return definitions[identifier]
}

/**
 * Resolves a document whose root schema is a top-level `$ref`.
 *
 * **When to use**
 *
 * Use when you need to dereference a top-level `$ref` before inspecting the
 * root JSON Schema object's properties directly.
 *
 * **Details**
 *
 * This returns the same object if no change is needed, or a shallow copy with
 * the resolved schema.
 *
 * **Example** (Resolving a top-level $ref)
 *
 * ```ts import.meta.vitest
 * import { JsonSchema } from "effect"
 *
 * const doc: JsonSchema.Document<"draft-2020-12"> = {
 *   dialect: "draft-2020-12",
 *   schema: { $ref: "#/$defs/User" },
 *   definitions: {
 *     User: { type: "object", properties: { name: { type: "string" } } }
 *   }
 * }
 *
 * const resolved = JsonSchema.resolveTopLevel$ref(doc)
 * resolved.schema // => { type: "object", properties: { name: { type: "string" } } }
 * ```
 *
 * @see {@link resolve$ref}
 * @see {@link Document}
 * @category transforming
 * @since 4.0.0
 */
export function resolveTopLevel$ref(document: Document<"draft-2020-12">): Document<"draft-2020-12"> {
  if (typeof document.schema.$ref === "string") {
    const schema = resolve$ref(document.schema.$ref, document.definitions)
    if (schema !== undefined) {
      return { ...document, schema }
    }
  }
  return document
}
