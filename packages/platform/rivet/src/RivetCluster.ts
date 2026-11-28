/**
 * Runs Effect Cluster entities on Rivet Actors. Prototype.
 *
 * Every entity instance is one RivetKit actor, `clusterEntity` keyed
 * `[entityType, entityId]`, whose own SQLite is the system of record. There
 * is no shard routing, runner fleet or external message storage; `layer`
 * provides `Sharding` over a RivetKit client instead of `Sharding.layer`.
 *
 * Supported: persisted and volatile unary asks and tells, primary-key
 * deduplication, replay of unprocessed requests on wake, interruption, and
 * `ClusterSchema.WithTransaction` for persisted asks. Not supported:
 * streams, `DeliverAt`, `Entity.keepAlive`, singletons, workflows and
 * queues.
 *
 * @stability experimental
 * @since 4.1.6
 */
import * as Cause from "effect/Cause"
import { Clock } from "effect/Clock"
import { MailboxFull, PersistenceError } from "effect/cluster/ClusterError"
import { isUninterruptibleForClient, Persisted } from "effect/cluster/ClusterSchema"
import type * as Entity from "effect/cluster/Entity"
import * as EntityAddress from "effect/cluster/EntityAddress"
import * as EntityId from "effect/cluster/EntityId"
import * as Envelope from "effect/cluster/Envelope"
import * as ShardId from "effect/cluster/ShardId"
import { Sharding } from "effect/cluster/Sharding"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import type * as Rpc from "effect/rpc/Rpc"
import * as RpcClient from "effect/rpc/RpcClient"
import { type FromClient, RequestId } from "effect/rpc/RpcMessage"
import * as RpcSchema from "effect/rpc/RpcSchema"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { registerEntity as registerEntityHandler, unregisterEntity } from "./internal/entityRegistry.ts"
import { decodeInvokeResult, decodeReplyFor, encodeRequest } from "./internal/entityWire.ts"
import { boundedRetry, callActor } from "./internal/transport.ts"

/**
 * The part of a RivetKit client the cluster uses: a handle to the
 * `clusterEntity` actor for a key.
 *
 * **Details**
 *
 * A client created with `createClient<typeof registry>()` from
 * `rivetkit/client`, for a registry that registers
 * `RivetActors.makeClusterEntity()` as `clusterEntity`, satisfies it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.6
 */
export interface ClusterClient {
  readonly clusterEntity: {
    readonly getOrCreate: (key: Array<string>) => {
      readonly action: (options: { readonly name: string; readonly args: Array<unknown> }) => Promise<unknown>
    }
  }
}

/**
 * Options for {@link layer}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.6
 */
export interface LayerOptions {
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  readonly client: ClusterClient
}

const notSupported = (method: string) =>
  Effect.die(new Error(`RivetCluster: ${method} is not supported on the Rivet actor path`))

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

interface ClientTargetValue {
  readonly address: EntityAddress.EntityAddress
  readonly call: (name: string, args: Array<unknown>) => Promise<unknown>
}

class ClientTarget extends Context.Service<ClientTarget, ClientTargetValue>()(
  "@effect/platform-rivet/RivetCluster/ClientTarget"
) {}

