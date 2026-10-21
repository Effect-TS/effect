import type * as Redacted from "effect/Redacted"

import type { OAuthConnectedProfile } from "../../permissionProfile.ts"
import { OAuthProviderKey } from "../../schema.ts"
import { OAuthIssuer } from "../../signInModels.ts"

/** @internal */
export const providerKey = OAuthProviderKey.make("strava")
/** @internal */
export const issuer = OAuthIssuer.make("https://www.strava.com")

export interface ProviderOptions {
  readonly clientId: string
  readonly clientSecret: Redacted.Redacted<string>
  readonly access?: OAuthConnectedProfile
}
