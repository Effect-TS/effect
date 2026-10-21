import { discoveryProfile } from "../shared/discovery.ts"
import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { LineUserProfile } from "./profile.ts"

export type ProviderRegistration = typeof OidcPresetRegistration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** LINE Login through the shared OIDC implementation. Web authorization-code
 * tokens use HS256 and the channel secret; discovery advertises only ES256, so
 * the preset supplies the documented web algorithm. LINE does not advertise
 * response iss, so the host must give it a distinct callback. `sub` is the user
 * ID for that LINE provider and is shared across its channels. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, OidcPresetRegistration, (registration) => ({
    ...registration,
    protocol: "oidc",
    issuer: "https://access.line.me",
    responseIssuerMode: "unsupported",
    idTokenSignedResponseAlg: "HS256",
    profileSchema: LineUserProfile,
    [discoveryProfile]: "line"
  }))
