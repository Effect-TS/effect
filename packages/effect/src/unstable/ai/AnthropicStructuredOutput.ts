/**
 * Adapts Effect Schema codecs to the JSON Schema subset accepted by Anthropic
 * structured output.
 *
 * The main entry point returns the JSON Schema to send to Anthropic and a codec
 * for decoding the model response back into the original application type. When
 * Anthropic cannot express the original schema shape directly, the conversion
 * rewrites supported cases such as tuples, records, optional properties, and
 * `oneOf` unions. Schema kinds that cannot be represented throw during
 * conversion instead of producing a lossy schema.
 *
 * @since 4.0.0
 */
import * as Arr from "../../Array.ts"
import * as JsonSchema from "../../JsonSchema.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import * as LanguageModel from "./LanguageModel.ts"
import * as OpenAiStructuredOutput from "./OpenAiStructuredOutput.ts"
import * as Tool from "./Tool.ts"

/**
 * Converts a `Schema.Codec` to Anthropic structured-output JSON Schema and a
 * matching codec for model output.
 *
 * **When to use**
 *
 * Use when you send Effect Schema-backed structured output requests to
 * Anthropic and need provider-compatible JSON Schema without losing the decoded
 * application type.
 *
 * **Details**
 *
 * Returns the JSON Schema to include in the request and the codec to use when
 * decoding the model response. If the input schema already fits Anthropic's
 * supported JSON Schema subset, the original codec is returned unchanged.
 *
 * **Gotchas**
 *
 * - Some schemas use a provider-safe encoded shape: tuples become objects with
 *   numeric string keys, records become arrays of `[key, value]` pairs, and
 *   optional properties become required nullable properties.
 * - `oneOf` unions are emitted as `anyOf` unions.
 * - Unsupported schema kinds throw during conversion instead of producing a
 *   lossy schema.
 *
 * @see {@link LanguageModel.CodecTransformer} for the structured-output transformer contract
 * @see {@link OpenAiStructuredOutput.toCodecOpenAI} for the OpenAI-specific transformer
 *
 * @category Codec Transformation
 * @since 4.0.0
 */
export function toCodecAnthropic<T, E, RD, RE>(
  schema: Schema.ConstraintCodec<T, E, RD, RE>
): {
  readonly codec: Schema.ConstraintCodec<T, unknown, RD, RE>
  readonly jsonSchema: JsonSchema.JsonSchema
} {
  return toCodecAnthropicWith(schema, Schema.toJsonSchemaDocument)
}

function toCodecAnthropicWith<T, E, RD, RE>(
  schema: Schema.ConstraintCodec<T, E, RD, RE>,
  toJsonSchemaDocument: (schema: Schema.Constraint) => JsonSchema.Document<"draft-2020-12">
): {
  readonly codec: Schema.ConstraintCodec<T, unknown, RD, RE>
  readonly jsonSchema: JsonSchema.JsonSchema
} {
  const to = schema.ast
  const from = recur(SchemaAST.toEncoded(to))
  const codec = from === to
    ? schema
    : Schema.make<typeof schema>(SchemaAST.decodeTo(from, to, SchemaTransformation.passthrough()))
  const document = JsonSchema.resolveTopLevel$ref(toJsonSchemaDocument(codec))
  const jsonSchema = { ...document.schema }
  if (Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions
  }
  return { codec, jsonSchema }
}

