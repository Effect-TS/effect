/**
 * Shared schemas for application subjects, credential digests, locales, and email addresses.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

/**
 * Schema for an opaque application subject. The consumer maps it to its own account identifier.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const SubjectId = Schema.NonEmptyString.pipe(Schema.brand("effect-auth/SubjectId"))
/**
 * Decoded subject ID value.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SubjectId = typeof SubjectId.Type

/**
 * Schema for the digest of a high-entropy opaque credential, without its raw secret.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const TokenDigest = Schema.NonEmptyString.pipe(Schema.brand("effect-auth/TokenDigest"))
/**
 * Decoded token digest value.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type TokenDigest = typeof TokenDigest.Type

/**
 * Schema for an application locale hint, bounded and free of control characters.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Locale = Schema.NonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^(?![\s\S]*[\p{Cc}\p{Zl}\p{Zp}])[\s\S]*$/u)
)

/**
 * Ordinary ASCII addresses only; internationalized email is deferred. The
 * normalized (trimmed, fully lowercased) value is the identity key.
 */
const asciiEmailPattern =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

/**
 * Schema that trims and lowercases an ASCII email address for use as an identity key.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Email = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String.check(Schema.isPattern(asciiEmailPattern)).pipe(
      Schema.brand("effect-auth/Email")
    ),
    {
      decode: SchemaGetter.transform((value: string) => value.trim().toLowerCase()),
      encode: SchemaGetter.transform((value: string) => value)
    }
  )
)

/**
 * Decoded email value.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Email = typeof Email.Type
