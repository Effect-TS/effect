import * as Schema from "effect/Schema"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const text = Schema.String.check(Schema.isMaxLength(256))

/** Standard profile plus LINE authentication-method references from verified ID
 * tokens. LINE `sub` is the user ID for that provider, shared across its channels. */
export const LineUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  amr: Schema.optionalKey(Schema.Array(text))
})

export type LineUserProfile = typeof LineUserProfile.Type
