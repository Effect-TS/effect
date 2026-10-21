/**
 * Validated and branded OAuth scope declarations with literal name inference.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Schema from "effect/Schema"

const validScope = Schema.isPattern(/^[\x21\x23-\x5B\x5D-\x7E]{1,128}$/)
const brand = Schema.brand("effect-auth/OAuthScope")

/**
 * Schema for a validated OAuth scope. Wire values remain strings.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const OAuthScope = Schema.String.check(validScope).pipe(brand)

/**
 * Branded OAuth scope preserving its declared literal name.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type OAuthScope<Name extends string = string> = Name & typeof OAuthScope.Type

/**
 * Declares a scope while preserving its literal name and nominal type.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = <const Name extends string>(name: Name): OAuthScope<Name> =>
  Schema.Literal(name).check(validScope).pipe(brand).make(name)
