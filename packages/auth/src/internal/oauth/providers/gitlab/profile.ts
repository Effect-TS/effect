import * as Schema from "effect/Schema"

import { OidcStandardUserProfile } from "../shared/profile.ts"

const group = Schema.String.check(Schema.isMaxLength(2048))

/** GitLab ID-token claims, including optional group membership. Group lists are
 * application policy, not local identity. */
export const GitLabUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  groups: Schema.optionalKey(Schema.Array(group).check(Schema.isMaxLength(1024))),
  groups_direct: Schema.optionalKey(Schema.Array(group).check(Schema.isMaxLength(1024)))
})

export type GitLabUserProfile = typeof GitLabUserProfile.Type
