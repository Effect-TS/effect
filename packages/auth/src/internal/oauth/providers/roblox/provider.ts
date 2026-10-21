import { discoveryProfile } from "../shared/discovery.ts"
import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { RobloxUserProfile } from "./profile.ts"

export type ProviderRegistration = typeof OidcPresetRegistration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** Roblox OpenID Connect. The issuer keeps its trailing slash. Roblox documents
 * S256 PKCE but omits it from discovery, so the preset supplies that advertisement.
 * Roblox does not advertise response iss. Third-party apps do not receive email. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, OidcPresetRegistration, (registration) => ({
    ...registration,
    protocol: "oidc",
    issuer: "https://apis.roblox.com/oauth/",
    responseIssuerMode: "unsupported",
    idTokenSignedResponseAlg: "ES256",
    profileSchema: RobloxUserProfile,
    [discoveryProfile]: "roblox"
  }))
