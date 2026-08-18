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
import { Clock } from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { MailboxFull, PersistenceError } from "effect/unstable/cluster/ClusterError"
import { Persisted } from "effect/unstable/cluster/ClusterSchema"
import * as DeliverAt from "effect/unstable/cluster/DeliverAt"
import type * as Entity from "effect/unstable/cluster/Entity"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as Envelope from "effect/unstable/cluster/Envelope"
import * as RunnerAddress from "effect/unstable/cluster/RunnerAddress"
import * as ShardId from "effect/unstable/cluster/ShardId"
import { Sharding } from "effect/unstable/cluster/Sharding"
import type { PersistedQueueFactory } from "effect/unstable/persistence/PersistedQueue"
import type * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcClient from "effect/unstable/rpc/RpcClient"
import * as RpcSchema from "effect/unstable/rpc/RpcSchema"
import type { WorkflowEngine } from "effect/unstable/workflow/WorkflowEngine"
import * as CloudflarePersistedQueue from "./CloudflarePersistedQueue.ts"
import * as CloudflareWorkflowEngine from "./CloudflareWorkflowEngine.ts"
import * as Internal from "./internal/clusterName.ts"
import { registerEntity as registerEntityHandler, unregisterEntity } from "./internal/entityRegistry.ts"
import { CurrentEntityName, registerReplyHandler, unregisterReplyHandler } from "./internal/entityReply.ts"
import { decodeReplyFor } from "./internal/entityWire.ts"
import { registerSingleton as registerSingletonHandler, unregisterSingleton } from "./internal/singletonRegistry.ts"

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

const notImplemented = (method: string) =>
  Effect.die(
    new Error(`CloudflareCluster: ${method} is not implemented yet on the Cloudflare Durable Object path`)
  )

interface EntityStub {
  readonly invoke: (envelope: string, discard: boolean, delivery?: {
    readonly deliverAt?: number | undefined
    readonly primaryKey?: string | null | undefined
    readonly replyTo?: string | undefined
  }) => Promise<{
    readonly requestId: string
    readonly replies: ReadonlyArray<string>
    readonly error?: "MailboxFull" | "EncodedMessageTooLarge" | "AskDeduplicatedToTell" | undefined
  }>
  readonly acknowledge: (requestId: string, replyId: string) => Promise<ReadonlyArray<string>>
  readonly interrupt?: (storageRequestId: string, clientRequestId?: string) => Promise<void>
  readonly reset?: (requestId: string) => Promise<void>
}

interface ClientTargetValue {
  readonly address: EntityAddress.EntityAddress
  readonly stub: EntityStub
}

class ClientTarget extends Context.Service<ClientTarget, ClientTargetValue>()(
  "@effect/platform-cloudflare/CloudflareCluster/ClientTarget"
) {}

const uuidV7 = (timestamp: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[0] = Math.floor(timestamp / 2 ** 40)
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = (byte: number) => byte.toString(16).padStart(2, "0")
  return [bytes.subarray(0, 4), bytes.subarray(4, 6), bytes.subarray(6, 8), bytes.subarray(8, 10), bytes.subarray(10)]
    .map((part) => Array.from(part, hex).join(""))
    .join("-")
}

const requestTargetCapacity = 4096

