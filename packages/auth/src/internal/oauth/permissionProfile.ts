import * as Schema from "effect/Schema"

import { OAuthGeneration, OAuthProviderKey } from "./schema.ts"

const label = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._:/-]{1,256}$/))
const duration = Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 2592000000 }))

export const OAuthGrantId = label.pipe(Schema.brand("effect-auth/OAuthGrantId"))

export const OAuthPermissionProfileKey = label.pipe(
  Schema.brand("effect-auth/OAuthPermissionProfileKey")
)

export const OAuthConnectedScopes = Schema.Array(
  Schema.String.check(Schema.isPattern(/^[\x21\x23-\x5b\x5d-\x7e]{1,256}$/))
).check(Schema.isMaxLength(64))

export const OAuthConnectedResources = Schema.Array(
  Schema.NonEmptyString.check(Schema.isMaxLength(2048))
).check(Schema.isMaxLength(16))

export const OAuthConnectedProfile = Schema.Struct({
  key: OAuthPermissionProfileKey,
  generation: OAuthGeneration,
  issuance: Schema.Literals(["active", "retired"]),
  provider: OAuthProviderKey,
  clientRegistrationId: label,
  scopes: OAuthConnectedScopes,
  resources: OAuthConnectedResources,
  retention: Schema.Literals(["access-only", "access-and-refresh"]),
  maximumAccessLifetimeMillis: duration,
  maximumRefreshLifetimeMillis: Schema.optionalKey(duration),
  refreshAheadMillis: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 300000 })),
  refresh: Schema.Literals(["unsupported", "confidential", "rotating"]),
  revocation: Schema.Literals(["unsupported", "provider"])
})

export type OAuthConnectedProfile = typeof OAuthConnectedProfile.Type
