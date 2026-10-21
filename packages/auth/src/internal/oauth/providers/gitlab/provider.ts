import * as Schema from "effect/Schema"

import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { GitLabUserProfile } from "./profile.ts"

const Registration = Schema.Struct({
  ...OidcPresetRegistration.fields,
  issuer: Schema.optionalKey(Schema.NonEmptyString.check(Schema.isMaxLength(2048)))
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** GitLab OpenID Connect, including self-hosted issuers. Preserve the exact issuer
 * and give it a distinct callback. Group membership remains application policy. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, Registration, ({ issuer, ...registration }) => ({
    ...registration,
    protocol: "oidc",
    issuer: issuer ?? "https://gitlab.com",
    responseIssuerMode: "unsupported",
    profileSchema: GitLabUserProfile
  }))
