/**
 * The Swarm itself: inspect, init, join, leave, update, and the unlock key of
 * an autolocked Swarm.
 *
 * Every Swarm endpoint answers 503 when the node can't serve it (not in a
 * Swarm, a worker, locked), which fails with the non-retryable
 * `SwarmUnavailable`. `DockerSystem`'s `ping` reports the node's state as
 * `swarm` without that failure. Join tokens and unlock keys are `Redacted`.
 *
 * **Example** (Joining a Swarm unless the node is in one)
 *
 * ```ts import.meta.vitest
 * import { Effect, Redacted } from "effect"
 * import { DockerSwarm, DockerSystem } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const system = yield* DockerSystem.DockerSystem
 *   const swarm = yield* DockerSwarm.DockerSwarm
 *   const { swarm: state } = yield* system.ping
 *   if (state?.nodeState === "active") return
 *   yield* swarm.join({
 *     ListenAddr: "0.0.0.0:2377",
 *     RemoteAddrs: ["10.0.0.1:2377"],
 *     JoinToken: Redacted.make("SWMTKN-1-...")
 *   })
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Redacted from "../Redacted.ts"
import * as DockerApi from "./DockerApi.ts"
import { DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"
import { apiClient, modifyWith, withOperation } from "./internal/engine.ts"

/**
 * The Swarm API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerSwarm extends Context.Service<DockerSwarm, {
  /**
   * Inspects the Swarm.
   *
   * **Details**
   *
   * [Engine API: SwarmInspect](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmInspect).
   * `Version.Index` is the version `update` takes. Only a manager answers.
   *
   * Typical reasons: `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: Effect.Effect<DockerApi.SwarmInfo, DockerError>
  /**
   * Initializes a new Swarm with this node as its manager, and returns the
   * node's ID.
   *
   * **Details**
   *
   * [Engine API: SwarmInit](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmInit).
   * The Engine requires `ListenAddr` (`docker swarm init` sends
   * `0.0.0.0:2377`). `Spec.Name` must be empty or `default`.
   *
   * Typical reasons: `SwarmUnavailable` (already in a Swarm), `BadRequest`,
   * `ConnectionFailed`.
   */
  readonly init: (request: DockerSchema.SwarmInitRequest) => Effect.Effect<string, DockerError>
  /**
   * Joins an existing Swarm.
   *
   * **Details**
   *
   * [Engine API: SwarmJoin](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmJoin).
   * The join token decides whether the node joins as a worker or a manager.
   * When the join takes too long, the Engine fails with `SwarmUnavailable`
   * and goes on joining in the background.
   *
   * Typical reasons: `SwarmUnavailable` (already in a Swarm, or still
   * joining), `BadRequest`, `ServerError`, `ConnectionFailed`.
   */
  readonly join: (request: DockerApi.JoinRequest) => Effect.Effect<void, DockerError>
  /**
   * Leaves the Swarm.
   *
   * **Details**
   *
   * [Engine API: SwarmLeave](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmLeave).
   * A manager needs `force`, which can break the Swarm's quorum.
   *
   * Typical reasons: `SwarmUnavailable` (not in a Swarm), `ServerError`,
   * `ConnectionFailed`.
   */
  readonly leave: (options?: { readonly force?: boolean | undefined }) => Effect.Effect<void, DockerError>
  /**
   * Updates the Swarm's spec, and rotates its tokens or unlock key.
   *
   * **Details**
   *
   * [Engine API: SwarmUpdate](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmUpdate).
   * The spec replaces the current one: start from `inspect`'s `Spec`.
   * `version` is `inspect`'s `Version.Index`; when the Swarm changed since,
   * the Engine fails with `ServerError` and the message `update out of
   * sequence`, and the update needs a fresh `inspect`.
   *
   * Typical reasons: `ServerError` (out of sequence), `BadRequest`,
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly update: (
    spec: DockerSchema.SwarmSpec,
    options: {
      readonly version: number
      readonly rotateWorkerToken?: boolean | undefined
      readonly rotateManagerToken?: boolean | undefined
      readonly rotateManagerUnlockKey?: boolean | undefined
    }
  ) => Effect.Effect<void, DockerError>
  /**
   * Returns the key that unlocks the Swarm's managers, or `undefined` when
   * autolock is off.
   *
   * **Details**
   *
   * [Engine API: SwarmUnlockkey](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmUnlockkey).
   * Autolock is `Spec.EncryptionConfig.AutoLockManagers`.
   *
   * Typical reasons: `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly unlockKey: Effect.Effect<Redacted.Redacted<string> | undefined, DockerError>
  /**
   * Unlocks a locked manager.
   *
   * **Details**
   *
   * [Engine API: SwarmUnlock](https://docs.docker.com/reference/api/engine/version/v1.52/#tag/Swarm/operation/SwarmUnlock).
   * An autolocked manager is locked after its Engine restarts.
   *
   * Typical reasons: `Unauthorized` (the wrong key), `BadRequest` (not an
   * unlock key), `Conflict` (not locked), `SwarmUnavailable`,
   * `ConnectionFailed`.
   */
  readonly unlock: (unlockKey: Redacted.Redacted<string>) => Effect.Effect<void, DockerError>
  /**
   * Updates the Swarm from its current spec: inspects the Swarm, and updates
   * it with `f` of its `Spec` at the version read.
   *
   * **Details**
   *
   * When another update comes first (`update out of sequence`), it starts
   * over from a fresh `inspect`, at most 5 times in all; any other failure
   * ends it. The options are `update`'s rotations.
   *
   * Typical reasons: `inspect`'s and `update`'s.
   *
   * **Example** (Turning on autolock)
   *
   * ```ts import.meta.vitest
   * import { DockerSwarm } from "effect/docker"
   *
   * const autolock = DockerSwarm.DockerSwarm.use((swarm) =>
   *   swarm.modify((spec) => ({ ...spec, EncryptionConfig: { AutoLockManagers: true } }))
   * )
   * ```
   */
  readonly modify: (
    f: (spec: DockerSchema.SwarmSpec) => DockerSchema.SwarmSpec,
    options?: {
      readonly rotateWorkerToken?: boolean | undefined
      readonly rotateManagerToken?: boolean | undefined
      readonly rotateManagerUnlockKey?: boolean | undefined
    }
  ) => Effect.Effect<void, DockerError>
}>()("effect/docker/DockerSwarm") {}

/**
 * Builds the {@link DockerSwarm} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make: Effect.Effect<DockerSwarm["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Swarm, "docker.Swarm")
  const inspect = api.inspect()
  const update: DockerSwarm["Service"]["update"] = (spec, options) => api.update({ query: options, payload: spec })
  return DockerSwarm.of({
    inspect,
    init: (request) => api.init({ payload: request }),
    join: (request) => api.join({ payload: request }),
    leave: (options) => api.leave({ query: options ?? {} }),
    update,
    // a Swarm that isn't autolocked answers an empty key
    unlockKey: Effect.map(
      api.unlockKey(),
      ({ UnlockKey }) => UnlockKey !== undefined && Redacted.value(UnlockKey) !== "" ? UnlockKey : undefined
    ),
    unlock: (unlockKey) => api.unlock({ payload: { UnlockKey: unlockKey } }),
    modify: (f, options) =>
      modifyWith(
        inspect,
        (spec, version) => update(spec, { ...options, version }),
        f
      ).pipe(withOperation(engine, "docker.Swarm.modify"))
  })
})

/**
 * Provides {@link DockerSwarm} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer: Layer.Layer<DockerSwarm, never, DockerEngine> = Layer.effect(DockerSwarm, make)
