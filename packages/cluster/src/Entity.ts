/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Arr from "effect/Array"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import { Scope } from "effect/Scope"
import type * as Stream from "effect/Stream"
import type {
  AlreadyProcessingMessage,
  EntityNotManagedByRunner,
  MailboxFull,
  PersistenceError
} from "./ClusterError.js"
import { EntityAddress } from "./EntityAddress.js"
import type { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import * as Envelope from "./Envelope.js"
import { hashString } from "./internal/hash.js"
import { ResourceMap } from "./internal/resourceMap.js"
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
export interface Entity<in out Rpcs extends Rpc.Any> extends Equal.Equal {
  readonly [TypeId]: TypeId
  /**
   * The name of the entity type.
   */
  readonly type: EntityType

  /**
   * A RpcGroup definition for messages which represents the messaging protocol
   * that the entity is capable of processing.
   */
  readonly protocol: RpcGroup.RpcGroup<Rpcs>

  /**
   * Annotate the entity with a value.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Rpcs>

  /**
   * Annotate the Rpc's above this point with a value.
   */
  annotateRpcs<I, S>(tag: Context.Tag<I, S>, value: S): Entity<Rpcs>

  /**
   * Annotate the entity with a context object.
   */
  annotateContext<S>(context: Context.Context<S>): Entity<Rpcs>

  /**
   * Annotate the Rpc's above this point with a context object.
   */
  annotateRpcsContext<S>(context: Context.Context<S>): Entity<Rpcs>

  /**
   * Create a client for this entity.
   */
  readonly client: Effect.Effect<
    (
      entityId: string
    ) => RpcClient.RpcClient<
      Rpcs,
      MailboxFull | AlreadyProcessingMessage | PersistenceError | EntityNotManagedByRunner
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
export type Any = Entity<Rpc.Any>

/**
 * @since 1.0.0
 * @category models
 */
export type HandlersFrom<Rpc extends Rpc.Any> = {
  readonly [Current in Rpc as Current["_tag"]]: (
    envelope: Request<Current>
  ) => Rpc.ResultFrom<Current, any> | Rpc.Fork<Rpc.ResultFrom<Current, any>>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Any => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Hash.symbol](this: Entity<any>): number {
    return Hash.structure({ type: this.type })
  },
  [Equal.symbol](this: Entity<any>, that: Equal.Equal): boolean {
    return isEntity(that) && this.type === that.type
  },
  annotate<I, S>(this: Entity<any>, tag: Context.Tag<I, S>, value: S) {
    return fromRpcGroup(this.type, this.protocol.annotate(tag, value))
  },
  annotateRpcs<I, S>(this: Entity<any>, tag: Context.Tag<I, S>, value: S) {
    return fromRpcGroup(this.type, this.protocol.annotateRpcs(tag, value))
  },
  annotateContext<S>(this: Entity<any>, context: Context.Context<S>) {
    return fromRpcGroup(this.type, this.protocol.annotateContext(context))
  },
  annotateRpcsContext<S>(this: Entity<any>, context: Context.Context<S>) {
    return fromRpcGroup(this.type, this.protocol.annotateRpcsContext(context))
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
    this: Entity<Rpcs>,
    build: Handlers | Effect.Effect<Handlers, never, RX>,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly concurrency?: number | "unbounded" | undefined
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
      Layer.effectDiscard
    )
  },
  toLayerMailbox<
    Rpcs extends Rpc.Any,
    R,
    RX = never
  >(
    this: Entity<Rpcs>,
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
export const fromRpcGroup = <Rpcs extends Rpc.Any>(
  /**
   * The entity type name.
   */
  type: string,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: RpcGroup.RpcGroup<Rpcs>
): Entity<Rpcs> => {
  const self = Object.create(Proto)
  self.type = EntityType.make(type)
  self.protocol = protocol
  return self
}

/**
 * Creates a new `Entity` of the specified `type` which will accept messages
 * that adhere to the provided schemas.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <Rpcs extends ReadonlyArray<Rpc.Any>>(
  /**
   * The entity type name.
   */
  type: string,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: Rpcs
): Entity<Rpcs[number]> => fromRpcGroup(type, RpcGroup.make(...protocol))

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
export const makeTestClient: <Rpcs extends Rpc.Any, LA, LE, LR>(
  entity: Entity<Rpcs>,
  layer: Layer.Layer<LA, LE, LR>
) => Effect.Effect<
  (entityId: string) => Effect.Effect<RpcClient.RpcClient<Rpcs>>,
  LE,
  Scope | ShardingConfig | Exclude<LR, Sharding> | Rpc.MiddlewareClient<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any, LA, LE, LR>(
  entity: Entity<Rpcs>,
  layer: Layer.Layer<LA, LE, LR>
) {
  const config = yield* ShardingConfig
  const makeShardId = (entityId: string) => ShardId.make((Math.abs(hashString(entityId) % config.numberOfShards)) + 1)
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
