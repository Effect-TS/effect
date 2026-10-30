/**
 * The elicitation request schemas, and the request metadata and `optional`
 * helper they use. `McpSchema` re-exports them, and `McpServerError` uses them
 * for `ElicitationDeclined` without importing `McpSchema`.
 *
 * @internal
 */
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"

/**
 * Creates an optional MCP struct-field schema from a required schema.
 *
 * **Details**
 *
 * The field may be absent, and explicit `undefined` values are omitted when
 * encoding.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const optional = <S extends Schema.Constraint>(
  schema: S
): Schema.decodeTo<Schema.toType<Schema.optional<S>>, Schema.optionalKey<S>> =>
  Schema.optionalKey(schema).pipe(
    Schema.decodeTo(Schema.toType(Schema.optional(schema)), {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.transformOptional(Option.flatMap(Option.fromUndefinedOr))
    })
  )

// Objects are checked one level deep. Incoming payloads come from JSON.parse and
// outgoing ones are serialized through Schema.toCodecJson.
export const UnknownObject = Schema.Record(Schema.String, Schema.Unknown)

/**
 * Schema for MCP progress tokens that associate progress notifications with the
 * original request.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const ProgressToken: Schema.Union<[
  typeof Schema.String,
  typeof Schema.Finite
]> = Schema.Union([Schema.String, Schema.Finite])

/**
 * Type represented by the MCP progress token schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ProgressToken = typeof ProgressToken.Type

/**
 * Schema for optional MCP request metadata.
 *
 * **Details**
 *
 * Request metadata may include a progress token that asks the receiver to send
 * out-of-band progress notifications for the request.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export class RequestMeta extends Schema.Opaque<RequestMeta>()(Schema.Struct({
  _meta: optional(Schema.StructWithRest(
    Schema.Struct({
      /**
       * If specified, the caller is requesting out-of-band progress notifications
       * for this request (as represented by notifications/progress). The value of
       * this parameter is an opaque token that will be attached to any subsequent
       * notifications. The receiver is not obligated to provide these
       * notifications.
       */
      progressToken: optional(ProgressToken)
    }),
    [UnknownObject]
  ))
})) {}

