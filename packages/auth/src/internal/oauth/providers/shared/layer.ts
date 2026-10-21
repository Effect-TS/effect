import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import { OAuthProtocol } from "../../oauthProtocol.ts"
import type { ProviderDefinition } from "../../providerDefinition.ts"
import type { OAuthUnavailable } from "../../signInErrors.ts"
import type { OpenIdConnectConnectedOidcProvider } from "./connected/models.ts"
import { makeOpenIdConnectConnectedProtocol } from "./connected/protocol.ts"
import type {
  OpenIdConnectConfigurationError,
  OpenIdConnectOAuthProvider,
  OpenIdConnectOidcProvider
} from "./models.ts"
import { installConfigurations, installConnectedConfigurations, ProviderDiscovery, type Requirements } from "./oidc.ts"
import {
  type ProviderOptions as RegistrationInput,
  resolveOidcDefaults,
  resolveOptions,
  resolveProvider
} from "./options.ts"
import { PrivateKeyClientSecret } from "./privateKeyJwt.ts"
import { makeOpenIdConnectOAuthProtocol } from "./protocol.ts"

export type Provider<R = never> = RegistrationInput<
  | (Omit<OpenIdConnectOidcProvider, "scopes"> & { readonly scopes?: ReadonlyArray<string> })
  | (Omit<OpenIdConnectOAuthProvider<R>, "scopes"> & { readonly scopes?: ReadonlyArray<string> })
>

export interface Options<R = never> {
  readonly providers: ReadonlyArray<Provider<R>>
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
}

type WithoutBinding<P> = P extends unknown ? Omit<P, "provider" | "redirectUri" | "callbackId" | "callbacks">
  : never

export type ProviderRegistration<R = never> = WithoutBinding<Provider<R>> & {
  readonly access?: Pick<
    OpenIdConnectConnectedOidcProvider,
    | "clientRegistrationId"
    | "profiles"
    | "resourceIndicators"
    | "refreshParameters"
    | "refreshExpiry"
    | "revocation"
  >
}

export type ProviderOptions<R = never> =
  & Pick<Options<R>, "timeoutSeconds">
  & (ProviderRegistration<R> | { readonly registrations: ReadonlyArray<ProviderRegistration<R>> })

const resolve = <R>(providers: ReadonlyArray<Provider<R>>) =>
  Effect.forEach(
    providers,
    Effect.fnUntraced(function*(input) {
      return input.protocol === "oidc"
        ? {
          ...(yield* resolveProvider(input)),
          scopes: input.scopes === undefined ? ["openid"] : input.scopes,
          ...resolveOidcDefaults(input)
        }
        : {
          ...(yield* resolveProvider(input)),
          scopes: input.scopes === undefined ? [] : input.scopes,
          pkceS256: input.pkceS256 !== false
        }
    })
  )

/** Declare an OIDC or OAuth provider for Http.layer. No I/O runs until its
 * Layer builds. The HTTP host supplies the provider ID and callback URLs. One
 * initialization shares equivalent discovery responses; client and verification
 * policy remain separate for each protocol and registration. */
export const provider = <R = never>(
  options: ProviderOptions<R>
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, R | Requirements> => ({
  configure: Effect.fnUntraced(function*(binding) {
    const registrations = yield* resolveOptions(() =>
      resolve(
        ("registrations" in options ? options.registrations : [options]).map((registration) => ({
          ...registration,
          ...binding
        }))
      )
    )

    const protocol = yield* makeOpenIdConnectOAuthProtocol(
      installConfigurations<R>({
        providers: registrations,
        timeoutSeconds: options.timeoutSeconds ?? 10
      })
    ).pipe(Effect.provideServiceEffect(PrivateKeyClientSecret, PrivateKeyClientSecret.make))

    const access = "registrations" in options ? options.registrations : [options]

    const connectedProviders = registrations.flatMap((registration, index) => {
      const configuration = access[index]?.access

      return configuration === undefined ? [] : [{ ...registration, ...configuration }]
    })

    if (connectedProviders.length === 0) return protocol

    const connected = yield* makeOpenIdConnectConnectedProtocol(
      installConnectedConfigurations<R>({
        providers: connectedProviders,
        timeoutSeconds: options.timeoutSeconds ?? 10
      })
    ).pipe(Effect.provideServiceEffect(PrivateKeyClientSecret, PrivateKeyClientSecret.make))

    return { ...protocol, connected }
  }, Effect.provideServiceEffect(ProviderDiscovery, ProviderDiscovery.make))
})

/** One protocol Layer for all OAuth/OIDC hosts. Each provider defaults to
 * generation 1, active issuance, callback ID equal to its provider key, required
 * response issuer validation and S256 PKCE. OIDC defaults to advertised
 * RS256/PS256/ES256/EdDSA (HS256 only when requested with a client secret),
 * the openid scope, ID-token profile claims, and
 * OidcUserProfile. Set pkceS256 false only for issuers that cannot complete
 * PKCE. Plain OAuth defaults to no scopes. clientSecret uses client_secret_basic
 * unless tokenEndpointAuthMethod is supplied. Authorization defaults to
 * response_mode=query; set responseMode to form_post when the issuer POSTs the
 * callback. Discovery must confirm the host's capabilities. Invalid
 * configuration fails when building the Layer.
 *
 * Keep retired generations in providers until their outstanding flows expire;
 * never reuse a generation for changed credentials or protocol configuration.
 * This Layer does not mount callback routes or infer a redirect URL. */
export const layer = <R = never>(options: Options<R>) =>
  Layer.effect(
    OAuthProtocol,
    resolveOptions(() =>
      resolve(options.providers).pipe(
        Effect.map((providers) => ({
          providers,
          timeoutSeconds: options.timeoutSeconds === undefined ? 10 : options.timeoutSeconds
        }))
      )
    ).pipe(
      Effect.flatMap((configuration) =>
        makeOpenIdConnectOAuthProtocol(installConfigurations<R>(configuration)).pipe(
          Effect.provideServiceEffect(PrivateKeyClientSecret, PrivateKeyClientSecret.make),
          Effect.provideServiceEffect(ProviderDiscovery, ProviderDiscovery.make)
        )
      )
    )
  )
