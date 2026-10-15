/**
 * Local and scoped remote public-key resolvers with explicit selection policy and bounded HTTPS retrieval.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as SynchronizedRef from "effect/SynchronizedRef"
import { json } from "./internal/encoding.ts"
import * as KeyInput from "./internal/keyInput.ts"
import { AmbiguousKey, InvalidKey, JwksUnavailable, type KeyError, KeyNotFound } from "./JoseError.ts"
import { AsymmetricAlgorithm, importPublic, PublicJwk, type PublicKey } from "./Jwk.ts"

/**
 * Schema for a bounded collection of public JWKs.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const KeySet = Schema.Struct({
  keys: Schema.Array(PublicJwk).check(Schema.isMaxLength(KeyInput.maxArrayLength))
})

/**
 * Value described by the KeySet schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type KeySet = typeof KeySet.Type

/**
 * Schema for an asymmetric algorithm and optional key identifier used to select a public key.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Selection = Schema.Struct({
  algorithm: AsymmetricAlgorithm,
  kid: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256)))
})

/**
 * Value described by the Selection schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Selection = typeof Selection.Type

/**
 * Service that resolves a unique public verification key according to an explicit selection policy.
 *
 * @stability unstable
 * @category services
 * @since 4.0.5
 */
export class Jwks extends Context.Service<
  Jwks,
  {
    readonly resolve: (selection: Selection) => Effect.Effect<PublicKey, KeyError>
  }
>()("@effect/auth/Jwks") {}

/**
 * Captures a detached, immutable key-set generation and returns its resource-free public-key resolver.
 *
 * **Details**
 *
 * Retain the resolver for that generation; create a new one when keys change. Each resolution applies the caller's selection policy.
 *
 * **Example** (Resolving one trusted public key)
 *
 * ```ts import.meta.vitest
 * import { Jwk, Jwks } from "@effect/auth"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect } from "effect"
 *
 * const algorithm = await Effect.runPromise(Effect.gen(function*() {
 *   const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "signing-1" })
 *   const resolver = yield* Jwks.makeLocal({ keys: [pair.publicKey] })
 *   const key = yield* resolver.resolve({ algorithm: "ES256", kid: "signing-1" })
 *   return key.algorithm
 * }).pipe(Effect.provide(NodeCrypto.layer)))
 * algorithm // => "ES256"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const makeLocal = Effect.fnUntraced(function*(input: unknown) {
  const set = yield* readSet(input)
  const importKey = makePublicImporter()

  return Jwks.of({
    resolve: Effect.fnUntraced(function*(input) {
      const selection = yield* readSelection(input)

      return yield* importKey(yield* select(set, selection), selection.algorithm)
    })
  })
})

/**
 * Provides a resolver for one immutable public key set without requiring an HTTP client.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.5
 */
export const layerLocal = (input: unknown): Layer.Layer<Jwks, InvalidKey> => Layer.effect(Jwks, makeLocal(input))

/**
 * Trusted HTTPS endpoint configuration and bounds for caching, requests, responses, and waiting callers.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface RemoteOptions {
  /** Trusted application configuration, never a URL from a token. HTTPS only. */
  readonly url: string
  readonly cacheTimeMs?: number
  readonly cooldownMs?: number
  readonly timeoutMs?: number
  readonly maxResponseBytes?: number
  readonly maxKeys?: number
  readonly maxWaiters?: number
}

const readSet = (input: unknown) =>
  Effect.try({
    try: () => KeyInput.keySet(input),
    catch: () => InvalidKey.make({})
  }).pipe(
    Effect.flatMap(Effect.fromResult),
    Effect.flatMap((captured) =>
      Schema.decodeUnknownEffect(KeySet)(captured, { reportInput: false }).pipe(
        Effect.mapError(() => InvalidKey.make({}))
      )
    ),
    Effect.map((set) => {
      for (const key of set.keys) {
        KeyInput.detach(key)
        if (key.key_ops !== undefined) Object.freeze(key.key_ops)
        Object.freeze(key)
      }
      Object.freeze(set.keys)

      return Object.freeze(KeyInput.detach(set))
    })
  )

const readSelection = (input: Selection) =>
  Effect.try({
    try: () => KeyInput.object(input),
    catch: () => InvalidKey.make({})
  }).pipe(
    Effect.flatMap((captured) =>
      Schema.decodeUnknownEffect(Selection)(captured, { reportInput: false }).pipe(
        Effect.mapError(() => InvalidKey.make({}))
      )
    ),
    Effect.map(KeyInput.detach)
  )

