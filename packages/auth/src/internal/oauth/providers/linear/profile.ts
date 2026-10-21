import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))
const email = Schema.String.check(Schema.isMaxLength(320))

/** GraphQL viewer fields used for Linear sign-in. The numeric-looking id is a
 * Linear user id; email is not treated as verified. */
export const LinearUserProfile = Schema.Struct({
  id: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  name: Schema.optionalKey(Schema.NullOr(text)),
  email: Schema.optionalKey(Schema.NullOr(email)),
  avatarUrl: Schema.optionalKey(Schema.NullOr(url)),
  displayName: Schema.optionalKey(Schema.NullOr(text)),
  url: Schema.optionalKey(Schema.NullOr(url))
})

export type LinearUserProfile = typeof LinearUserProfile.Type