/**
 * Schema for a string field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class ElicitationString extends Schema.Class<ElicitationString>("@effect/ai/McpSchema/ElicitationString")({
  type: Schema.tag("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minLength: optional(Schema.Int),
  maxLength: optional(Schema.Int),
  format: optional(Schema.Literals(["email", "uri", "date", "date-time"])),
  default: optional(Schema.String)
}) {}

/**
 * Schema for a numeric field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class ElicitationNumber extends Schema.Class<ElicitationNumber>("@effect/ai/McpSchema/ElicitationNumber")({
  type: Schema.Literals(["number", "integer"]),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minimum: optional(Schema.Finite),
  maximum: optional(Schema.Finite),
  default: optional(Schema.Finite)
}) {}

/**
 * Schema for a boolean field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class ElicitationBoolean extends Schema.Class<ElicitationBoolean>("@effect/ai/McpSchema/ElicitationBoolean")({
  type: Schema.tag("boolean"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  default: optional(Schema.Boolean)
}) {}

/**
 * Schema for an untitled single-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class UntitledSingleSelectEnum extends Schema.Class<UntitledSingleSelectEnum>(
  "@effect/ai/McpSchema/UntitledSingleSelectEnum"
)({
  type: Schema.tag("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  enum: Schema.Array(Schema.String),
  default: optional(Schema.String)
}) {}

/**
 * Schema for a titled single-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class TitledSingleSelectEnum extends Schema.Class<TitledSingleSelectEnum>(
  "@effect/ai/McpSchema/TitledSingleSelectEnum"
)({
  type: Schema.tag("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  oneOf: Schema.Array(Schema.Struct({
    const: Schema.String,
    title: Schema.String
  })),
  default: optional(Schema.String)
}) {}

/**
 * Schema for every single-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export const SingleSelectEnum = Schema.Union([
  UntitledSingleSelectEnum,
  TitledSingleSelectEnum
])

/**
 * Type represented by the single-select elicitation field schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type SingleSelectEnum = typeof SingleSelectEnum.Type

/**
 * Schema for an untitled multi-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class UntitledMultiSelectEnum extends Schema.Class<UntitledMultiSelectEnum>(
  "@effect/ai/McpSchema/UntitledMultiSelectEnum"
)({
  type: Schema.tag("array"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minItems: optional(Schema.Int),
  maxItems: optional(Schema.Int),
  items: Schema.Struct({
    type: Schema.tag("string"),
    enum: Schema.Array(Schema.String)
  }),
  default: optional(Schema.Array(Schema.String))
}) {}

/**
 * Schema for a titled multi-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class TitledMultiSelectEnum extends Schema.Class<TitledMultiSelectEnum>(
  "@effect/ai/McpSchema/TitledMultiSelectEnum"
)({
  type: Schema.tag("array"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minItems: optional(Schema.Int),
  maxItems: optional(Schema.Int),
  items: Schema.Struct({
    anyOf: Schema.Array(Schema.Struct({
      const: Schema.String,
      title: Schema.String
    }))
  }),
  default: optional(Schema.Array(Schema.String))
}) {}

/**
 * Schema for every multi-select field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export const MultiSelectEnum = Schema.Union([
  UntitledMultiSelectEnum,
  TitledMultiSelectEnum
])

/**
 * Type represented by the multi-select elicitation field schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type MultiSelectEnum = typeof MultiSelectEnum.Type

/**
 * Schema for the legacy titled single-select elicitation field.
 *
 * @deprecated Use {@link TitledSingleSelectEnum} instead.
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class LegacyTitledEnum extends Schema.Class<LegacyTitledEnum>(
  "@effect/ai/McpSchema/LegacyTitledEnum"
)({
  type: Schema.tag("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  enum: Schema.Array(Schema.String),
  enumNames: optional(Schema.Array(Schema.String)),
  default: optional(Schema.String)
}) {}

/**
 * Schema for every enumeration field in an MCP elicitation form.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export const ElicitationEnum = Schema.Union([
  LegacyTitledEnum,
  SingleSelectEnum,
  MultiSelectEnum
])

/**
 * Type represented by the elicitation enumeration field schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ElicitationEnum = typeof ElicitationEnum.Type

/**
 * Schema for primitive field definitions accepted by MCP elicitation forms.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export const PrimitiveSchemaDefinition = Schema.Union([
  ElicitationEnum,
  ElicitationString,
  ElicitationNumber,
  ElicitationBoolean
])

/**
 * Type represented by the primitive elicitation field schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PrimitiveSchemaDefinition = typeof PrimitiveSchemaDefinition.Type

const ElicitationForm = Schema.Struct({
  $schema: optional(Schema.String),
  type: Schema.tag("object"),
  properties: Schema.Record(Schema.String, PrimitiveSchemaDefinition),
  required: optional(Schema.Array(Schema.String))
})

/**
 * Schema for form-mode MCP elicitation requests.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class ElicitRequestFormParams extends Schema.Class<ElicitRequestFormParams>(
  "@effect/ai/McpSchema/ElicitRequestFormParams"
)({
  ...RequestMeta.fields,
  mode: optional(Schema.Literal("form")),
  message: Schema.String,
  requestedSchema: ElicitationForm
}) {}

/**
 * Schema for URL-mode MCP elicitation requests.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export class ElicitRequestURLParams extends Schema.Class<ElicitRequestURLParams>(
  "@effect/ai/McpSchema/ElicitRequestURLParams"
)({
  ...RequestMeta.fields,
  mode: Schema.Literal("url"),
  message: Schema.String,
  elicitationId: Schema.String,
  url: Schema.String
}) {}

/**
 * Schema for every MCP elicitation request mode.
 *
 * @stability unstable
 * @category elicitation
 * @since 4.0.0
 */
export const ElicitRequestParams = Schema.Union([
  ElicitRequestFormParams,
  ElicitRequestURLParams
])

/**
 * Type represented by the MCP elicitation request parameters schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ElicitRequestParams = typeof ElicitRequestParams.Type
