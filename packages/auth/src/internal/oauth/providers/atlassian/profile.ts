import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/** Documented /me user object. Identity is account_id. Site access is a separate
 * GET to /oauth/token/accessible-resources after the application retains a grant. */
export const AtlassianUserProfile = Schema.Struct({
  account_id: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  name: Schema.optionalKey(text),
  picture: Schema.optionalKey(url),
  nickname: Schema.optionalKey(text),
  locale: Schema.optionalKey(text),
  account_status: Schema.optionalKey(text),
  account_type: Schema.optionalKey(text)
})

export type AtlassianUserProfile = typeof AtlassianUserProfile.Type
