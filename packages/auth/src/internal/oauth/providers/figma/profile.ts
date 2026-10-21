import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/** Documented /v1/me user object. Identity is the string user id. */
export const FigmaUserProfile = Schema.Struct({
  id: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  handle: Schema.optionalKey(text),
  img_url: Schema.optionalKey(url)
})

export type FigmaUserProfile = typeof FigmaUserProfile.Type
