import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const text = Schema.String.check(Schema.isMaxLength(256))

const appleFlag = Schema.Union([Schema.Boolean, Schema.Literals(["true", "false"])]).pipe(
  Schema.decodeTo(Schema.Boolean, {
    decode: SchemaGetter.transform(
      (value: boolean | "true" | "false") => value === true || value === "true"
    ),
    encode: SchemaGetter.transform((value: boolean) => value)
  })
)

/** Sign in with Apple ID-token claims. `email_verified` and `is_private_email`
 * arrive as booleans or the strings "true" and "false". Name is not in the ID
 * token; it arrives once in the `user` form field and is merged before this schema. */
export const AppleUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  email_verified: Schema.optionalKey(appleFlag),
  is_private_email: Schema.optionalKey(appleFlag),
  real_user_status: Schema.optionalKey(Schema.Literals([0, 1, 2])),
  transfer_sub: Schema.optionalKey(text)
})

export type AppleUserProfile = typeof AppleUserProfile.Type
