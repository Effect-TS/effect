import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

export const DropboxName = Schema.Struct({
  given_name: Schema.optionalKey(text),
  surname: Schema.optionalKey(text),
  familiar_name: Schema.optionalKey(text),
  display_name: Schema.optionalKey(text),
  abbreviated_name: Schema.optionalKey(text)
})

/** Dropbox /2/users/get_current_account fields used for sign-in. account_id is
 * the durable subject. email_verified is a provider claim, not an account-link
 * authority. */
export const DropboxUserProfile = Schema.Struct({
  account_id: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  name: Schema.optionalKey(DropboxName),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  email_verified: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
  profile_photo_url: Schema.optionalKey(url),
  country: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(16))),
  locale: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(32)))
})

export type DropboxUserProfile = typeof DropboxUserProfile.Type
