import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import { OAuthConnectedProtocol } from "../../oauthConnectedProtocol.ts"
import { OAuthProtocol } from "../../oauthProtocol.ts"
import type { OAuthConnectedProfile } from "../../permissionProfile.ts"
import type { ProviderDefinition } from "../../providerDefinition.ts"
import type { OAuthUnavailable } from "../../signInErrors.ts"
import { installOAuthConfigurations } from "../shared/configuration.ts"
import type { OpenIdConnectConfigurationError } from "../shared/models.ts"
import type { Requirements } from "../shared/native.ts"
import { type RegistrationOptions, resolveOptions, resolveRegistration } from "../shared/options.ts"
import { PrivateKeyClientSecret } from "../shared/privateKeyJwt.ts"
import { makeOpenIdConnectOAuthProtocol } from "../shared/protocol.ts"
import type { GitHubOAuthAppConnectedProtocolOptions, GitHubOAuthAppGeneration } from "./models.ts"
import {
  makeGitHubOAuthAppConnectedProtocol,
  makeGitHubOAuthAppProtocol,
  makeGitHubOAuthAppProvider
} from "./protocol.ts"

/** GitHub.com OAuth App credentials and one or more exact callback destinations. */
export type Registration =
  & Pick<
    GitHubOAuthAppGeneration,
    "clientId" | "clientSecret" | "verifiedPrimaryEmail"
  >
  & RegistrationOptions

type Transport = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
}

export type Options =
  & Transport
  & (Registration | { readonly registrations: ReadonlyArray<Registration> })

export type ConnectedRegistration =
  & Registration
  & Pick<GitHubOAuthAppConnectedProtocolOptions["registrations"][number], "profiles">

export type ConnectedOptions =
  & Transport
  & (ConnectedRegistration | { readonly registrations: ReadonlyArray<ConnectedRegistration> })

const registration = Effect.fnUntraced(function*(input: Registration) {
  return { ...input, ...(yield* resolveRegistration(input, "github")) }
})

export type ProviderRegistration = Omit<Registration, "redirectUri" | "callbackId" | "callbacks">

export type ProviderOptions = Transport & {
  readonly access?: ReadonlyArray<OAuthConnectedProfile>
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

/** Declare GitHub for Http.layer. The host supplies its provider key and
 * callback destinations. Retired registrations remain available to finish flows.
 * Invalid registrations fail configure with OpenIdConnectConfigurationError. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: Effect.fn("GitHub.provider.configure")(function*(binding) {
    const registrations = yield* resolveOptions(() =>
      Effect.forEach(
        "registrations" in options ? options.registrations : [options],
        Effect.fnUntraced(function*(input) {
          return {
            ...input,
            ...(yield* resolveRegistration(
              { ...input, callbacks: binding.callbacks },
              binding.provider
            ))
          }
        })
      )
    )

    const providers = yield* Effect.forEach(registrations, makeGitHubOAuthAppProvider)

    const protocol = yield* makeOpenIdConnectOAuthProtocol(
      installOAuthConfigurations({
        providers: providers.map((input) => ({
          ...input,
          provider: binding.provider
        })),
        timeoutSeconds: options.timeoutSeconds ?? 10
      })
    ).pipe(Effect.provide(PrivateKeyClientSecret.layerUnused))

    const profiles = options.access

    if (profiles === undefined) return protocol

    const connected = yield* makeGitHubOAuthAppConnectedProtocol({
      registrations: registrations.map((input) => ({
        ...input,
        profiles: profiles.filter((profile) => profile.clientRegistrationId === input.clientId)
      })),
      timeoutSeconds: options.timeoutSeconds ?? 10
    })

    return { ...protocol, connected }
  })
})

/** GitHub OAuth sign-in. Defaults to callback ID github, generation 1, active
 * issuance and a 10-second request timeout. Does not install HTTP routes.
 * For rotation, provide registrations with one active generation and retain
 * retired generations through their issued flows' lifetime. Configuration is
 * validated when the Layer builds; existing protocol safety rules still apply. */
export const layer = (options: Options) =>
  Layer.effect(
    OAuthProtocol,
    resolveOptions(() =>
      Effect.forEach(
        "registrations" in options ? options.registrations : [options],
        registration
      ).pipe(
        Effect.map((registrations) => ({
          registrations,
          timeoutSeconds: options.timeoutSeconds === undefined ? 10 : options.timeoutSeconds
        }))
      )
    ).pipe(Effect.flatMap(makeGitHubOAuthAppProtocol))
  )

/** Configure GitHub API connections with the same callback/rotation defaults as
 * layer. Permission profiles remain explicit; connection grants are not logins. */
export const layerConnected = (options: ConnectedOptions) =>
  Layer.effect(
    OAuthConnectedProtocol,
    resolveOptions(() =>
      Effect.forEach(
        "registrations" in options ? options.registrations : [options],
        Effect.fnUntraced(function*(input) {
          return {
            ...(yield* registration(input)),
            profiles: input.profiles
          }
        })
      ).pipe(
        Effect.map((registrations) => ({
          registrations,
          timeoutSeconds: options.timeoutSeconds === undefined ? 10 : options.timeoutSeconds
        }))
      )
    ).pipe(Effect.flatMap(makeGitHubOAuthAppConnectedProtocol))
  )
