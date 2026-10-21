import * as Schema from "effect/Schema"

import { discoveryProfile } from "../shared/discovery.ts"
import { makeOidcPreset, type OidcPresetOptions, OidcPresetRegistration } from "../shared/preset.ts"
import { SlackUserProfile } from "./profile.ts"

const Registration = Schema.Struct({
  ...OidcPresetRegistration.fields,
  team: Schema.optionalKey(Schema.NonEmptyString.check(Schema.isMaxLength(256)))
})

export type ProviderRegistration = typeof Registration.Type
export type ProviderOptions = OidcPresetOptions<ProviderRegistration>

/** Slack OpenID Connect with workspace claims and pinned discovery supplementation.
 * Give it a distinct callback. team is a consent hint; authorize workspace membership
 * against verified claims. */
export const provider = (options: ProviderOptions) =>
  makeOidcPreset(options, Registration, ({ team, ...registration }) => ({
    ...registration,
    protocol: "oidc",
    issuer: "https://slack.com",
    responseIssuerMode: "unsupported",
    profileSchema: SlackUserProfile,
    [discoveryProfile]: "slack",
    ...(team === undefined ? {} : { authorizationParameters: { team } })
  }))
