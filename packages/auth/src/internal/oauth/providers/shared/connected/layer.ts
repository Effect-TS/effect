import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import { OAuthConnectedProtocol } from "../../../oauthConnectedProtocol.ts"
import { installConnectedConfigurations, ProviderDiscovery } from "../oidc.ts"
import { type ProviderOptions, resolveOidcDefaults, resolveOptions, resolveProvider } from "../options.ts"
import { PrivateKeyClientSecret } from "../privateKeyJwt.ts"
import type { OpenIdConnectConnectedOAuthProvider, OpenIdConnectConnectedOidcProvider } from "./models.ts"
import { makeOpenIdConnectConnectedProtocol } from "./protocol.ts"

export type Provider<R = never> = ProviderOptions<
  OpenIdConnectConnectedOidcProvider | OpenIdConnectConnectedOAuthProvider<R>
>

export interface Options<R = never> {
  readonly providers: ReadonlyArray<Provider<R>>
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
}

/** Connected grants with the same registration/authentication defaults as
 * OpenIdConnect.layer. Profiles, resource indicators, refresh and revocation
 * contracts remain explicit because they describe the host's grant authority.
 * Retain retired configuration generations while grants still reference them. */
export const layer = <R = never>(options: Options<R>) =>
  Layer.effect(
    OAuthConnectedProtocol,
    resolveOptions(() =>
      Effect.forEach(
        options.providers,
        Effect.fnUntraced(function*(input) {
          return input.protocol === "oidc"
            ? {
              ...(yield* resolveProvider(input)),
              ...resolveOidcDefaults(input)
            }
            : {
              ...(yield* resolveProvider(input)),
              pkceS256: input.pkceS256 !== false
            }
        })
      ).pipe(
        Effect.map((providers) => ({
          providers,
          timeoutSeconds: options.timeoutSeconds === undefined ? 10 : options.timeoutSeconds
        }))
      )
    ).pipe(
      Effect.flatMap((configuration) =>
        makeOpenIdConnectConnectedProtocol(installConnectedConfigurations<R>(configuration)).pipe(
          Effect.provideServiceEffect(PrivateKeyClientSecret, PrivateKeyClientSecret.make),
          Effect.provideServiceEffect(ProviderDiscovery, ProviderDiscovery.make)
        )
      )
    )
  )
