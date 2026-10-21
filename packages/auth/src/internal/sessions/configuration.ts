import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as Mac from "effect/crypto/Mac"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import type { AuthConfigurationError } from "../auth/authConfigurationError.ts"
import { hooksLayer } from "../auth/defaults.ts"
import { makeSessionCookieCache, sessionCookieCache } from "./cookieCache.ts"
import { sessionSigningKeysLayer } from "./crypto.ts"
import { SessionConfigurationError } from "./errors.ts"
import type { makeSessionModule, ModuleService } from "./module.ts"
import type { SessionPolicy } from "./policy.ts"

export interface SessionOptions {
  readonly idleTimeout?: Duration.Input
  readonly maxAge?: Duration.Input
  readonly renewAfter?: Duration.Input
  readonly issuer?: string
  readonly audience?: string
  readonly generation?: number
  /** Retain the greatest maxAge of still-usable issued tokens after reducing policy. */
  readonly maximumIssuedAge?: Duration.Input
  readonly maximumTokenBytes?: number
}

export interface StatefulConfiguration<CacheFor extends Duration.Input | undefined = undefined> {
  readonly mode: "stateful"
  readonly policy: (namespace: string) => SessionPolicy
  readonly cacheFor: CacheFor | undefined
}

export interface StatelessConfiguration {
  readonly mode: "stateless"
  readonly policy: (namespace: string) => SessionPolicy
}

export interface StateAssistedConfiguration {
  readonly mode: "state-assisted"
  readonly policy: (namespace: string) => SessionPolicy
}

export type SessionConfiguration =
  | StatefulConfiguration<Duration.Input | undefined>
  | StatelessConfiguration
  | StateAssistedConfiguration

const policy = (options: SessionOptions, immediate: boolean, cacheFor?: Duration.Input) => {
  let values: Omit<SessionPolicy, "issuer" | "audience">

  try {
    const maxAge = Duration.toMillis(options.maxAge ?? (immediate ? "30 days" : "15 minutes"))

    const idle = Duration.toMillis(
      options.idleTimeout ?? Math.min(maxAge, Duration.toMillis("7 days"))
    )

    const positiveCacheMillis = Duration.toMillis(cacheFor ?? 0)

    values = Object.freeze({
      generation: options.generation ?? 1,
      idleLifetimeMillis: idle,
      absoluteLifetimeMillis: maxAge,
      renewalIntervalMillis: Duration.toMillis(
        options.renewAfter ?? Math.min(Math.floor(idle / 2), Duration.toMillis("1 day"))
      ),
      maximumIssuedAbsoluteLifetimeMillis: Duration.toMillis(options.maximumIssuedAge ?? maxAge),
      maximumTokenBytes: options.maximumTokenBytes ?? 4096,
      positiveCacheMillis,
      requireImmediateInvalidation: immediate && positiveCacheMillis === 0
    })
  } catch {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous session configuration rejects unsupported static policy.
    throw SessionConfigurationError.make({ reason: "policy" })
  }
  const issuer = options.issuer
  const audience = options.audience

  return (namespace: string): SessionPolicy => ({
    ...values,
    issuer: issuer ?? namespace,
    audience: audience ?? namespace
  })
}

/** Authoritative sessions by default. cacheFor delays revocation and claim changes
 * by at most five minutes or renewAfter, whichever is shorter. Enabling it also
 * requires Mac and defaults signing keys from AuthConfig / AUTH_SECRET. */
export const stateful = <const CacheFor extends Duration.Input | undefined = undefined>(
  options: SessionOptions & { readonly cacheFor?: CacheFor } = {}
): StatefulConfiguration<CacheFor> =>
  Object.freeze({
    mode: "stateful",
    policy: policy(options, true, options.cacheFor),
    cacheFor: options.cacheFor
  })

/** Database-free verification with a fifteen-minute default lifetime.
 * Sign-out clears this client's credential only; longer lifetimes require explicit policy. */
export const stateless = (options: SessionOptions = {}): StatelessConfiguration =>
  Object.freeze({ mode: "stateless", policy: policy(options, false) })

/** Signed credentials checked against application-owned validity state on every read. */
export const stateAssisted = (options: SessionOptions = {}): StateAssistedConfiguration =>
  Object.freeze({ mode: "state-assisted", policy: policy(options, true) })

export type SessionRequirements<C, Id extends string, Claims extends Schema.Top> =
  | SecureRandom.SecureRandom
  | Digest.Digest
  | (C extends StatefulConfiguration<infer CacheFor> ? Exclude<CacheFor, undefined> extends never ? never
    : Mac.Mac
    : Mac.Mac)
  | Exclude<Claims["DecodingServices"] | Claims["EncodingServices"], Scope.Scope>
  | (C extends StatefulConfiguration<Duration.Input | undefined> ?
      | ModuleService<Id, "persistence", Claims["Type"]>
      | ModuleService<Id, "repository", Claims["Type"]>
    : C extends StateAssistedConfiguration ? ModuleService<Id, "validity", Claims["Type"]>
    : never)

/** @internal */
export const configuredLayer = <
  const Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>,
  C extends SessionConfiguration
>(
  sessions: ReturnType<typeof makeSessionModule<Id, Claims>>,
  configuration: C
): Layer.Layer<
  ModuleService<Id, "strategy", Claims["Type"]>,
  SessionConfigurationError | AuthConfigurationError,
  SessionRequirements<C, Id, Claims>
> => {
  const configured = configuration.policy(sessions.moduleId)

  const defaults = <A, E, R>(layer: Layer.Layer<A, E, R>) =>
    Layer.effectContext(
      Effect.gen(function*() {
        const strategy = yield* sessions.SessionStrategy

        if (strategy.capabilities.positiveCacheMillis === 0) return Context.empty()

        const cache = yield* makeSessionCookieCache(
          sessions.moduleId,
          sessions.Session,
          strategy.policy
        )

        return Context.make(
          sessionCookieCache<Id, typeof sessions.Session.Type>(sessions.moduleId),
          cache
        )
      })
    ).pipe(
      Layer.provideMerge(layer),
      Layer.provide(hooksLayer),
      Layer.provide(
        (configured.positiveCacheMillis ?? 0) > 0 ? sessionSigningKeysLayer : Layer.empty
      )
    )

  const layer = configuration.mode === "stateful"
    ? defaults(sessions.statefulLayer(configured))
    : configuration.mode === "stateless"
    ? defaults(sessions.statelessLayer(configured))
    : defaults(sessions.stateAssistedLayer(configured))

  // The selected mode determines exactly which persistence port the layer acquires.
  return layer as Layer.Layer<
    ModuleService<Id, "strategy", Claims["Type"]>,
    SessionConfigurationError | AuthConfigurationError,
    SessionRequirements<C, Id, Claims>
  >
}