const make = Effect.fnUntraced(function*(options: LayerOptions) {
  const layerScope = yield* Effect.scope
  const layerContext = yield* Effect.context<never>()
  const entities = new Map<string, Entity.Entity<any, any>>()
  for (const entity of options.entities) entities.set(entity.type, entity)
  const clock = yield* Clock

  const unknownEntity = (entity: Entity.Entity<any, any>) =>
    Effect.die(new Error(`RivetCluster: entity type "${entity.type}" is not part of the layer's entities`))

  const buildClient = Effect.fnUntraced(function*(entity: Entity.Entity<any, any>) {
    type ClientEntry = {
      readonly rpc: Rpc.AnyWithProps
      readonly context: Context.Context<never>
      readonly clientRequestId: string
      storageRequestId: string
    }
    const entries = new Map<string, ClientEntry>()

    const client = yield* RpcClient.makeNoSerialization<any, MailboxFull | PersistenceError, true>(entity.protocol, {
      spanPrefix: `${entity.type}.client`,
      generateRequestId: () => RequestId(uuidV7(clock.currentTimeMillisUnsafe())),
      flatten: true,
      onFromClient: (options) => handleFromClient(options)
    })

    const deliverReplies = (entry: ClientEntry, replyTexts: ReadonlyArray<string>): Effect.Effect<void> =>
      Effect.forEach(
        replyTexts,
        (replyText) =>
          Effect.flatMap(decodeReplyFor(entry.rpc, entry.context, replyText), (reply) => {
            entries.delete(entry.clientRequestId)
            return client.write({
              _tag: "Exit",
              clientId: 0,
              requestId: RequestId(entry.clientRequestId),
              exit: reply.exit
            })
          }),
        { discard: true }
      )

    function handleFromClient({ context, message }: {
      readonly message: FromClient<any>
      readonly context: Context.Context<never>
    }): Effect.Effect<void, MailboxFull | PersistenceError> {
      const target = Context.getUnsafe(context, ClientTarget)
      switch (message._tag) {
        case "Request": {
          const discard = message.discard === true
          const rpc = entity.protocol.requests.get(message.tag)! as Rpc.AnyWithProps
          const clientRequestId = String(message.id)
          if (RpcSchema.isStreamSchema(rpc.successSchema)) {
            return Effect.die(new Error("RivetCluster: stream RPCs are not supported yet"))
          }
          const encode = Schema.encodeUnknownEffect(Schema.toCodecJson(rpc.payloadSchema))(message.payload).pipe(
            Effect.provideContext(context as any),
            Effect.orDie
          ) as unknown as Effect.Effect<unknown>
          return Effect.flatMap(encode, (payload) => {
            const envelope = encodeRequest({
              requestId: clientRequestId,
              address: target.address,
              tag: message.tag,
              payload,
              headers: message.headers,
              ...(message.traceId === undefined ? undefined : {
                traceId: message.traceId,
                spanId: message.spanId,
                sampled: message.sampled
              })
            })
            const entry: ClientEntry = { rpc, context, clientRequestId, storageRequestId: clientRequestId }
            if (!discard) entries.set(clientRequestId, entry)
            const persisted = Context.get(rpc.annotations, Persisted)
            const primaryKey = Envelope.primaryKey({
              ...message,
              requestId: message.id,
              address: target.address,
              headers: message.headers
            } as any)
            // The mailbox dedupes on the request id, so a persisted request is
            // safe to retry. A volatile one may already be running.
            return callActor({
              call: () => target.call("invoke", [envelope, discard, primaryKey]),
              retry: persisted ? boundedRetry : undefined
            }).pipe(
              Effect.flatMap(decodeInvokeResult),
              Effect.flatMap((result): Effect.Effect<void, MailboxFull | PersistenceError> => {
                switch (result._tag) {
                  case "MailboxFull":
                    return Effect.fail(new MailboxFull({ address: target.address }))
                  case "EncodedMessageTooLarge":
                    return Effect.fail(
                      new PersistenceError({ cause: new Error("Encoded entity message exceeds 2 MB") })
                    )
                  case "AskDeduplicatedToTell":
                    return Effect.fail(
                      new PersistenceError({
                        cause: new Error("Cannot deduplicate an ask onto a tell with the same PrimaryKey")
                      })
                    )
                  case "Success": {
                    entry.storageRequestId = result.requestId
                    if (discard) {
                      return client.write({
                        _tag: "Exit",
                        clientId: 0,
                        requestId: RequestId(clientRequestId),
                        exit: Exit.void as any
                      })
                    }
                    return deliverReplies(entry, result.replies)
                  }
                }
              }),
              Effect.onExit((exit) =>
                Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)
                  ? Effect.sync(() => entries.delete(clientRequestId))
                  : Effect.void
              )
            )
          })
        }
        case "Interrupt": {
          const clientRequestId = String(message.requestId)
          const entry = entries.get(clientRequestId)
          entries.delete(clientRequestId)
          if (entry === undefined) return Effect.void
          if (isUninterruptibleForClient(entry.rpc.annotations)) return Effect.void
          return callActor({
            call: () => target.call("interrupt", [entry.storageRequestId]),
            retry: boundedRetry
          })
        }
        default:
          return Effect.void
      }
    }

    return (entityId: string) => {
      const id = EntityId.make(entityId)
      const target = ClientTarget.context({
        address: EntityAddress.make({
          shardId: ShardId.make(entity.getShardGroup(id), 1),
          entityId: id,
          entityType: entity.type
        }),
        // A fresh handle per call, so a failed resolution is never reused.
        call: (name, args) => options.client.clusterEntity.getOrCreate([entity.type, entityId]).action({ name, args })
      })
      const result: Record<string, unknown> = {}
      for (const tag of entity.protocol.requests.keys()) {
        result[tag] = (payload: unknown, methodOptions?: { readonly context?: Context.Context<never> }) => {
          const requestContext = methodOptions?.context === undefined
            ? target
            : Context.merge(methodOptions.context, target)
          return client.client(tag, payload, { ...methodOptions, context: requestContext })
        }
      }
      return result as any
    }
  })

  type ClientFactory = (entityId: string) => any
  const clientContext = Context.add(layerContext, Scope.Scope, layerScope)
  const clients = new Map<Entity.Entity<any, any>, Deferred.Deferred<ClientFactory>>()
  const makeClient = (entity: Entity.Entity<any, any>): Effect.Effect<ClientFactory> =>
    Effect.suspend(() => {
      if (!entities.has(entity.type)) return unknownEntity(entity)
      const existing = clients.get(entity)
      if (existing !== undefined) return Deferred.await(existing)
      const deferred = Deferred.makeUnsafe<ClientFactory>()
      clients.set(entity, deferred)
      return buildClient(entity).pipe(
        Effect.provideContext(clientContext),
        Effect.tap((factory) => Deferred.succeed(deferred, factory)),
        Effect.uninterruptible
      )
    })

  const registerEntity = Effect.fnUntraced(function*(
    entity: Entity.Entity<any, any>,
    build: Effect.Effect<unknown, never, unknown>,
    buildOptions?: Record<string, unknown>
  ) {
    if (!entities.has(entity.type)) return yield* unknownEntity(entity)
    const context = yield* Effect.context<never>()
    const registration = { entity, build: build as any, options: buildOptions, context }
    if (!registerEntityHandler(entity.type, registration)) return
    yield* Effect.addFinalizer(() => Effect.sync(() => unregisterEntity(entity.type, registration)))
  })

  return Sharding.of({
    getRegistrationEvents: Stream.never,
    getShardId: (_entityId, group) => ShardId.make(group, 1),
    hasShardId: () => true,
    getSnowflake: notSupported("Sharding.getSnowflake"),
    isShutdown: Effect.succeed(false),
    makeClient: makeClient as Sharding["Service"]["makeClient"],
    registerEntity: registerEntity as Sharding["Service"]["registerEntity"],
    registerSingleton: () => notSupported("Sharding.registerSingleton"),
    send: () => notSupported("Sharding.send"),
    sendOutgoing: () => notSupported("Sharding.sendOutgoing"),
    notify: () => notSupported("Sharding.notify"),
    reset: () => Effect.succeed(false),
    pollStorage: notSupported("Sharding.pollStorage"),
    activeEntityCount: Effect.succeed(0)
  })
})

/**
 * Builds the cluster `Sharding` service on Rivet actors.
 *
 * **Details**
 *
 * `Entity.client` resolves an entity to the `clusterEntity` actor keyed
 * `[entityType, entityId]` through `client`. Handlers registered with
 * `Entity.toLayer` are recorded per entity type in this process and built
 * once per actor wake on the node that hosts the actor. An entity type outside
 * `entities` fails before any actor is contacted.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.6
 */
export const layer = (options: LayerOptions): Layer.Layer<Sharding> => Layer.effect(Sharding, make(options))