const select = Effect.fnUntraced(function*(set: KeySet, selection: Selection) {
  let keyType: PublicJwk["kty"]
  switch (selection.algorithm) {
    case "ES256":
      keyType = "EC"
      break
    case "EdDSA":
      keyType = "OKP"
      break
    default:
      keyType = "RSA"
  }

  const candidates = set.keys.filter(
    (key) =>
      (selection.kid === undefined || key.kid === selection.kid) &&
      (key.alg === undefined || key.alg === selection.algorithm) &&
      (key.use === undefined || key.use === "sig") &&
      (key.key_ops === undefined || key.key_ops.includes("verify")) &&
      key.kty === keyType
  )

  if (candidates.length === 0) return yield* KeyNotFound.make({})
  if (candidates.length !== 1) return yield* AmbiguousKey.make({})

  return candidates[0]
})

const makePublicImporter = () => {
  // Immutable snapshots are weak keys, so old remote generations can be released.
  const keys = new WeakMap<PublicJwk, Map<AsymmetricAlgorithm, PublicKey>>()

  return Effect.fnUntraced(function*(jwk: PublicJwk, algorithm: AsymmetricAlgorithm) {
    let algorithms = keys.get(jwk)
    if (algorithms === undefined) keys.set(jwk, algorithms = new Map())
    let key = algorithms.get(algorithm)

    if (key === undefined) {
      key = yield* importPublic(jwk, algorithm)
      // Publish successes only. Failed or interrupted imports remain retryable.
      algorithms.set(algorithm, key)
    }

    // Metadata is frozen, but Uint8Array contents cannot be. Never expose the
    // retained material to callers or to a verification service implementation.
    return Object.freeze({ ...key, material: new Uint8Array(key.material) })
  })
}

const bounded = (minimum: number, maximum: number) => Schema.Int.check(Schema.isBetween({ minimum, maximum }))

const RemoteConfiguration = Schema.Struct({
  url: Schema.URLFromString.check(
    Schema.makeFilter(
      (url) => url.protocol === "https:" && url.username === "" && url.password === "" && url.hash === ""
    )
  ),
  cacheTimeMs: bounded(1, 86400000),
  cooldownMs: bounded(0, 3600000),
  timeoutMs: bounded(1, 60000),
  maxResponseBytes: bounded(1, 1048576),
  maxKeys: bounded(1, KeyInput.maxArrayLength),
  maxWaiters: bounded(1, 1024)
})

interface Snapshot {
  readonly keys: KeySet
  readonly expiresAt: number
}

type RemoteState =
  | { readonly _tag: "Closed" }
  | {
    readonly _tag: "Open"
    readonly cache: Snapshot | undefined
    readonly pending: Deferred.Deferred<Snapshot, JwksUnavailable> | undefined
    readonly lastAttempt: number
  }

type Admission =
  | { readonly _tag: "Rejected"; readonly reason: "closed" | "cooldown" }
  | { readonly _tag: "Cached"; readonly snapshot: Snapshot }
  | {
    readonly _tag: "Join" | "Start"
    readonly result: Deferred.Deferred<Snapshot, JwksUnavailable>
  }

/**
 * Provides a scoped resolver for one trusted HTTPS key-set endpoint using the supplied HTTP client.
 *
 * **Details**
 *
 * The supplied client owns egress policy and must not follow redirects. FetchHttpClient is configured to reject redirects; responses from another URL are rejected for every client. There is no stale-on-error fallback, global cache, background polling, or token-supplied key URL.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.5
 */
