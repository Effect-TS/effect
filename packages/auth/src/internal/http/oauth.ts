import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import type { AnyRoute } from "../httpOperation/contract.ts"
import { OperationHttpConfigurationError, OperationHttpError } from "../httpOperation/errors.ts"
import { OperationHttpServerConfig } from "../httpOperation/operationHttpServerConfig.ts"
import { oauthCallback, type OAuthHttpCallback } from "../httpOperation/server.ts"
import { selectCallback } from "../oauth/callback.ts"
import { OAuthConnectedProtocol } from "../oauth/oauthConnectedProtocol.ts"
import { OAuthProtocol } from "../oauth/oauthProtocol.ts"
import type { ProviderDefinition } from "../oauth/providerDefinition.ts"
import { OAuthProviderKey } from "../oauth/schema.ts"
import { OAuthRejected, OAuthUnavailable } from "../oauth/signInErrors.ts"
import { OAuthCallbackId, OAuthRedirectUri } from "../oauth/signInModels.ts"
import type { AuthActions } from "../operations/actions.ts"
import { makeRequestBindingFlowResolver } from "../operations/requestBinding.ts"
import { origin as Origin } from "../shared/origin.ts"

export interface OAuthCallbackOptions<R = never> {
  /** Defaults to the contract base path followed by /{provider}/callback. */
  readonly path?: `/${string}`
  /** Defaults to the provider key. */
  readonly callbackId?: string
  readonly allowedQueryParameters?: ReadonlyArray<string>
  /** Render an application-owned continuation, such as registration or MFA.
   * Receives only the schema-encoded public result; credentials remain cookies. */
  readonly respond?: OAuthHttpCallback<R>["respond"]
}

export interface OAuthOptions<E = never, R = never, ResponseR = never> {
  readonly providers: Readonly<Record<string, ProviderDefinition<E, R>>>
  /** Select explicitly when the contract has multiple OAuth completion actions. */
  readonly complete?: string
  /** Override the default redirect for every provider. A callback may override it. */
  readonly respond?: OAuthHttpCallback<ResponseR>["respond"]
  readonly callbacks?: Readonly<
    Record<string, OAuthCallbackOptions<ResponseR> | ReadonlyArray<OAuthCallbackOptions<ResponseR>>>
  >
}

const Path = Schema.String.check(Schema.isPattern(/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/))
const ProviderKey = OAuthProviderKey.check(Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9_-]*$/))

/**
 * HTTP owns binding and routing; provider adapters own their implementation.
 * Each declaration supplies one provider's retained generations. Distinct paths
 * keep callback identities isolated even when a host does not return an issuer.
 *
 * @internal
 */
