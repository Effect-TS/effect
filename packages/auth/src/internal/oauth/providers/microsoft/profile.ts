import * as Schema from "effect/Schema"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const entraId = Schema.String.check(
  Schema.isPattern(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u
  )
)

/** Entra ID profile claims from the verified ID token. oid and tid identify the
 * user; email and preferred_username never become the durable subject. picture
 * is absent here: Graph photo is a separate application-owned request. */
export const MicrosoftUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  oid: entraId,
  tid: entraId
})

export type MicrosoftUserProfile = typeof MicrosoftUserProfile.Type
