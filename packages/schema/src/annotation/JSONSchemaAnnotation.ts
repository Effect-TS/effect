/**
 * @since 1.0.0
 */
import * as AST from "@fp-ts/schema/AST"

/**
 * @since 1.0.0
 */
export const JSONSchemaAnnotationId = "@fp-ts/schema/annotation/JSONSchemaAnnotation"

/**
 * @since 1.0.0
 */
export interface JSONSchemaAnnotation {
  readonly schema: object
}

/**
 * @since 1.0.0
 */
export const jsonSchemaAnnotation = (schema: object): JSONSchemaAnnotation => ({
  schema
})

/**
 * @since 1.0.0
 */
export const getJSONSchemaAnnotation = AST.getAnnotation<JSONSchemaAnnotation>(
  JSONSchemaAnnotationId
)
