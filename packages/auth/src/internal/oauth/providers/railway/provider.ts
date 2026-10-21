import { discoveryProfile } from "../shared/discovery.ts"
import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { RailwayUserProfile } from "./profile.ts"

export type ProviderRegistration = typeof OidcPresetRegistration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** Railway OpenID Connect. Discovery is fetched from the published `/oauth`
 * document. Verification keeps issuer `https://backboard.railway.com`. ID tokens
 * omit name, email, and picture, so the preset merges UserInfo. Response iss
 * stays required. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, OidcPresetRegistration, (registration) => ({
    ...registration,
    protocol: "oidc",
    issuer: "https://backboard.railway.com",
    idTokenSignedResponseAlg: "ES256",
    userInfo: "merge",
    profileSchema: RailwayUserProfile,
    [discoveryProfile]: "railway"
  }))
