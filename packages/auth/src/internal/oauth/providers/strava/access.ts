import { OAuthConnectedProfile, OAuthPermissionProfileKey } from "../../permissionProfile.ts"
import { providerKey } from "./models.ts"

/** Declare permissions separately from provider secrets. */
export const accessProfile = (options: {
  readonly clientId: string
  readonly scopes: ReadonlyArray<string>
}) =>
  OAuthConnectedProfile.make({
    key: OAuthPermissionProfileKey.make("strava"),
    generation: 1,
    issuance: "active",
    provider: providerKey,
    clientRegistrationId: options.clientId,
    scopes: options.scopes,
    resources: [],
    retention: "access-and-refresh",
    maximumAccessLifetimeMillis: 6 * 60 * 60 * 1000,
    maximumRefreshLifetimeMillis: 30 * 24 * 60 * 60 * 1000,
    refreshAheadMillis: 60_000,
    refresh: "rotating",
    revocation: "unsupported"
  })
