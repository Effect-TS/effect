import * as Schema from "effect/Schema"

/** Sensitive credential material; service boundaries wrap this in Redacted. */
export const EncodedPasswordHash = Schema.String.check(Schema.isMaxLength(512)).pipe(
  Schema.brand("effect-auth/EncodedPasswordHash")
)

export type EncodedPasswordHash = typeof EncodedPasswordHash.Type

export const PasswordVerification = Schema.Struct({
  matches: Schema.Boolean,
  needsRehash: Schema.Boolean
})

export type PasswordVerification = typeof PasswordVerification.Type
