import { OAuthConnectedProfile, OAuthPermissionProfileKey } from "../../permissionProfile.ts"
import { gitHubOAuthAppProviderKey } from "./models.ts"

/** Provider API permissions and token retention, supplied to OAuth.make({ access }). */
export const accessProfile = (options: {
  readonly clientId: string
  readonly scopes?: ReadonlyArray<string>
  readonly maximumRefreshLifetimeMillis?: number
}) =>
  OAuthConnectedProfile.make({
    key: OAuthPermissionProfileKey.make("github"),
    generation: 1,
    issuance: "active",
    provider: gitHubOAuthAppProviderKey,
    clientRegistrationId: options.clientId,
    scopes: options.scopes ?? ["read:user"],
    resources: [],
    retention: "access-and-refresh",
    maximumAccessLifetimeMillis: 8 * 60 * 60 * 1000,
    maximumRefreshLifetimeMillis: options.maximumRefreshLifetimeMillis ?? 30 * 24 * 60 * 60 * 1000,
    refreshAheadMillis: 60_000,
    refresh: "rotating",
    revocation: "provider"
  })
