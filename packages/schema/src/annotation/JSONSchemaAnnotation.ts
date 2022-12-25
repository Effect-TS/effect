/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"

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
export const getJSONSchemaAnnotation = I.getAnnotation<JSONSchemaAnnotation>(JSONSchemaAnnotationId)