export const makeOAuth = <E, R, ResponseR>(
  options: OAuthOptions<E, R, ResponseR>,
  origin: string,
  basePath: string,
  actions: AuthActions
) => {
  // Snapshot once before any Layer runs, including all caller-owned getter reads.
  const saved = Result.try({
    try: () =>
      Result.gen(function*() {
        yield* Schema.decodeResult(Origin)(origin)
        const names = Object.keys(options.providers)

        if (
          names.length === 0 ||
          Object.keys(options.callbacks ?? {}).some((key) => !names.includes(key))
        ) {
          return yield* Result.fail(OperationHttpConfigurationError.make({ reason: "callback" }))
        }

        const selected = Object.entries(actions).filter(
          ([name, action]) =>
            action.oauthCallback === true &&
            (options.complete === undefined || name === options.complete)
        )

        if (selected.length !== 1) {
          return yield* Result.fail(OperationHttpConfigurationError.make({ reason: "callback" }))
        }
        const [complete, action] = selected[0]!

        if (
          action.mode !== "mutation" ||
          action.route.operation.replay !== "single-use" ||
          !action.route.operation.credentials ||
          action.requestFields.requestBinding !== "request-binding"
        ) {
          return yield* Result.fail(OperationHttpConfigurationError.make({ reason: "callback" }))
        }
        const paths = new Set(Object.values(actions).map((action) => String(action.route.path)))
        const entries = []

        for (const [name, declaration] of Object.entries(options.providers)) {
          const provider = yield* Schema.decodeResult(ProviderKey)(name)
          const configured = options.callbacks?.[name]

          const callbacks: ReadonlyArray<OAuthCallbackOptions<ResponseR>> = configured === undefined
            ? [{}]
            : Array.isArray(configured)
            ? configured
            : [configured]

          const ids = new Set<string>()

          if (callbacks.length === 0 || callbacks.length > 16) {
            return yield* Result.fail(OperationHttpConfigurationError.make({ reason: "callback" }))
          }
          const captured = []

          for (const callback of callbacks) {
            const callbackId = yield* Schema.decodeResult(OAuthCallbackId)(
              callback.callbackId ?? provider
            )

            const path = yield* Schema.decodeResult(Path)(
              callback.path ?? `${basePath}/${provider}/callback`
            )

            if (paths.has(path) || ids.has(callbackId)) {
              return yield* Result.fail(
                OperationHttpConfigurationError.make({ reason: "duplicate-route" })
              )
            }
            paths.add(path)
            ids.add(callbackId)
            captured.push({
              ...callback,
              path,
              callbackId,
              redirectUri: yield* Schema.decodeResult(OAuthRedirectUri)(`${origin}${path}`)
            })
          }
          entries.push({ provider, declaration, callbacks: captured })
        }

        return { complete, entries }
      }),
    catch: (error) =>
      Schema.is(OperationHttpConfigurationError)(error)
        ? error
        : OperationHttpConfigurationError.make({ reason: "callback" })
  }).pipe(
    Result.flatMap((result) => result),
    Result.mapError((error) =>
      Schema.is(OperationHttpConfigurationError)(error)
        ? error
        : OperationHttpConfigurationError.make({ reason: "callback" })
    )
  )

  const configuration = Effect.fromResult(saved)
  const respond = options.respond

  const layer = Layer.effectContext(
    Effect.gen(function*() {
      const { entries } = yield* configuration

      const installed = yield* Effect.forEach(
        entries,
        (entry) =>
          Effect.map(
            entry.declaration.configure(entry),
            (protocol) => [entry.provider, protocol] as const
          ),
        { concurrency: 4 }
      )

      const protocols = new Map(installed)

      const signIn = OAuthProtocol.of({
        prepareAuthorization: (input) =>
          protocols.get(input.provider)?.prepareAuthorization(input) ?? OAuthRejected.make({}),
        exchangeVerifiedIdentity: (input) =>
          protocols.get(input.configuration.provider)?.exchangeVerifiedIdentity(input) ??
            OAuthUnavailable.make({})
      })

      const connected = OAuthConnectedProtocol.of({
        prepareAuthorization: (input) =>
          protocols.get(input.profile.provider)?.connected?.prepareAuthorization(input) ??
            OAuthUnavailable.make({}),
        exchangeGrant: (input) =>
          protocols.get(input.configuration.provider)?.connected?.exchangeGrant(input) ??
            OAuthUnavailable.make({}),
        refreshGrant: (input) =>
          protocols.get(input.context.configuration.provider)?.connected?.refreshGrant(input) ??
            OAuthUnavailable.make({}),
        revokeGrant: (input) =>
          protocols.get(input.context.configuration.provider)?.connected?.revokeGrant(input) ??
            OAuthUnavailable.make({})
      })

      return Context.make(OAuthProtocol, signIn).pipe(
        Context.add(OAuthConnectedProtocol, connected)
      )
    })
  )

  const callbacks = Effect.fnUntraced(function*<Routes extends Readonly<Record<string, AnyRoute>>>(routes: Routes) {
    const { complete, entries } = yield* configuration
    const { trustedOrigins } = yield* OperationHttpServerConfig

    const flowId = yield* makeRequestBindingFlowResolver("oauth-entry")

    // The selected name was validated against the same action table. Preserve
    // that table's concrete operation requirements through indexed lookup.
    const route = routes[complete] as Routes[keyof Routes] | undefined

    if (route === undefined) {
      return yield* OperationHttpConfigurationError.make({ reason: "callback" })
    }

    return entries.flatMap((entry) =>
      entry.callbacks.map((callback) => {
        const { respond: configuredRespond, ...callbackOptions } = callback
        const callbackRespond = configuredRespond ?? respond

        return oauthCallback<Routes[keyof Routes], ResponseR>(route, {
          ...callbackOptions,
          ...(callbackRespond === undefined ? {} : { respond: callbackRespond }),
          provider: entry.provider,
          requestBinding: "context",
          allowedRedirectOrigins: trustedOrigins,
          flowId: (_request, credentials) => {
            const credential = credentials["request-binding"]

            return credential === undefined
              ? OperationHttpError.make({ reason: "credentials" })
              : flowId(credential).pipe(
                Effect.mapError((error) =>
                  OperationHttpError.make({
                    reason: error._tag === "RequestBindingUnavailable"
                      ? "unavailable"
                      : "credentials"
                  })
                )
              )
          }
        })
      })
    )
  })

  const callbackUrl = (provider: string, callbackId?: string) => {
    const entry = Result.getOrThrow(saved).entries.find((entry) => entry.provider === provider)

    const callback = entry === undefined ? undefined : selectCallback(provider, entry.callbacks, callbackId)

    if (callback === undefined) {
      // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous callback URL lookup rejects an undeclared callback.
      throw OperationHttpConfigurationError.make({ reason: "callback" })
    }

    return callback.redirectUri
  }

  return { layer, callbacks, callbackUrl }
}
