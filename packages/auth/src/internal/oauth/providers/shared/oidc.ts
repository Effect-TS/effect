import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import type * as Redacted from "effect/Redacted"

import type * as OAuth from "../../../../oauth/OAuth.ts"
import * as Oidc from "../../../../oauth/Oidc.ts"
import { OAuthUnavailable } from "../../signInErrors.ts"
import { type InstalledProvider, installProvider, prepareConfigurations } from "./configuration.ts"
import {
  installConnectedProvider,
  type InstalledConnectedProvider,
  prepareConnectedConfigurations
} from "./connected/configuration.ts"
import type { OpenIdConnectConnectedProtocolOptions } from "./connected/models.ts"
import { discoveryMetadataUrl, discoveryProfile, supplementDiscovery } from "./discovery.ts"
import { hasStaticSecret, OpenIdConnectConfigurationError, type OpenIdConnectOAuthProtocolOptions } from "./models.ts"
import type { Requirements as OAuthRequirements } from "./native.ts"

export type Requirements = OAuthRequirements | Signature.Signature | Mac.Mac

const configurationError = (error: Effect.Error<ReturnType<typeof Oidc.discover>>) =>
  error._tag === "OAuthConfigurationError"
    ? OpenIdConnectConfigurationError.make({ reason: "metadata" })
    : OAuthUnavailable.make({})

/** Inward discovery port. One initialization owns the successful raw responses;
 * exact discovery policy and effective transport identities stay independent. */
export class ProviderDiscovery extends Context.Service<
  ProviderDiscovery,
  {
    readonly discover: (
      issuer: string,
      timeoutSeconds: number,
      metadataUrl: string | undefined
    ) => Effect.Effect<
      OAuth.Metadata,
      OpenIdConnectConfigurationError | OAuthUnavailable,
      HttpClient.HttpClient
    >
  }
>()("@effect/auth/oauth/providers/ProviderDiscovery") {
  /** Evaluate once at each initialization root, never at module or declaration scope. */
  static readonly make = Effect.sync(() => {
    const cache = new Map<
      string,
      {
        readonly client: HttpClient.HttpClient
        readonly fetch: typeof globalThis.fetch
        readonly metadata: OAuth.Metadata
      }
    >()

    return ProviderDiscovery.of({
      discover: Effect.fnUntraced(function*(
        issuer: string,
        timeoutSeconds: number,
        metadataUrl: string | undefined
      ) {
        const client = yield* HttpClient.HttpClient
        const fetch = yield* FetchHttpClient.Fetch
        // oxlint-disable-next-line no-restricted-properties -- Collision-free tuple of bounded, validated discovery configuration.
        const key = JSON.stringify([issuer, timeoutSeconds, metadataUrl ?? null])
        const found = cache.get(key)

        if (found?.client === client && found.fetch === fetch) return found.metadata

        const metadata = yield* Oidc.discover(issuer, {
          timeout: timeoutSeconds * 1000,
          ...(metadataUrl === undefined ? {} : { metadataUrl })
        }).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, configurationError)))
        )

        cache.set(key, { client, fetch, metadata })

        return metadata
      })
    })
  })
}

const makeVerifier = Effect.fnUntraced(function*(
  metadata: OAuth.Metadata,
  clientId: string,
  timeoutSeconds: number,
  options: {
    readonly algorithms: ReadonlyArray<Oidc.IdTokenAlgorithm>
    readonly pkceS256: boolean
    readonly clientSecret?: Redacted.Redacted<string>
  }
) {
  const context = Context.make(Digest.Digest, yield* Digest.Digest).pipe(
    Context.add(Signature.Signature, yield* Signature.Signature),
    Context.add(Mac.Mac, yield* Mac.Mac)
  )

  const verifier = yield* Oidc.makeVerifier({
    metadata,
    clientId,
    timeout: timeoutSeconds * 1000,
    algorithms: options.algorithms,
    pkceS256: options.pkceS256,
    ...(options.clientSecret === undefined ? {} : { clientSecret: options.clientSecret })
  }).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, configurationError))))

  return {
    verify: (token: Redacted.Redacted<string>, input: Oidc.VerificationInput) =>
      verifier.verify(token, input).pipe(Effect.provideContext(context))
  }
})

/**
 * Only the OIDC adapter installs discovery and signed ID-token verification.
 *
 * @internal
 */
export const installConfigurations = Effect.fn("OpenIdConnect.installConfigurations")(function*<R>(
  input: OpenIdConnectOAuthProtocolOptions<R>
) {
  const discovery = yield* ProviderDiscovery
  const { providers, timeoutSeconds } = yield* prepareConfigurations(input)
  const installed: Array<InstalledProvider<R>> = []

  for (const provider of providers) {
    const raw = provider.protocol === "oidc"
      ? yield* discovery
        .discover(
          provider.issuer,
          timeoutSeconds,
          discoveryMetadataUrl(provider[discoveryProfile])
        )
        .pipe(
          Effect.flatMap((metadata) => supplementDiscovery(metadata, provider[discoveryProfile]))
        )
      : {
        issuer: provider.issuer,
        authorization_endpoint: provider.authorizationEndpoint,
        token_endpoint: provider.tokenEndpoint,
        authorization_response_iss_parameter_supported: provider.responseIssuerMode === "required"
      }

    const entry = yield* installProvider(provider, raw, timeoutSeconds)

    installed.push(
      provider.protocol === "oidc"
        ? {
          ...entry,
          verifier: yield* makeVerifier(entry.metadata, provider.clientId, timeoutSeconds, {
            algorithms: provider.idTokenSignedResponseAlg,
            pkceS256: provider.pkceS256,
            ...(hasStaticSecret(provider.authentication)
              ? { clientSecret: provider.authentication.secret }
              : {})
          })
        }
        : entry
    )
  }

  return { installed, timeoutSeconds }
})

/** @internal */
export const installConnectedConfigurations = Effect.fn(
  "OpenIdConnect.installConnectedConfigurations"
)(function*<R>(input: OpenIdConnectConnectedProtocolOptions<R>) {
  const discovery = yield* ProviderDiscovery
  const { providers, timeoutSeconds } = yield* prepareConnectedConfigurations(input)
  const installed: Array<InstalledConnectedProvider<R>> = []

  for (const provider of providers) {
    const raw = provider.protocol === "oidc"
      ? yield* discovery.discover(provider.issuer, timeoutSeconds, undefined)
      : {
        issuer: provider.issuer,
        authorization_endpoint: provider.authorizationEndpoint,
        token_endpoint: provider.tokenEndpoint,
        authorization_response_iss_parameter_supported: provider.responseIssuerMode === "required",
        ...(provider.revocation.mode === "rfc7009"
          ? { revocation_endpoint: provider.revocation.endpoint }
          : {})
      }

    const entry = yield* installConnectedProvider(provider, raw, timeoutSeconds)

    installed.push(
      provider.protocol === "oidc"
        ? {
          ...entry,
          verifier: yield* makeVerifier(entry.metadata, provider.clientId, timeoutSeconds, {
            algorithms: provider.idTokenSignedResponseAlg,
            pkceS256: provider.pkceS256,
            ...(hasStaticSecret(provider.authentication)
              ? { clientSecret: provider.authentication.secret }
              : {})
          })
        }
        : entry
    )
  }

  return { installed, timeoutSeconds }
})
