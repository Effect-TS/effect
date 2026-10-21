import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/** Documented /2/users/me user object. Identity is the string user id. Email is
 * confirmed_email and only present when users.email was granted. */
export const XUserProfile = Schema.Struct({
  id: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  name: Schema.optionalKey(text),
  username: Schema.optionalKey(text),
  profile_image_url: Schema.optionalKey(url),
  confirmed_email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320)))
})

export type XUserProfile = typeof XUserProfile.Type
