import * as Schema from "effect/Schema"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const text = Schema.String.check(Schema.isMaxLength(256))

/** Standard profile plus Railway session id. Railway ID tokens omit name, email
 * and picture; the preset merges UserInfo after verification. */
export const RailwayUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  sid: Schema.optionalKey(text)
})

export type RailwayUserProfile = typeof RailwayUserProfile.Type
