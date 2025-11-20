/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Arr from "effect/Array"
import type { Brand } from "effect/Brand"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type * as Schedule from "effect/Schedule"
import { Scope } from "effect/Scope"
import type * as Stream from "effect/Stream"
import type { AlreadyProcessingMessage, MailboxFull, PersistenceError } from "./ClusterError.js"
import { ShardGroup } from "./ClusterSchema.js"
import * as ClusterSchema from "./ClusterSchema.js"
import { EntityAddress } from "./EntityAddress.js"
import type { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import * as Envelope from "./Envelope.js"
import { hashString } from "./internal/hash.js"
import { ResourceMap } from "./internal/resourceMap.js"
import * as Message from "./Message.js"
import type * as Reply from "./Reply.js"
import { RunnerAddress } from "./RunnerAddress.js"
import * as ShardId from "./ShardId.js"
import type { Sharding } from "./Sharding.js"
import { ShardingConfig } from "./ShardingConfig.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Entity")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Entity<
  in out Type extends string,
  in out Rpcs extends Rpc.Any
> extends Equal.Equal {
  readonly [TypeId]: TypeId
  /**
   * The name of the entity type.
   */
  readonly type: Type & Brand<"EntityType">

  /**
   * A RpcGroup definition for messages which represents the messaging protocol
   * that the entity is capable of processing.
   */
  readonly protocol: RpcGroup.RpcGroup<Rpcs>

  /**
   * Get the shard group for the given EntityId.
   */
  getShardGroup(entityId: EntityId): string

  /**
   * Get the ShardId for the given EntityId.
   */
  getShardId(entityId: EntityId): Effect.Effect<ShardId.ShardId, never, Sharding>

  /**
   * Annotate the entity with a value.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Type, Rpcs>

  /**
   * Annotate the Rpc's above this point with a value.
   */
  annotateRpcs<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Type, Rpcs>

  /**
   * Annotate the entity with a context object.
   */
  annotateContext<S>(context: Context.Context<S>): Entity<Type, Rpcs>

  /**
   * Annotate the Rpc's above this point with a context object.
   */
  annotateRpcsContext<S>(context: Context.Context<S>): Entity<Type, Rpcs>

  /**
   * Create a client for this entity.
   */
  readonly client: Effect.Effect<
    (
      entityId: string
    ) => RpcClient.RpcClient.From<
      Rpcs,
      MailboxFull | AlreadyProcessingMessage | PersistenceError
    >,
    never,
    Sharding
  >

  /**
   * Create a Layer from an Entity.
   *
   * It will register the entity with the Sharding service.
   */
  toLayer<
    Handlers extends HandlersFrom<Rpcs>,
    RX = never
  >(
    build: Handlers | Effect.Effect<Handlers, never, RX>,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly concurrency?: number | "unbounded" | undefined
      readonly mailboxCapacity?: number | "unbounded" | undefined
      readonly disableFatalDefects?: boolean | undefined
      readonly defectRetryPolicy?: Schedule.Schedule<any, unknown> | undefined
      readonly spanAttributes?: Record<string, string> | undefined
    }
  ): Layer.Layer<
    never,
    never,
    | Exclude<RX, Scope | CurrentAddress | CurrentRunnerAddress>
    | RpcGroup.HandlersContext<Rpcs, Handlers>
    | Rpc.Context<Rpcs>
    | Rpc.Middleware<Rpcs>
    | Sharding
  >

  of<Handlers extends HandlersFrom<Rpcs>>(handlers: Handlers): Handlers

  /**
   * Create a Layer from an Entity.
   *
   * It will register the entity with the Sharding service.
   */
  toLayerMailbox<
    R,
    RX = never
  >(
    build:
      | ((
        mailbox: Mailbox.ReadonlyMailbox<Envelope.Request<Rpcs>>,
        replier: Replier<Rpcs>
      ) => Effect.Effect<never, never, R>)
      | Effect.Effect<
        (
          mailbox: Mailbox.ReadonlyMailbox<Envelope.Request<Rpcs>>,
          replier: Replier<Rpcs>
        ) => Effect.Effect<never, never, R>,
        never,
        RX
      >,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly mailboxCapacity?: number | "unbounded" | undefined
      readonly disableFatalDefects?: boolean | undefined
      readonly defectRetryPolicy?: Schedule.Schedule<any, unknown> | undefined
      readonly spanAttributes?: Record<string, string> | undefined
    }
  ): Layer.Layer<
    never,
    never,
    | Exclude<RX, Scope | CurrentAddress | CurrentRunnerAddress>
    | R
    | Rpc.Context<Rpcs>
    | Rpc.Middleware<Rpcs>
    | Sharding
  >
}
/**
 * @since 1.0.0
 * @category models
 */