export const layerRemote = (
  input: RemoteOptions
): Layer.Layer<Jwks, JwksUnavailable, HttpClient.HttpClient> => {
  const configuration = {
    cacheTimeMs: 600000,
    cooldownMs: 30000,
    timeoutMs: 5000,
    maxResponseBytes: 131072,
    maxKeys: 64,
    maxWaiters: 64,
    ...input
  }

  return Layer.effect(
    Jwks,
    Effect.gen(function*() {
      const options = yield* Schema.decodeEffect(RemoteConfiguration)(configuration, {
        reportInput: false
      }).pipe(Effect.mapError(() => JwksUnavailable.make({ reason: "configuration" })))

      const client = HttpClient.withScope(yield* HttpClient.HttpClient)
      const importKey = makePublicImporter()

      const state = yield* SynchronizedRef.make<RemoteState>({
        _tag: "Open",
        cache: undefined,
        pending: undefined,
        lastAttempt: -Infinity
      })

      const permits = yield* Semaphore.make(options.maxWaiters)

      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) =>
        Effect.gen(function*() {
          const previous = yield* SynchronizedRef.getAndSet(state, { _tag: "Closed" })

          // A scoped fiber can be interrupted before its first instruction, so
          // its onExit handler alone cannot release pending lookup waiters.
          if (previous._tag === "Open" && previous.pending !== undefined) {
            yield* Deferred.fail(previous.pending, JwksUnavailable.make({ reason: "closed" }))
          }
          yield* Scope.close(scope, Exit.void)
        }))

      const fetch = Effect.gen(function*() {
        const response = yield* client.get(options.url.href, {
          headers: { accept: "application/json" }
        })

        if (response.status !== 200 || response.url !== options.url.href) {
          return yield* JwksUnavailable.make({ reason: "response" })
        }
        const buffer = new Uint8Array(options.maxResponseBytes)

        const length = yield* Stream.runFoldEffect(
          response.stream,
          () => 0,
          (length, chunk) => {
            if (chunk.byteLength > buffer.length - length) {
              return Effect.fail(JwksUnavailable.make({ reason: "response" }))
            }
            buffer.set(chunk, length)

            return Effect.succeed(length + chunk.length)
          }
        )

        const document = yield* json(buffer.subarray(0, length), "payload")
        const keys = yield* readSet(document)

        if (keys.keys.length > options.maxKeys) {
          return yield* JwksUnavailable.make({ reason: "response" })
        }

        return {
          keys,
          expiresAt: (yield* Clock.currentTimeMillis) + options.cacheTimeMs
        } satisfies Snapshot
      }).pipe(
        Effect.scoped,
        Effect.provideService(FetchHttpClient.RequestInit, {
          // Workers supports manual redirects; the status check above rejects them.
          redirect: "manual",
          credentials: "omit"
        }),
        Effect.catchTag("HttpClientError", () => JwksUnavailable.make({ reason: "transport" })),
        Effect.catchTag(["JoseInvalidToken", "JoseInvalidKey"], () => JwksUnavailable.make({ reason: "response" })),
        Effect.timeoutOrElse({
          duration: options.timeoutMs,
          orElse: () => JwksUnavailable.make({ reason: "transport" })
        })
      )

      const refresh = (missingFrom?: Snapshot) =>
        Effect.uninterruptibleMask((restore) =>
          Effect.gen(function*() {
            const now = yield* restore(Clock.currentTimeMillis)
            const result = yield* Deferred.make<Snapshot, JwksUnavailable>()

            // Recheck cache and ownership together after the caller's snapshot.
            // A missing key bypasses only the snapshot that failed selection.
            const admission = yield* SynchronizedRef.modify(
              state,
              (current): readonly [Admission, RemoteState] => {
                if (current._tag === "Closed") {
                  return [{ _tag: "Rejected", reason: "closed" }, current]
                }
                if (
                  current.cache !== undefined &&
                  current.cache !== missingFrom &&
                  current.cache.expiresAt > now
                ) {
                  return [{ _tag: "Cached", snapshot: current.cache }, current]
                }
                if (current.pending !== undefined) {
                  return [{ _tag: "Join", result: current.pending }, current]
                }
                if (now - current.lastAttempt < options.cooldownMs) {
                  return [{ _tag: "Rejected", reason: "cooldown" }, current]
                }

                return [
                  { _tag: "Start", result },
                  { ...current, pending: result, lastAttempt: now }
                ]
              }
            )

            if (admission._tag === "Rejected") {
              return yield* JwksUnavailable.make({ reason: admission.reason })
            }
            if (admission._tag === "Cached") return admission.snapshot
            if (admission._tag === "Join") return yield* restore(Deferred.await(admission.result))

            // Admission through fork registration is uninterruptible. Network
            // work and waiter suspension never run under the state lock.
            yield* fetch.pipe(
              Effect.onExit((exit) =>
                SynchronizedRef.updateEffect(state, (current) =>
                  current._tag === "Closed"
                    ? Effect.succeed(current)
                    : Deferred.done(result, exit).pipe(
                      // Keep pending ownership until publication, serialized
                      // with shutdown so a closed owner cannot publish success.
                      Effect.as({
                        ...current,
                        cache: Exit.isSuccess(exit) ? exit.value : current.cache,
                        pending: undefined
                      })
                    ))
              ),
              Effect.forkIn(scope, { uninterruptible: false })
            )

            return yield* restore(Deferred.await(result))
          })
        )

      const resolve = Effect.fnUntraced(function*(input: Selection) {
        if ((yield* SynchronizedRef.get(state))._tag === "Closed") {
          return yield* JwksUnavailable.make({ reason: "closed" })
        }
        const selection = yield* readSelection(input)
        const now = yield* Clock.currentTimeMillis
        const snapshot = yield* SynchronizedRef.get(state)

        if (snapshot._tag === "Closed") return yield* JwksUnavailable.make({ reason: "closed" })

        const current = snapshot.cache !== undefined && snapshot.cache.expiresAt > now
          ? snapshot.cache
          : yield* refresh()

        const candidate = yield* select(current.keys, selection).pipe(
          Effect.catchTag("JoseKeyNotFound", () =>
            refresh(current).pipe(
              Effect.mapError((error) => error.reason === "cooldown" ? KeyNotFound.make({}) : error),
              Effect.flatMap((snapshot) => select(snapshot.keys, selection))
            ))
        )

        return yield* importKey(candidate, selection.algorithm)
      })

      return Jwks.of({
        resolve: (selection) =>
          resolve(selection).pipe(
            permits.withPermitsIfAvailable(1),
            Effect.flatMap(
              Option.match({
                onNone: () => JwksUnavailable.make({ reason: "busy" }),
                onSome: Effect.succeed
              })
            )
          )
      })
    })
  )
}
