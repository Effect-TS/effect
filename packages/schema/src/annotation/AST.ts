/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export type Brand = ReadonlyArray<string>

/**
 * @since 1.0.0
 */
export const BrandId = "@effect/schema/annotation/BrandId"

/**
 * @since 1.0.0
 */
export type Type = string | symbol

/**
 * @since 1.0.0
 */
export const TypeId = "@effect/schema/annotation/TypeId"

/**
 * @since 1.0.0
 */
export type Message<A> = (a: A) => string

/**
 * @since 1.0.0
 */
export const MessageId = "@effect/schema/annotation/MessageId"

/**
 * @since 1.0.0
 */
export type Identifier = string

/**
 * @since 1.0.0
 */
export const IdentifierId = "@effect/schema/annotation/IdentifierId"

/**
 * @since 1.0.0
 */
export type Title = string

/**
 * @since 1.0.0
 */
export const TitleId = "@effect/schema/annotation/TitleId"

/**
 * @since 1.0.0
 */
export type Description = string

/**
 * @since 1.0.0
 */
export const DescriptionId = "@effect/schema/annotation/DescriptionId"

/**
 * @since 1.0.0
 */
export type Examples = ReadonlyArray<unknown>

/**
 * @since 1.0.0
 */
export const ExamplesId = "@effect/schema/annotation/ExamplesId"

/**
 * @since 1.0.0
 */
export type JSONSchema = object

/**
 * @since 1.0.0
 */
export const JSONSchemaId = "@effect/schema/annotation/JSONSchemaId"

/**
 * @since 1.0.0
 */
export type Documentation = string

/**
 * @since 1.0.0
 */
export const DocumentationId = "@effect/schema/annotation/DocumentationId"