export type Any = Entity<string, Rpc.Any>

/**
 * @since 1.0.0
 * @category models
 */
export type HandlersFrom<Rpc extends Rpc.Any> = {
  readonly [Current in Rpc as Current["_tag"]]: (
    envelope: Request<Current>
  ) => Rpc.ResultFrom<Current, any> | Rpc.Wrapper<Rpc.ResultFrom<Current, any>>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Any => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Hash.symbol](this: Entity<string, any>): number {
    return Hash.structure({ type: this.type })
  },
  [Equal.symbol](this: Entity<string, any>, that: Equal.Equal): boolean {
    return isEntity(that) && this.type === that.type
  },
  annotate<I, S>(this: Entity<string, any>, tag: Context.Tag<I, S>, value: S) {
    return fromRpcGroup(this.type, this.protocol.annotate(tag, value))
  },
  annotateRpcs<I, S>(this: Entity<string, any>, tag: Context.Tag<I, S>, value: S) {
    return fromRpcGroup(this.type, this.protocol.annotateRpcs(tag, value))
  },
  annotateContext<S>(this: Entity<string, any>, context: Context.Context<S>) {
    return fromRpcGroup(this.type, this.protocol.annotateContext(context))
  },
  annotateRpcsContext<S>(this: Entity<string, any>, context: Context.Context<S>) {
    return fromRpcGroup(this.type, this.protocol.annotateRpcsContext(context))
  },
  getShardId(this: Entity<string, any>, entityId: EntityId) {
    return Effect.map(shardingTag, (sharding) => sharding.getShardId(entityId, this.getShardGroup(entityId)))
  },
  get client() {
    return shardingTag.pipe(
      Effect.flatMap((sharding) => sharding.makeClient(this as any))
    )
  },
  toLayer<
    Rpcs extends Rpc.Any,
    Handlers extends HandlersFrom<Rpcs>,
    RX = never
  >(
    this: Entity<string, Rpcs>,
    build: Handlers | Effect.Effect<Handlers, never, RX>,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly concurrency?: number | "unbounded" | undefined
      readonly mailboxCapacity?: number | "unbounded" | undefined
      readonly disableFatalDefects?: boolean | undefined
      readonly defectRetryPolicy?: Schedule.Schedule<any, unknown> | undefined
      readonly spanAttributes?: Record<string, string> | undefined
    }
  ): Layer.Layer<
    never,
    never,
    | Exclude<RX, Scope | CurrentAddress | CurrentRunnerAddress>
    | RpcGroup.HandlersContext<Rpcs, Handlers>
    | Rpc.Context<Rpcs>
    | Rpc.Middleware<Rpcs>
    | Sharding
  > {
    return shardingTag.pipe(
      Effect.flatMap((sharding) =>
        sharding.registerEntity(
          this,
          Effect.isEffect(build) ? build : Effect.succeed(build),
          options
        )
      ),
      Layer.scopedDiscard
    )
  },
  of: identity,
  toLayerMailbox<
    Rpcs extends Rpc.Any,
    R,
    RX = never
  >(
    this: Entity<string, Rpcs>,
    build:
      | ((
        mailbox: Mailbox.ReadonlyMailbox<Envelope.Request<Rpcs>>,
        replier: Replier<Rpcs>
      ) => Effect.Effect<never, never, R>)
      | Effect.Effect<
        (
          mailbox: Mailbox.ReadonlyMailbox<Envelope.Request<Rpcs>>,
          replier: Replier<Rpcs>
        ) => Effect.Effect<never, never, R>,
        never,
        RX
      >,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly mailboxCapacity?: number | "unbounded" | undefined
      readonly disableFatalDefects?: boolean | undefined
      readonly defectRetryPolicy?: Schedule.Schedule<any, unknown> | undefined
      readonly spanAttributes?: Record<string, string> | undefined
    }
  ) {
    const buildHandlers = Effect.gen(this, function*() {
      const behaviour = Effect.isEffect(build) ? yield* build : build
      const mailbox = yield* Mailbox.make<Envelope.Request<Rpcs>>()

      // create the rpc handlers for the entity
      const handler = (envelope: any) => {
        return Effect.async<any, any>((resume) => {
          mailbox.unsafeOffer(envelope)
          resumes.set(envelope, resume)
        })
      }
      const handlers: Record<string, any> = {}
      for (const rpc of this.protocol.requests.keys()) {
        handlers[rpc] = handler
      }

      // make the Replier for the behaviour
      const resumes = new Map<Envelope.Request<any>, (exit: Exit.Exit<any, any>) => void>()
      const complete = (request: Envelope.Request<any>, exit: Exit.Exit<any, any>) =>
        Effect.sync(() => {
          const resume = resumes.get(request)
          if (resume) {
            resumes.delete(request)
            resume(exit)
          }
        })
      const replier: Replier<Rpcs> = {
        succeed: (request, value) => complete(request, Exit.succeed(value)),
        fail: (request, error) => complete(request, Exit.fail(error)),
        failCause: (request, cause) => complete(request, Exit.failCause(cause)),
        complete
      }

      // fork the behaviour into the layer scope
      yield* behaviour(mailbox, replier).pipe(
        Effect.catchAllCause((cause) => {
          const exit = Exit.failCause(cause)
          for (const resume of resumes.values()) {
            resume(exit)
          }
          return Effect.void
        }),
        Effect.interruptible,
        Effect.forkScoped
      )

      return handlers as any
    })

    return this.toLayer(buildHandlers, {
      ...options,
      concurrency: "unbounded"
    })
  }
}

