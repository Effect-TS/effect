import * as Schema from "effect/Schema"

import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { VercelUserProfile } from "./profile.ts"

const Registration = Schema.Struct({
  ...OidcPresetRegistration.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email", "offline_access"]))
  )
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** Vercel OpenID Connect with optional offline_access consent. Give this issuer
 * a distinct callback because it does not advertise response iss. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, Registration, (registration) => ({
    ...registration,
    protocol: "oidc",
    issuer: "https://vercel.com",
    responseIssuerMode: "unsupported",
    profileSchema: VercelUserProfile
  }))
