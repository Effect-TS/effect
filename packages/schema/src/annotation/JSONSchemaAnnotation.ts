/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export const JSONSchemaAnnotationId = "@fp-ts/schema/annotation/JSONSchemaAnnotation"

/**
 * @since 1.0.0
 */
export type JSONSchema = {}

/**
 * @since 1.0.0
 */
export interface JSONSchemaAnnotation {
  readonly _id: typeof JSONSchemaAnnotationId
  readonly schema: JSONSchema
}

/**
 * @since 1.0.0
 */
export const isJSONSchemaAnnotation = (u: unknown): u is JSONSchemaAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === JSONSchemaAnnotationId

/**
 * @since 1.0.0
 */
export const jsonSchemaAnnotation = (schema: JSONSchema): JSONSchemaAnnotation => ({
  _id: JSONSchemaAnnotationId,
  schema
})