/**
 * Creates a new `Entity` of the specified `type` which will accept messages
 * that adhere to the provided `RpcGroup`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromRpcGroup = <const Type extends string, Rpcs extends Rpc.Any>(
  /**
   * The entity type name.
   */
  type: Type,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: RpcGroup.RpcGroup<Rpcs>
): Entity<Type, Rpcs> => {
  const self = Object.create(Proto)
  self.type = EntityType.make(type)
  self.protocol = protocol
  self.getShardGroup = Context.get(protocol.annotations, ShardGroup)
  return self
}

/**
 * Creates a new `Entity` of the specified `type` which will accept messages
 * that adhere to the provided schemas.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <const Type extends string, Rpcs extends ReadonlyArray<Rpc.Any>>(
  /**
   * The entity type name.
   */
  type: Type,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: Rpcs
): Entity<Type, Rpcs[number]> => fromRpcGroup(type, RpcGroup.make(...protocol))

/**
 * A Context.Tag to access the current entity address.
 *
 * @since 1.0.0
 * @category context
 */
export class CurrentAddress extends Context.Tag("@effect/cluster/Entity/EntityAddress")<
  CurrentAddress,
  EntityAddress
>() {}

/**
 * A Context.Tag to access the current Runner address.
 *
 * @since 1.0.0
 * @category context
 */
export class CurrentRunnerAddress extends Context.Tag("@effect/cluster/Entity/RunnerAddress")<
  CurrentRunnerAddress,
  RunnerAddress