function recur(ast: SchemaAST.AST): SchemaAST.AST {
  switch (ast._tag) {
    case "Declaration":
    case "Void":
    case "Never":
    case "Unknown":
    case "Any":
    case "BigInt":
    case "Symbol":
    case "UniqueSymbol":
    case "ObjectKeyword":
    case "Enum":
    case "TemplateLiteral":
    case "Suspend":
      return unsupportedAst(
        ast,
        "Anthropic structured output does not support this schema kind; consider transforming the schema or using a different provider"
      )
    case "Undefined":
      return unsupportedAst(
        ast,
        "Anthropic structured output does not support undefined; consider transforming the schema or using a different provider; if using `Schema.optional`, consider using `Schema.optionalKey` instead"
      )
    case "Null":
      return ast
    case "String": {
      const { annotations, filters } = get(ast)
      if (annotations !== undefined || filters !== undefined) {
        return new SchemaAST.String(annotations, filters)
      }
      return ast
    }
    case "Number": {
      const { annotations, filters } = get(ast)
      if (annotations !== undefined || filters !== undefined) {
        return new SchemaAST.Number(annotations, filters)
      }
      return ast
    }
    case "Boolean":
      return ast
    case "Literal": {
      const literal = ast.literal
      if (typeof literal === "string" || typeof literal === "number" || typeof literal === "boolean") {
        const { annotations, filters } = get(ast)
        if (annotations !== undefined || filters !== undefined) {
          return new SchemaAST.Literal(ast.literal, annotations, filters)
        }
        return ast
      }
      throw new Error(
        `${errorPrefix}: Unsupported literal type ${typeof literal} (value: ${
          String(literal)
        }) (supported: string | number | boolean)`
      )
    }
    case "Union": {
      if (ast.mode === "oneOf") {
        return new SchemaAST.Union(ast.types, "anyOf", ast.annotations, ast.checks)
      }
      const types = SchemaAST.mapOrSame(ast.types, recur)
      const { annotations, filters } = get(ast)
      if (types !== ast.types || annotations !== undefined || filters !== undefined) {
        return new SchemaAST.Union(types, "anyOf", annotations, filters)
      }
      return ast
    }
    case "Arrays": {
      if (ast.rest.length > 1) {
        throw new Error(
          `${errorPrefix}: Post-rest elements are not supported for arrays (rest length: ${ast.rest.length})`
        )
      }
      let { annotations, filters } = get(ast)
      if (ast.elements.length > 0) {
        // tuples are not supported by Anthropic, we translate them to objects with string keys
        if (annotations !== undefined && typeof annotations.description === "string") {
          annotations.description = `${TUPLE_DESCRIPTION}; ${annotations.description}`
        } else {
          annotations ??= {}
          annotations.description = TUPLE_DESCRIPTION
        }
        const propertySignatures = ast.elements.map((e, i) => {
          return new SchemaAST.PropertySignature(String(i), e)
        })
        if (ast.rest.length === 1) {
          propertySignatures.push(
            new SchemaAST.PropertySignature(REST_PROPERTY_NAME, new SchemaAST.Arrays(false, [], ast.rest))
          )
        }
        return SchemaAST.decodeTo(
          recur(new SchemaAST.Objects(propertySignatures, [], annotations, filters)),
          ast,
          SchemaTransformation.transform({
            decode: (o) => {
              let t: Array<unknown> = []
              for (let i = 0; i < ast.elements.length; i++) {
                const k = String(i)
                if (o[k] !== undefined) {
                  t.push(o[k])
                }
              }
              if (REST_PROPERTY_NAME in o) {
                t = [...t, ...o[REST_PROPERTY_NAME]]
              }
              return t
            },
            encode: (t) => {
              const o: Record<string, unknown> = {}
              for (let i = 0; i < ast.elements.length; i++) {
                if (t.length >= i) {
                  o[String(i)] = t[i]
                }
              }
              if (ast.rest.length === 1) {
                o[REST_PROPERTY_NAME] = t.length >= ast.elements.length ? t.slice(ast.elements.length) : []
              }
              return o
            }
          })
        )
      } else {
        const rest = SchemaAST.mapOrSame(ast.rest, recur)
        if (rest !== ast.rest || annotations !== undefined || filters !== undefined) {
          return new SchemaAST.Arrays(false, [], rest, annotations, filters)
        }
        return ast
      }
    }
    case "Objects": {
      let { annotations, filters } = get(ast)
      if (ast.indexSignatures.length === 0) {
        const propertySignatures = SchemaAST.mapOrSame(ast.propertySignatures, (ps) => {
          if (typeof ps.name !== "string") {
            throw new Error(
              `${errorPrefix}: Property names must be strings (got ${typeof ps.name})`
            )
          }
          let type = recur(ps.type)
          // opttional properties are not supported by Anthropic, so we translate them to nullable unions
          if (SchemaAST.isOptional(ps.type)) {
            type = SchemaAST.decodeTo(
              new SchemaAST.Union([type, SchemaAST.null], "anyOf"),
              SchemaAST.optionalKey(type),
              SchemaTransformation.transformOptional({
                decode: Option.filter(Predicate.isNotNull),
                encode: Option.orElseSome(() => null)
              })
            )
          }
          if (type === ps.type) {
            return ps
          }
          return new SchemaAST.PropertySignature(ps.name, type)
        })
        if (
          propertySignatures !== ast.propertySignatures || annotations !== undefined || filters !== undefined
        ) {
          return new SchemaAST.Objects(propertySignatures, [], annotations, filters)
        }
      } else if (ast.indexSignatures.length === 1 && ast.propertySignatures.length === 0) {
        const is = ast.indexSignatures[0]
        if (Tool.isEmptyParamsRecord(is)) {
          return ast
        }
        // records are not supported by Anthropic, so we translate them to arrays of key-value pairs
        if (annotations !== undefined && typeof annotations.description === "string") {
          annotations.description = `${RECORD_DESCRIPTION}; ${annotations.description}`
        } else {
          annotations ??= {}
          annotations.description = RECORD_DESCRIPTION
        }
        return SchemaAST.decodeTo(
          recur(
            new SchemaAST.Arrays(false, [], [new SchemaAST.Arrays(false, [is.parameter, is.type], [])], annotations)
          ),
          ast,
          SchemaTransformation.transform({
            decode: Object.fromEntries,
            encode: Object.entries
          })
        )
      } else {
        throw new Error(
          `${errorPrefix}: unsupported object schema shape (properties: ${ast.propertySignatures.length}, indexSignatures: ${ast.indexSignatures.length}). Supported: plain objects (properties only) or records (single index signature, no properties)`
        )
      }
      return ast
    }
  }
}

