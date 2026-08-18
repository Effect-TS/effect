/**
 * Runs Effect Cluster entities on Cloudflare Durable Objects.
 *
 * On this path every entity instance is one Durable Object: the Worker encodes
 * an `(entityType, entityId)` address into a Durable Object name, resolves the
 * object stub with `getByName`, and the object's SQLite storage is the system
 * of record. There is no shard routing, no runner fleet, and no external
 * message storage; `layer` provides the cluster `Sharding` service on top of
 * the Durable Object namespace bindings instead of `Sharding.layer`.
 *
 * @since 4.0.0
 */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import type * as Entity from "effect/unstable/cluster/Entity"
import * as RunnerAddress from "effect/unstable/cluster/RunnerAddress"
import * as ShardId from "effect/unstable/cluster/ShardId"
import { Sharding } from "effect/unstable/cluster/Sharding"
import * as Snowflake from "effect/unstable/cluster/Snowflake"
import * as Internal from "./internal/clusterName.ts"

/**
 * A Durable Object name decoded back into its entity address parts.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterName {
  readonly type: string
  readonly id: string
}

/**
 * Encodes an entity address into the Durable Object name used with
 * `getByName`.
 *
 * **Details**
 *
 * The name is the entity type length-prefixed as `` `${type.length}:${type}${id}` ``,
 * which keeps `(type, id)` pairs collision-free without restricting the
 * characters an entity id may contain. Workflow, queue, and singleton names use
 * the same scheme on their own namespaces.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeName: (type: string, id: string) => string = Internal.encodeName

/**
 * Decodes a Durable Object name produced by {@link encodeName} back into its
 * entity address parts.
 *
 * **Details**
 *
 * Returns `undefined` for names that were not produced by {@link encodeName},
 * including non-canonical length prefixes. A Durable Object uses this to
 * recover its own address from `ctx.id.name`.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeName: (name: string) => ClusterName | undefined = Internal.decodeName

/**
 * The Durable Object namespace bindings and entity definitions the cluster
 * layer is built from.
 *
 * **Details**
 *
 * `entities` is the complete set of entity definitions the Worker serves.
 * Handlers are attached per entity type with `Entity.toLayer`; a client or
 * handler registration for an entity type outside this set fails at the
 * Worker, before any Durable Object is contacted.
 *
 * @category layers
 * @since 4.0.0
 */
export interface LayerOptions {
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  readonly entityNamespace: DurableObjectNamespace
  readonly workflowNamespace: DurableObjectNamespace
  readonly queueNamespace: DurableObjectNamespace
  readonly singletonNamespace: DurableObjectNamespace
}

/**
 * The synthetic runner address for a Durable Object, derived from its name.
 *
 * **Details**
 *
 * There is no runner fleet and no peer dialing on the Cloudflare path; the
 * address only gives logs, metrics, and `Entity.CurrentRunnerAddress` a stable
 * identity, with the port fixed to `0`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeRunnerAddress = (objectName: string): RunnerAddress.RunnerAddress => RunnerAddress.make(objectName, 0)

interface EntityRegistration {
  readonly entity: Entity.Entity<any, any>
  readonly build: Effect.Effect<unknown, never, unknown>
  readonly options: Record<string, unknown> | undefined
  readonly context: Context.Context<never>
}

const notImplemented = (method: string) =>
  Effect.die(
    new Error(`CloudflareCluster: ${method} is not implemented yet on the Cloudflare Durable Object path`)
  )

const make = Effect.fnUntraced(function*(options: LayerOptions) {
  const entities = new Map<string, Entity.Entity<any, any>>()
  for (const entity of options.entities) {
    entities.set(entity.type, entity)
  }
  const registrations = new Map<string, EntityRegistration>()
  // Snowflakes are isolate-local here (random machine id, no coordination).
  // Persisted request ids on this path use uuidv7, not these snowflakes.
  const snowflakeGen = yield* Snowflake.makeGenerator

  const unknownEntity = (entity: Entity.Entity<any, any>) =>
    Effect.die(
      new Error(
        `CloudflareCluster: entity type "${entity.type}" is not part of the entities bound at Worker init`
      )
    )

  const stubMethod = () => notImplemented("entity messaging")
  const makeStubClient = (entity: Entity.Entity<any, any>, entityId: string) => {
    options.entityNamespace.getByName(Internal.encodeName(entity.type, entityId))
    const client: Record<string, unknown> = {}
    for (const tag of entity.protocol.requests.keys()) {
      client[tag] = stubMethod
    }
    return client
  }

  const makeClient = (entity: Entity.Entity<any, any>) =>
    entities.has(entity.type)
      ? Effect.sync(() => (entityId: string) => makeStubClient(entity, entityId))
      : unknownEntity(entity)

  const registerEntity = Effect.fnUntraced(function*(
    entity: Entity.Entity<any, any>,
    build: Effect.Effect<unknown, never, unknown>,
    buildOptions?: Record<string, unknown>
  ) {
    if (!entities.has(entity.type)) {
      return yield* unknownEntity(entity)
    } else if (registrations.has(entity.type)) {
      return
    }
    const context = yield* Effect.context<never>()
    registrations.set(entity.type, { entity, build, options: buildOptions, context })
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        registrations.delete(entity.type)
      })
    )
  })

  return Sharding.of({
    getRegistrationEvents: Stream.never,
    getShardId: (_entityId, group) => ShardId.make(group, 1),
    hasShardId: () => true,
    getSnowflake: Effect.sync(() => snowflakeGen.nextUnsafe()),
    isShutdown: Effect.succeed(false),
    makeClient: makeClient as Sharding["Service"]["makeClient"],
    registerEntity: registerEntity as Sharding["Service"]["registerEntity"],
    registerSingleton: () => notImplemented("Sharding.registerSingleton"),
    send: () => notImplemented("Sharding.send"),
    sendOutgoing: () => notImplemented("Sharding.sendOutgoing"),
    notify: () => notImplemented("Sharding.notify"),
    reset: () => notImplemented("Sharding.reset"),
    pollStorage: notImplemented("Sharding.pollStorage"),
    activeEntityCount: Effect.succeed(0)
  })
})

/**
 * Builds the cluster on Cloudflare Durable Objects.
 *
 * **Details**
 *
 * Provides the cluster `Sharding` service on top of the four same-Worker
 * Durable Object namespace bindings. `Entity.client` resolves an entity to its
 * Durable Object by encoding `(type, id)` with {@link encodeName} and calling
 * `getByName`; an unknown entity type or a bad encode fails at the Worker
 * before any Durable Object is contacted. Entity handlers registered with
 * `Entity.toLayer` are recorded per `EntityType` at Worker init and built once
 * per Durable Object wake.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: LayerOptions): Layer.Layer<Sharding> => Layer.effect(Sharding)(make(options))