const make = Effect.fnUntraced(function*(options: LayerOptions) {
  const entities = new Map<string, Entity.Entity<any, any>>()
  for (const entity of options.entities) {
    entities.set(entity.type, entity)
  }
  const clock = yield* Clock
  const requestTargets = new Map<string, { readonly stub: EntityStub; storageRequestId: string }>()
  const rememberRequestTarget = (
    requestId: string,
    target: { readonly stub: EntityStub; storageRequestId: string }
  ): void => {
    requestTargets.delete(requestId)
    requestTargets.set(requestId, target)
    if (requestTargets.size <= requestTargetCapacity) return
    const oldest = requestTargets.keys().next().value
    if (oldest !== undefined) requestTargets.delete(oldest)
  }

  const unknownEntity = (entity: Entity.Entity<any, any>) =>
    Effect.die(
      new Error(
        `CloudflareCluster: entity type "${entity.type}" is not part of the entities bound at Worker init`
      )
    )

  const makeClient = Effect.fnUntraced(function*(entity: Entity.Entity<any, any>) {
    if (!entities.has(entity.type)) return yield* unknownEntity(entity)
    type ClientEntry = {
      readonly rpc: Rpc.AnyWithProps
      readonly context: Context.Context<never>
      readonly clientRequestId: string
      storageRequestId: string
      lastChunkId?: string
      replyHandler?: (reply: string) => Promise<void>
    }
    const entries = new Map<string, ClientEntry>()
    let client!: Effect.Success<ReturnType<typeof RpcClient.makeNoSerialization<any, MailboxFull | PersistenceError>>>

    const deliverReplies = (entry: ClientEntry, replyTexts: ReadonlyArray<string>): Effect.Effect<void> =>
      Effect.forEach(
        replyTexts,
        (replyText) =>
          Effect.flatMap(decodeReplyFor(entry.rpc, entry.context, replyText), (reply) => {
            if (reply._tag === "Chunk") {
              entry.lastChunkId = String(reply.id)
              return client.write({
                _tag: "Chunk",
                clientId: 0,
                requestId: entry.clientRequestId as any,
                values: reply.values
              })
            }
            entries.delete(entry.clientRequestId)
            return client.write({
              _tag: "Exit",
              clientId: 0,
              requestId: entry.clientRequestId as any,
              exit: reply.exit
            })
          }),
        { discard: true }
      )

    client = yield* RpcClient.makeNoSerialization<any, MailboxFull | PersistenceError>(entity.protocol, {
      spanPrefix: `${entity.type}.client`,
      supportsAck: true,
      generateRequestId: () => uuidV7(clock.currentTimeMillisUnsafe()) as any,
      onFromClient({ context, discard, message }): Effect.Effect<void, MailboxFull | PersistenceError> {
        const target = Context.getUnsafe(context, ClientTarget)
        switch (message._tag) {
          case "Request": {
            const rpc = entity.protocol.requests.get(message.tag)! as Rpc.AnyWithProps
            const clientRequestId = String(message.id)
            const encode = Schema.encodeUnknownEffect(Schema.toCodecJson(rpc.payloadSchema))(message.payload).pipe(
              Effect.provideContext(context as any),
              Effect.orDie
            ) as unknown as Effect.Effect<unknown>
            return Effect.flatMap(encode, (payload) => {
              const envelope = JSON.stringify({
                _tag: "Request",
                requestId: clientRequestId,
                address: {
                  shardId: target.address.shardId,
                  entityType: target.address.entityType,
                  entityId: target.address.entityId
                },
                tag: message.tag,
                payload,
                headers: message.headers,
                ...(message.traceId === undefined ? undefined : {
                  traceId: message.traceId,
                  spanId: message.spanId,
                  sampled: message.sampled
                })
              })
              const entry: ClientEntry = {
                rpc,
                context,
                clientRequestId,
                storageRequestId: clientRequestId
              }
              if (!discard) entries.set(clientRequestId, entry)
              const deliverAt = DeliverAt.toMillis(message.payload)
              const delayed = deliverAt !== null && deliverAt > clock.currentTimeMillisUnsafe()
              const persisted = Context.get(rpc.annotations, Persisted)
              const primaryKey = Envelope.primaryKey({
                ...message,
                requestId: message.id,
                address: target.address,
                headers: message.headers
              } as any)
              const replyTo = discard ? undefined : Context.get(context, CurrentEntityName)
              if (delayed && (!persisted || (!discard && primaryKey === null))) {
                entries.delete(clientRequestId)
                return Effect.fail(
                  new PersistenceError({
                    cause: new Error(
                      !persisted
                        ? "Future DeliverAt requests must be persisted"
                        : "Future DeliverAt asks must define a PrimaryKey"
                    )
                  })
                )
              }
              if (delayed && RpcSchema.isStreamSchema(rpc.successSchema)) {
                entries.delete(clientRequestId)
                return Effect.fail(
                  new PersistenceError({
                    cause: new Error("Stream asks with a future DeliverAt are not supported")
                  })
                )
              }
              const delivery = delayed
                ? { deliverAt: deliverAt!, primaryKey, ...(replyTo === undefined ? undefined : { replyTo }) }
                : replyTo === undefined
                ? undefined
                : { replyTo }
              let replyHandler: ((reply: string) => Promise<void>) | undefined
              if (delivery?.replyTo !== undefined) {
                replyHandler = async (reply) => {
                  unregisterReplyHandler(clientRequestId, replyHandler)
                  unregisterReplyHandler(entry.storageRequestId, replyHandler)
                  await Effect.runPromise(deliverReplies(entry, [reply]))
                }
                entry.replyHandler = replyHandler
                registerReplyHandler(clientRequestId, replyHandler)
              }
              return Effect.promise(() => target.stub.invoke(envelope, discard, delivery)).pipe(
                Effect.flatMap((result) => {
                  if (result.error === "MailboxFull") {
                    return Effect.fail(new MailboxFull({ address: target.address }) as MailboxFull | PersistenceError)
                  } else if (result.error === "EncodedMessageTooLarge") {
                    return Effect.fail(
                      new PersistenceError({ cause: new Error("Encoded entity message exceeds 2 MB") }) as
                        | MailboxFull
                        | PersistenceError
                    )
                  } else if (result.error === "AskDeduplicatedToTell") {
                    return Effect.fail(
                      new PersistenceError({
                        cause: new Error("Cannot deduplicate an ask onto a tell with the same PrimaryKey")
                      }) as MailboxFull | PersistenceError
                    )
                  }
                  entry.storageRequestId = result.requestId
                  if (replyHandler !== undefined && result.requestId !== clientRequestId) {
                    registerReplyHandler(result.requestId, replyHandler)
                  }
                  if (!discard && Context.get(rpc.annotations, Persisted)) {
                    rememberRequestTarget(clientRequestId, {
                      stub: target.stub,
                      storageRequestId: result.requestId
                    })
                  }
                  const deliver = discard ? Effect.void : deliverReplies(entry, result.replies)
                  if (replyHandler === undefined || result.replies.length === 0) return deliver
                  return Effect.ensuring(
                    deliver,
                    Effect.sync(() => {
                      unregisterReplyHandler(clientRequestId, replyHandler)
                      unregisterReplyHandler(entry.storageRequestId, replyHandler)
                    })
                  )
                }),
                Effect.tapCause(() =>
                  Effect.sync(() => {
                    unregisterReplyHandler(clientRequestId, replyHandler)
                    unregisterReplyHandler(entry.storageRequestId, replyHandler)
                  })
                )
              )
            })
          }
          case "Ack": {
            const entry = entries.get(String(message.requestId))
            if (entry === undefined || entry.lastChunkId === undefined) return Effect.void
            return Effect.promise(() => target.stub.acknowledge(entry.storageRequestId, entry.lastChunkId!)).pipe(
              Effect.flatMap((replies) => deliverReplies(entry, replies))
            )
          }
          case "Interrupt": {
            const clientRequestId = String(message.requestId)
            const entry = entries.get(clientRequestId)
            entries.delete(clientRequestId)
            requestTargets.delete(clientRequestId)
            unregisterReplyHandler(clientRequestId, entry?.replyHandler)
            if (entry?.replyHandler !== undefined) {
              unregisterReplyHandler(entry.storageRequestId, entry.replyHandler)
            }
            if (entry === undefined || target.stub.interrupt === undefined) return Effect.void
            return Effect.promise(() => target.stub.interrupt!(entry.storageRequestId, clientRequestId))
          }
          default:
            return Effect.void
        }
      }
    })

    return (entityId: string) => {
      const id = EntityId.make(entityId)
      const target = ClientTarget.context({
        address: EntityAddress.make({
          shardId: ShardId.make(entity.getShardGroup(id), 1),
          entityId: id,
          entityType: entity.type
        }),
        stub: options.entityNamespace.getByName(Internal.encodeName(entity.type, entityId)) as unknown as EntityStub
      })
      const result: Record<string, unknown> = {}
      for (const tag of entity.protocol.requests.keys()) {
        const rpc = entity.protocol.requests.get(tag)! as Rpc.AnyWithProps
        const contextFor = (
          ambient: Context.Context<never>,
          methodOptions?: { readonly context?: Context.Context<never> }
        ) => {
          const currentEntityName = Context.get(ambient, CurrentEntityName)
          let requestContext = currentEntityName === undefined
            ? target
            : Context.add(target, CurrentEntityName, currentEntityName)
          if (methodOptions?.context !== undefined) {
            requestContext = Context.merge(methodOptions.context, requestContext)
          }
          return requestContext
        }
        result[tag] = RpcSchema.isStreamSchema(rpc.successSchema)
          ? (payload: unknown, methodOptions?: { readonly context?: Context.Context<never> }) =>
            Stream.unwrap(
              Effect.map(Effect.context<never>(), (ambient) =>
                (client.client as any)[tag](payload, {
                  ...methodOptions,
                  context: contextFor(ambient, methodOptions)
                }))
            )
          : (payload: unknown, methodOptions?: { readonly context?: Context.Context<never> }) =>
            Effect.contextWith((ambient) =>
              (client.client as any)[tag](payload, {
                ...methodOptions,
                context: contextFor(ambient, methodOptions)
              })
            )
      }
      return result as any
    }
  })

  const registerEntity = Effect.fnUntraced(function*(
    entity: Entity.Entity<any, any>,
    build: Effect.Effect<unknown, never, unknown>,
    buildOptions?: Record<string, unknown>
  ) {
    if (!entities.has(entity.type)) {
      return yield* unknownEntity(entity)
    }
    const context = yield* Effect.context<never>()
    const registration = { entity, build: build as any, options: buildOptions, context }
    if (!registerEntityHandler(entity.type, registration)) return
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unregisterEntity(entity.type, registration)
      })
    )
  })

  const registerSingleton = Effect.fnUntraced(function*(
    name: string,
    run: Effect.Effect<void, unknown, unknown>
  ) {
    options.singletonNamespace.getByName(`Singleton/${name}`)
    const context = yield* Effect.context<never>()
    const registration = {
      run: run as Effect.Effect<void, unknown, never>,
      context
    }
    if (!registerSingletonHandler(name, registration)) {
      return yield* Effect.die(`Singleton '${name}' is already registered`)
    }
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unregisterSingleton(name, registration)
      })
    )
  })

  return Sharding.of({
    getRegistrationEvents: Stream.never,
    getShardId: (_entityId, group) => ShardId.make(group, 1),
    hasShardId: () => true,
    getSnowflake: Effect.sync(() => uuidV7(clock.currentTimeMillisUnsafe()) as any),
    isShutdown: Effect.succeed(false),
    makeClient: makeClient as Sharding["Service"]["makeClient"],
    registerEntity: registerEntity as Sharding["Service"]["registerEntity"],
    registerSingleton: registerSingleton as Sharding["Service"]["registerSingleton"],
    send: () => notImplemented("Sharding.send"),
    sendOutgoing: () => notImplemented("Sharding.sendOutgoing"),
    notify: () => notImplemented("Sharding.notify"),
    reset: (requestId) => {
      const target = requestTargets.get(String(requestId))
      if (target === undefined || target.stub.reset === undefined) return Effect.succeed(false)
      return Effect.as(Effect.promise(() => target.stub.reset!(target.storageRequestId)), true)
    },
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
 * Durable Object namespace bindings, plus the `WorkflowEngine` backed by the
 * workflow class and the `PersistedQueueFactory` backed by the queue class, so
 * the `DurableQueue` user API works out of the box. `Entity.client` resolves
 * an entity to its Durable Object by
 * encoding `(type, id)` with {@link encodeName} and calling `getByName`; an
 * unknown entity type or a bad encode fails at the Worker before any Durable
 * Object is contacted. Entity handlers registered with `Entity.toLayer` are
 * recorded per `EntityType` at Worker init and built once per Durable Object
 * wake; workflow handlers registered with `Workflow.toLayer` follow the same
 * pattern on the workflow class.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: LayerOptions): Layer.Layer<Sharding | WorkflowEngine | PersistedQueueFactory> =>
  Layer.mergeAll(
    Layer.effect(Sharding)(make(options)),
    CloudflareWorkflowEngine.layer({ workflowNamespace: options.workflowNamespace }),
    CloudflarePersistedQueue.layer({ queueNamespace: options.queueNamespace })
  )