const errorPrefix = "AnthropicStructuredOutput"

function unsupportedAst(ast: SchemaAST.AST, details?: string): never {
  const base = `Unsupported AST ${ast._tag}`
  const full = `${errorPrefix}: ${base}`
  throw new Error(details !== undefined ? `${full} (${details})` : full)
}

const REST_PROPERTY_NAME = "__rest__"

const RECORD_DESCRIPTION =
  "Object encoded as array of [key, value] pairs. Apply object constraints to the decoded object"

const TUPLE_DESCRIPTION =
  "Tuple encoded as an object with numeric string keys ('0', '1', ...). If present, '__rest__' contains remaining elements"

type Annotation =
  | { readonly _tag: "description"; readonly description: string }
  | { readonly _tag: "format"; readonly format: string }

type Filter =
  | Annotation
  | { readonly _tag: "filter"; readonly filter: SchemaAST.Filter<any> }

const get = (ast: SchemaAST.AST): {
  annotations: Record<string, string> | undefined
  filters: [SchemaAST.Check<any>, ...SchemaAST.Check<any>[]] | undefined
} => {
  const annotations: Record<string, string> = {}
  const filters: Array<SchemaAST.Filter<any>> = []
  const checks = getChecks(ast)
  if (checks.length > 0) {
    for (const check of checks) {
      switch (check._tag) {
        case "description": {
          if (annotations.description !== undefined) {
            annotations.description += ` and ${check.description}`
          } else {
            annotations.description = check.description
          }
          break
        }
        case "format": {
          annotations.format = check.format
          break
        }
        case "filter": {
          filters.push(check.filter)
          break
        }
      }
    }
  }
  return {
    annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
    filters: Arr.isArrayNonEmpty(filters) ? filters : undefined
  }
}

const getChecks = (ast: SchemaAST.AST): Array<Filter> => [
  ...(ast.checks !== undefined ? getFilters(ast.checks) : []),
  ...getAnnotations(ast.annotations)
]

const getAnnotations = (annotations: Schema.Annotations.Filter | undefined): Array<Annotation> => {
  const out: Array<Annotation> = []
  if (annotations !== undefined) {
    const id = annotations.representation?.id
    const description = annotations?.description
      ?? (id === "effect/schema/isInt" || id === "effect/schema/isFinite"
        ? undefined
        : annotations?.expected)
    if (typeof description === "string") {
      out.push({ _tag: "description", description })
    }
    const format = annotations?.format
    if (typeof format === "string") {
      if (formats.includes(format)) {
        out.push({ _tag: "format", format })
      } else {
        out.push({ _tag: "description", description: `a value with a format of ${format}` })
      }
    }
  }
  return out
}

function getFilter(filter: SchemaAST.Filter<any>): Array<Filter> {
  let out: Array<Filter> = []
  const annotations = getAnnotations(filter.annotations)
  const id = filter.annotations?.representation?.id
  if (id !== undefined) {
    switch (id) {
      case "effect/schema/isInt":
      case "effect/schema/isFinite": {
        out = out.concat(annotations)
        out.push({ _tag: "filter", filter: resetFilter(filter) })
        break
      }
      default: {
        out = out.concat(annotations)
        break
      }
    }
    if (isPattern(filter)) {
      out.push({ _tag: "filter", filter: resetFilter(filter) })
    }
  }
  return out
}

function isPattern(filter: SchemaAST.Filter<any>): boolean {
  return filter.annotations?.toJsonSchema?.({ type: undefined, schemas: [] }).pattern !== undefined
}

function resetFilter(filter: SchemaAST.Filter<any>): SchemaAST.Filter<any> {
  return filter.annotate({
    description: undefined,
    expected: undefined,
    title: undefined,
    format: undefined
  })
}

function getFilters(checks: readonly [SchemaAST.Check<any>, ...SchemaAST.Check<any>[]]): Array<Filter> {
  return checks.flatMap((check) => {
    switch (check._tag) {
      case "Filter":
        return getFilter(check)
      case "FilterGroup":
        return getFilters(check.checks)
    }
  })
}

const formats = [
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "ipv4",
  "ipv6",
  "uuid"
]
