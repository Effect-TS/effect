import * as Schema from "effect/Schema"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const text = Schema.String.check(Schema.isMaxLength(256))

/** Standard profile plus Roblox account metadata from verified ID tokens.
 * Third-party apps do not receive email. Usernames are not durable identity. */
export const RobloxUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  type: Schema.optionalKey(text),
  created_at: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }))
  )
})

export type RobloxUserProfile = typeof RobloxUserProfile.Type
