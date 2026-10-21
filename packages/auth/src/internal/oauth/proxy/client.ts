import * as Cause from "effect/Cause"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"

import { makeScopedOperation } from "../../shared/scopedOperation.ts"
import { timeoutOrElseWithCause } from "../../shared/timeout.ts"
import { selectCallback } from "../callback.ts"
import { OAuthProtocol } from "../oauthProtocol.ts"
import type { ProviderDefinition } from "../providerDefinition.ts"
import { OAuthProtocolRejected, OAuthRejected, OAuthUnavailable } from "../signInErrors.ts"
import { OAuthVerifiedExternalIdentity } from "../signInModels.ts"
import { makeOAuthSnapshot } from "../signInSnapshot.ts"
import {
  Begin,
  CompletionUrl,
  ConfigurationError,
  Label,
  Prepared,
  Random,
  Redeem,
  Rejected,
  Unavailable
} from "./models.ts"
import { readText, secrets } from "./wire.ts"

const Options = Schema.Struct({
  /** Exact callback-server base, e.g. https://auth.example.com/oauth-proxy. */
  url: CompletionUrl,
  issuer: Schema.NonEmptyString.check(Schema.isMaxLength(2048)),
  environment: Label,
  secret: Schema.Redacted(Random)
})

export type Options = typeof Options.Type

/** Sign-in/registration only; retained provider grants are deliberately absent.
 * Supply a nonretrying, nonredirecting HttpClient and keep the owning Scope open.
 * Local OAuth persistence and request-binding cookies remain mandatory.
 */
export const provider = (
  options: Options
): ProviderDefinition<
  ConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | HttpClient.HttpClient | Scope.Scope
> => {
  const saved = snapshotOptions
    .result(options)
    .pipe(Result.mapError(() => ConfigurationError.make({})))

  return {
    configure: Effect.fnUntraced(function*(binding) {
      const config = yield* Effect.fromResult(saved)

      if (!config.url.startsWith("https://")) return yield* ConfigurationError.make({})
      for (const callback of binding.callbacks) {
        yield* Schema.decodeEffect(CompletionUrl)(callback.redirectUri).pipe(
          Effect.mapError(() => ConfigurationError.make({}))
        )
      }
      const client = yield* HttpClient.HttpClient
      const fetch = yield* FetchHttpClient.Fetch
      const run = yield* makeScopedOperation(() => OAuthUnavailable.make({}))
      const { random, digest } = yield* secrets

      const request = Effect.fnUntraced(
        function*(operation: "prepare" | "redeem", body: string) {
          const url = `${config.url}/${operation}`

          const response = yield* HttpClient.withScope(client).execute(
            HttpClientRequest.post(url).pipe(
              HttpClientRequest.bearerToken(config.secret),
              HttpClientRequest.bodyText(body, "application/json")
            )
          )

          if (response.url !== url || (response.status >= 300 && response.status < 400)) {
            return yield* Unavailable.make({})
          }
          if (response.status === 400) return yield* Rejected.make({})
          if (
            response.status !== 200 ||
            response.headers["content-type"]?.split(";")[0] !== "application/json"
          ) {
            return yield* Unavailable.make({})
          }

          return yield* readText(response.stream, 131072).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
          )
        },
        Effect.scoped,
        timeoutOrElseWithCause({ duration: 35_000, orElse: () => Unavailable.make({}) }),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
        Effect.provideService(FetchHttpClient.RequestInit, {
          redirect: "manual",
          credentials: "omit",
          cache: "no-store"
        }),
        Effect.provideService(Tracer.DisablePropagation, true)
      )

      const prepareAuthorization: OAuthProtocol["Service"]["prepareAuthorization"] = (input) =>
        run(
          Effect.gen(function*() {
            const callback = selectCallback(binding.provider, binding.callbacks, input.callbackId)

            if (input.provider !== binding.provider || callback === undefined) {
              return yield* OAuthRejected.make({})
            }
            const verifier = yield* random

            const body = yield* Schema.encodeEffect(Schema.fromJsonString(Begin))({
              environment: config.environment,
              provider: binding.provider,
              flowId: input.flowId,
              callbackId: callback.callbackId,
              redirectUri: callback.redirectUri,
              verifierDigest: yield* digest(verifier),
              ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
              ...(input.loginHint === undefined ? {} : { loginHint: input.loginHint })
            })

            const prepared = yield* request("prepare", body).pipe(
              Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(Prepared)))
            )

            if (
              prepared.configuration.provider !== binding.provider ||
              prepared.configuration.callbackId !== callback.callbackId ||
              prepared.configuration.redirectUri !== callback.redirectUri ||
              prepared.configuration.issuer !== config.issuer ||
              (prepared.configuration.protocol === "oidc") !== (prepared.oidcNonce !== undefined) ||
              prepared.configuration.responseIssuerMode !== "required"
            ) {
              return yield* OAuthUnavailable.make({})
            }

            return {
              ...prepared,
              secrets: {
                namespace: "effect-auth/oauth-transaction-secrets/v1" as const,
                state: prepared.state,
                pkceVerifier: Redacted.make(verifier),
                ...(prepared.oidcNonce === undefined ? {} : { oidcNonce: prepared.oidcNonce })
              }
            }
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error._tag === "OAuthProxyRejected" || error._tag === "OAuthRejected"
                    ? OAuthRejected.make({})
                    : OAuthUnavailable.make({}))
              )
            )
          )
        )

      const exchangeVerifiedIdentity: OAuthProtocol["Service"]["exchangeVerifiedIdentity"] = (
        input
      ) =>
        run(
          Effect.gen(function*() {
            const callback = binding.callbacks.find(
              (callback) =>
                callback.callbackId === input.configuration.callbackId &&
                callback.redirectUri === input.configuration.redirectUri
            )

            if (
              input.configuration.provider !== binding.provider ||
              callback === undefined ||
              input.response.issuer !== input.configuration.issuer ||
              input.secrets.pkceVerifier === undefined ||
              Redacted.value(input.response.state) !== Redacted.value(input.secrets.state)
            ) {
              return yield* OAuthProtocolRejected.make({})
            }

            const body = yield* Schema.encodeEffect(Schema.fromJsonString(Redeem))({
              environment: config.environment,
              configuration: input.configuration,
              state: input.secrets.state,
              code: input.response.code,
              verifier: input.secrets.pkceVerifier
            })

            const identity = yield* request("redeem", body).pipe(
              Effect.flatMap(
                Schema.decodeEffect(Schema.fromJsonString(OAuthVerifiedExternalIdentity))
              )
            )

            if (
              identity.identity.provider !== binding.provider ||
              identity.identity.issuer !== input.configuration.issuer
            ) {
              return yield* OAuthProtocolRejected.make({})
            }

            return identity
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error._tag === "OAuthProxyRejected" || error._tag === "OAuthProtocolRejected"
                    ? OAuthProtocolRejected.make({})
                    : OAuthUnavailable.make({}))
              )
            )
          )
        )

      return OAuthProtocol.of({ prepareAuthorization, exchangeVerifiedIdentity })
    })
  }
}

const snapshotOptions = makeOAuthSnapshot(Options)
