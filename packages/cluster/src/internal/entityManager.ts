import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcServer from "@effect/rpc/RpcServer"
import { Duration } from "effect"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as ClusterMetrics from "../ClusterMetrics.js"
import type { Entity } from "../Entity.js"
import type { EntityAddress } from "../EntityAddress.js"
import * as Envelope from "../Envelope.js"
import * as Reply from "../Reply.js"
import { Sharding } from "../Sharding.js"
import { ShardingConfig } from "../ShardingConfig.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingError.js"
import * as Snowflake from "../Snowflake.js"

/** @internal */
export interface EntityManager {
  readonly send: <R extends Rpc.Any>(
    envelope: Envelope.Envelope<R>
  ) => Effect.Effect<void, EntityNotManagedByPod>

  readonly sendEncoded: (
    envelope: Envelope.Envelope.PartialEncoded
  ) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>

  run(f: (reply: Reply.ReplyWithContext<Rpc.Any>) => Effect.Effect<void>): Effect.Effect<never>
}

/** @internal */
export const make = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  entity: Entity<Rpcs>,
  options?: {
    readonly maxIdleTime?: DurationInput | undefined
  } | undefined
) {
  const config = yield* ShardingConfig
  const sharding = yield* Sharding
  const snowflakeGen = yield* Snowflake.Generator
  const clock = yield* Effect.clock
  const context = yield* Effect.context<Rpc.Context<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ToHandler<Rpcs>>()
  const gauge = ClusterMetrics.entities.pipe(Metric.tagged("type", entity.type))
  let writeReply: (reply: Reply.ReplyWithContext<Rpcs>) => Effect.Effect<void> = () => Effect.void

  // Represents the entities managed by this entity manager
  type EntityState = {
    readonly write: RpcServer.RpcServer<Rpcs>["write"]
    readonly activeRequests: Map<bigint, {
      readonly envelope: Envelope.Request<any>
      readonly rpc: Rpcs
    }>
    lastActiveCheck: number
  }
  const servers = new Map<EntityAddress, EntityState>()
  const entities: RcMap.RcMap<EntityAddress, EntityState, EntityNotManagedByPod> = yield* RcMap.make({
    idleTimeToLive: Duration.infinity,
    lookup: Effect.fnUntraced(function*(address: EntityAddress) {
      if (yield* sharding.isShutdown) {
        return yield* new EntityNotManagedByPod({ address })
      }
      const scope = yield* Effect.scope
      const shardId = sharding.getShardId(address.entityId)

      // Initiate the behavior for the entity
      const server = yield* RpcServer.makeNoSerialization(entity.protocol).pipe(
        Effect.locally(FiberRef.currentContext, context)
      )

      // run the Rpc server and map the responses to replies
      const fiber: Fiber.RuntimeFiber<void> = yield* server.run((response) => {
        switch (response._tag) {
          case "Exit": {
            const request = state.activeRequests.get(response.requestId)!
            state.activeRequests.delete(response.requestId)
            return writeReply(
              new Reply.ReplyWithContext({
                reply: new Reply.WithExit({
                  requestId: response.requestId as any,
                  id: snowflakeGen.unsafeNext(shardId),
                  exit: response.exit
                }),
                context,
                rpc: request.rpc
              })
            )
          }
          case "Chunk": {
            const request = state.activeRequests.get(response.requestId)!
            return writeReply(
              new Reply.ReplyWithContext({
                reply: new Reply.Chunk({
                  requestId: response.requestId as any,
                  id: snowflakeGen.unsafeNext(shardId),
                  values: response.values
                }),
                context,
                rpc: request.rpc
              })
            )
          }
          case "Defect": {
            return Effect.zipLeft(
              Effect.logDebug("Got defect in entity", Cause.die(response.defect)).pipe(
                Effect.annotateLogs({
                  module: "EntityManager",
                  address
                })
              ),
              RcMap.invalidate(entities, address)
            )
          }
          case "ClientEnd": {
            return Fiber.interrupt(fiber)
          }
        }
      }).pipe(
        Effect.interruptible,
        Effect.forkDaemon
      )

      // During shutdown, signal that no more messages will be processed
      // and wait for the fiber to complete.
      //
      // If the termination timeout is reached, completely **DESTROY** the behavior.
      yield* Scope.addFinalizer(
        scope,
        server.write(0, { _tag: "Eof" }).pipe(
          Effect.andThen(Fiber.await(fiber)),
          Effect.timeoutOption(config.entityTerminationTimeout),
          Effect.flatMap(Option.match({
            onNone: () => Fiber.interrupt(fiber),
            onSome: () => Effect.void
          }))
        )
      )

      // Perform metric bookkeeping
      yield* Metric.increment(gauge)
      yield* Scope.addFinalizer(scope, Metric.incrementBy(gauge, BigInt(-1)))

      const state: EntityState = {
        write: server.write,
        activeRequests: new Map(),
        lastActiveCheck: clock.unsafeCurrentTimeMillis()
      }

      // add servers to map for expiration check
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          state.activeRequests.clear()
          return servers.delete(address)
        })
      )
      servers.set(address, state)

      return state
    })
  })

  const maxIdleTime = Duration.decode(options?.maxIdleTime ?? config.entityMaxIdleTime)
  if (Duration.isFinite(maxIdleTime)) {
    yield* Effect.forkScoped(Effect.gen(function*() {
      while (true) {
        // use a resolution of 1 minute
        yield* Effect.sleep(Duration.minutes(1))

        const now = clock.unsafeCurrentTimeMillis()
        for (const [address, state] of servers) {
          const duration = Duration.millis(now - state.lastActiveCheck)
          if (state.activeRequests.size > 0 || Duration.lessThan(duration, maxIdleTime)) {
            continue
          }
          yield* Effect.fork(RcMap.invalidate(entities, address))
        }
      }
    }))
  }

  function send<R extends Rpc.Any>(
    envelope: Envelope.Envelope<R>
  ): Effect.Effect<void, EntityNotManagedByPod> {
    return RcMap.get(entities, envelope.address).pipe(
      Effect.flatMap((server) => {
        switch (envelope._tag) {
          case "Request": {
            server.activeRequests.set(envelope.id, {
              envelope,
              rpc: entity.protocol.requests.get(envelope.tag) as any
            })
            return server.write(0, envelope as any)
          }
          case "AckChunk": {
            return server.write(0, { _tag: "Ack", requestId: envelope.requestId as any })
          }
          case "Interrupt": {
            return server.write(0, { _tag: "Interrupt", requestId: envelope.requestId as any })
          }
        }
      }),
      Effect.scoped
    )
  }

  const decodeEnvelope = Schema.decode(makeEnvelopeSchema(entity))

  const run = (f: (reply: Reply.ReplyWithContext<Rpcs>) => Effect.Effect<void>): Effect.Effect<never> =>
    Effect.suspend(() => {
      const prev = writeReply
      writeReply = f
      return Effect.ensuring(
        Effect.never,
        Effect.sync(() => {
          writeReply = prev
        })
      )
    })

  return identity<EntityManager>({
    run,
    send,
    sendEncoded: (encodedEnvelope) =>
      decodeEnvelope(encodedEnvelope).pipe(
        MalformedMessage.refail,
        Effect.flatMap(send),
        Effect.provide(context as Context.Context<unknown>)
      )
  })
})

const makeEnvelopeSchema = <Rpcs extends Rpc.Any>(entity: Entity<Rpcs>): Schema.Schema<
  Envelope.Envelope<Rpcs>,
  Envelope.Envelope.PartialEncoded,
  Rpc.Context<Rpcs>
> => {
  const payloads = new Set<Schema.Schema.Any>()
  for (const rpc of entity.protocol.requests.values()) {
    payloads.add((rpc as any as Rpc.AnyWithProps).payloadSchema)
  }
  return Schema.transform(
    Schema.Union(
      Schema.Struct({
        ...Envelope.PartialEncodedRequestFromSelf.fields,
        payload: Schema.Union(...payloads)
      }),
      Envelope.AckChunk,
      Envelope.Interrupt
    ),
    Envelope.EnvelopeFromSelf,
    {
      decode: (encoded) => encoded._tag === "Request" ? Envelope.makeRequest(encoded) : encoded,
      encode: identity
    }
  ) as any
}