>() {}

/**
 * @since 1.0.0
 * @category Replier
 */
export interface Replier<Rpcs extends Rpc.Any> {
  readonly succeed: <R extends Rpcs>(
    request: Envelope.Request<R>,
    value: Replier.Success<R>
  ) => Effect.Effect<void>

  readonly fail: <R extends Rpcs>(
    request: Envelope.Request<R>,
    error: Rpc.Error<R>
  ) => Effect.Effect<void>

  readonly failCause: <R extends Rpcs>(
    request: Envelope.Request<R>,
    cause: Cause.Cause<Rpc.Error<R>>
  ) => Effect.Effect<void>

  readonly complete: <R extends Rpcs>(
    request: Envelope.Request<R>,
    exit: Exit.Exit<Replier.Success<R>, Rpc.Error<R>>
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category Replier
 */
export declare namespace Replier {
  /**
   * @since 1.0.0
   * @category Replier
   */
  export type Success<R extends Rpc.Any> = Rpc.Success<R> extends Stream.Stream<infer _A, infer _E, infer _R> ?
    Stream.Stream<_A, _E | Rpc.Error<R>, _R> | Mailbox.ReadonlyMailbox<_A, _E | Rpc.Error<R>>
    : Rpc.Success<R>
}

/**
 * @since 1.0.0
 * @category Request
 */
export class Request<Rpc extends Rpc.Any> extends Data.Class<
  Envelope.Request<Rpc> & {
    readonly lastSentChunk: Option.Option<Reply.Chunk<Rpc>>
  }
> {
  /**
   * @since 1.0.0
   */
  get lastSentChunkValue(): Option.Option<Rpc.SuccessChunk<Rpc>> {
    return this.lastSentChunk.pipe(Option.map((chunk) => Arr.lastNonEmpty(chunk.values)))
  }

  /**
   * @since 1.0.0
   */
  get nextSequence(): number {
    if (Option.isNone(this.lastSentChunk)) {
      return 0
    }
    return this.lastSentChunk.value.sequence + 1
  }
}

const shardingTag = Context.GenericTag<Sharding, Sharding["Type"]>("@effect/cluster/Sharding")

/**
 * @since 1.0.0
 * @category Testing
 */
export const makeTestClient: <Type extends string, Rpcs extends Rpc.Any, LA, LE, LR>(
  entity: Entity<Type, Rpcs>,
  layer: Layer.Layer<LA, LE, LR>
) => Effect.Effect<
  (entityId: string) => Effect.Effect<RpcClient.RpcClient<Rpcs>>,
  LE,
  Scope | ShardingConfig | Exclude<LR, Sharding> | Rpc.MiddlewareClient<Rpcs>
> = Effect.fnUntraced(function*<Type extends string, Rpcs extends Rpc.Any, LA, LE, LR>(
  entity: Entity<Type, Rpcs>,
  layer: Layer.Layer<LA, LE, LR>
) {
  const config = yield* ShardingConfig
  const makeShardId = (entityId: string) =>
    ShardId.make(
      entity.getShardGroup(entityId as EntityId),
      (Math.abs(hashString(entityId) % config.shardsPerGroup)) + 1
    )
  const snowflakeGen = yield* Snowflake.makeGenerator
  const runnerAddress = new RunnerAddress({ host: "localhost", port: 3000 })
  const entityMap = new Map<string, {
    readonly context: Context.Context<Rpc.Context<Rpcs> | Rpc.Middleware<Rpcs> | LR>
    readonly concurrency: number | "unbounded"
    readonly build: Effect.Effect<
      Context.Context<Rpc.ToHandler<Rpcs>>,
      never,
      Scope | CurrentAddress
    >
  }>()
  const sharding = shardingTag.of({
    ...({} as Sharding["Type"]),
    registerEntity: (entity, handlers, options) =>
      Effect.contextWith((context) => {
        entityMap.set(entity.type, {
          context: context as any,
          concurrency: options?.concurrency ?? 1,
          build: entity.protocol.toHandlersContext(handlers).pipe(
            Effect.provide(context.pipe(
              Context.add(CurrentRunnerAddress, runnerAddress),
              Context.omit(Scope)
            ))
          ) as any
        })
      })
  })
  yield* Layer.build(Layer.provide(layer, Layer.succeed(shardingTag, sharding)))
  const entityEntry = entityMap.get(entity.type)
  if (!entityEntry) {
    return yield* Effect.dieMessage(`Entity.makeTestClient: ${entity.type} was not registered by layer`)
  }

  const map = yield* ResourceMap.make(Effect.fnUntraced(function*(entityId: string) {
    const address = new EntityAddress({
      entityType: entity.type,
      entityId: entityId as EntityId,
      shardId: makeShardId(entityId)
    })
    const handlers = yield* entityEntry.build.pipe(
      Effect.provideService(CurrentAddress, address)
    )

    // eslint-disable-next-line prefer-const
    let client!: Effect.Effect.Success<ReturnType<typeof RpcClient.makeNoSerialization<Rpcs, never>>>
    const server = yield* RpcServer.makeNoSerialization(entity.protocol, {
      concurrency: entityEntry.concurrency,
      onFromServer(response) {
        return client.write(response)
      }
    }).pipe(Effect.provide(handlers))

    client = yield* RpcClient.makeNoSerialization(entity.protocol, {
      supportsAck: true,
      generateRequestId: () => snowflakeGen.unsafeNext() as any,
      onFromClient({ message }) {
        if (message._tag === "Request") {
          return server.write(0, {
            ...message,
            payload: new Request({
              ...message,
              [Envelope.TypeId]: Envelope.TypeId,
              address,
              requestId: Snowflake.Snowflake(message.id),
              lastSentChunk: Option.none()
            }) as any
          })
        }
        return server.write(0, message)
      }
    })
    return client.client
  }))

  return (entityId: string) => map.get(entityId)
})

/**
 * @since 1.0.0
 * @category Keep alive
 */
export const keepAlive: (
  enabled: boolean
) => Effect.Effect<
  void,
  never,
  Sharding | CurrentAddress
> = Effect.fnUntraced(function*(enabled: boolean) {
  const olatch = yield* Effect.serviceOption(KeepAliveLatch)
  if (olatch._tag === "None") return
  if (!enabled) {
    yield* olatch.value.open
    return
  }
  const sharding = yield* shardingTag
  const address = yield* CurrentAddress
  const requestId = yield* sharding.getSnowflake
  const span = yield* Effect.orDie(Effect.currentSpan)
  olatch.value.unsafeClose()
  yield* Effect.orDie(sharding.sendOutgoing(
    new Message.OutgoingRequest({
      rpc: KeepAliveRpc,
      context: Context.empty() as any,
      envelope: Envelope.makeRequest({
        requestId,
        address,
        tag: KeepAliveRpc._tag,
        payload: void 0,
        headers: Headers.empty,
        traceId: span.traceId,
        spanId: span.spanId,
        sampled: span.sampled
      }),
      lastReceivedReply: Option.none(),
      respond: () => Effect.void
    }),
    true
  ))
}, (effect, enabled) =>
  Effect.withSpan(
    effect,
    "Entity/keepAlive",
    { attributes: { enabled }, captureStackTrace: false }
  ))

/**
 * @since 1.0.0
 * @category Keep alive
 */
export const KeepAliveRpc = Rpc.make("Cluster/Entity/keepAlive")
  .annotate(ClusterSchema.Persisted, true)
  .annotate(ClusterSchema.Uninterruptible, true)

/**
 * @since 1.0.0
 * @category Keep alive
 */
export class KeepAliveLatch extends Context.Tag(
  "effect/cluster/Entity/KeepAliveLatch"
)<KeepAliveLatch, Effect.Latch>() {}
