import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/** Documented /public/v1/users user object. Identity is the numeric user_id. */
export const KickUserProfile = Schema.Struct({
  user_id: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
  name: Schema.optionalKey(text),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  profile_picture: Schema.optionalKey(url)
})

export type KickUserProfile = typeof KickUserProfile.Type
