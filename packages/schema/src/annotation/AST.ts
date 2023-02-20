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
export const BrandId = "@fp-ts/schema/annotation/BrandId"

/**
 * @since 1.0.0
 */
export type Custom = unknown

/**
 * @since 1.0.0
 */
export const CustomId = "@fp-ts/schema/annotation/CustomId"

/**
 * @since 1.0.0
 */
export type Message<A> = (a: A) => string

/**
 * @since 1.0.0
 */
export const MessageId = "@fp-ts/schema/annotation/MessageId"

/**
 * @since 1.0.0
 */
export type Identifier = string

/**
 * @since 1.0.0
 */
export const IdentifierId = "@fp-ts/schema/annotation/IdentifierId"

/**
 * @since 1.0.0
 */
export type Title = string

/**
 * @since 1.0.0
 */
export const TitleId = "@fp-ts/schema/annotation/TitleId"

/**
 * @since 1.0.0
 */
export type Description = string

/**
 * @since 1.0.0
 */
export const DescriptionId = "@fp-ts/schema/annotation/DescriptionId"

/**
 * @since 1.0.0
 */
export type Examples = ReadonlyArray<unknown>

/**
 * @since 1.0.0
 */
export const ExamplesId = "@fp-ts/schema/annotation/ExamplesId"

/**
 * @since 1.0.0
 */
export type JSONSchema = object

/**
 * @since 1.0.0
 */
export const JSONSchemaId = "@fp-ts/schema/annotation/JSONSchemaId"

/**
 * @since 1.0.0
 */
export type Documentation = string

/**
 * @since 1.0.0
 */
export const DocumentationId = "@fp-ts/schema/annotation/DocumentationId"
