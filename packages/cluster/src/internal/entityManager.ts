import type * as Rpc from "@effect/rpc/Rpc"
import { RequestId } from "@effect/rpc/RpcMessage"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { AlreadyProcessingMessage, EntityNotAssignedToRunner, MailboxFull, MalformedMessage } from "../ClusterError.js"
import * as ClusterMetrics from "../ClusterMetrics.js"
import { Persisted, Uninterruptible } from "../ClusterSchema.js"
import type { Entity, HandlersFrom } from "../Entity.js"
import { CurrentAddress, CurrentRunnerAddress, Request } from "../Entity.js"
import type { EntityAddress } from "../EntityAddress.js"
import type { EntityId } from "../EntityId.js"
import * as Envelope from "../Envelope.js"
import * as Message from "../Message.js"
import * as MessageStorage from "../MessageStorage.js"
import * as Reply from "../Reply.js"
import type { RunnerAddress } from "../RunnerAddress.js"
import type { ShardId } from "../ShardId.js"
import type { Sharding } from "../Sharding.js"
import { ShardingConfig } from "../ShardingConfig.js"
import * as Snowflake from "../Snowflake.js"
import { EntityReaper } from "./entityReaper.js"
import { internalInterruptors } from "./interruptors.js"
import { ResourceMap } from "./resourceMap.js"
import { ResourceRef } from "./resourceRef.js"

/** @internal */
export interface EntityManager {
  readonly sendLocal: <R extends Rpc.Any>(
    message: Message.IncomingLocal<R>
  ) => Effect.Effect<void, EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage>

  readonly send: (
    message: Message.Incoming<any>
  ) => Effect.Effect<void, EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage>

  readonly isProcessingFor: (message: Message.Incoming<any>, options?: {
    readonly excludeReplies?: boolean
  }) => boolean

  readonly interruptShard: (shardId: ShardId) => Effect.Effect<void>

  readonly activeEntityCount: Effect.Effect<number>
}

// Represents the entities managed by this entity manager
/** @internal */
export type EntityState = {
  readonly address: EntityAddress
  readonly mailboxGauge: Metric.Metric.Gauge<bigint>
  readonly activeRequests: Map<bigint, {
    readonly rpc: Rpc.AnyWithProps
    readonly message: Message.IncomingRequestLocal<any>
    sentReply: boolean
    lastSentChunk: Option.Option<Reply.Chunk<Rpc.Any>>
    sequence: number
  }>
  lastActiveCheck: number
  write: RpcServer.RpcServer<any>["write"]
}

/** @internal */
export const make = Effect.fnUntraced(function*<
  Type extends string,
  Rpcs extends Rpc.Any,
  Handlers extends HandlersFrom<Rpcs>,
  RX
>(
  entity: Entity<Type, Rpcs>,
  buildHandlers: Effect.Effect<Handlers, never, RX>,
  options: {
    readonly sharding: Sharding["Type"]
    readonly storage: MessageStorage.MessageStorage["Type"]
    readonly runnerAddress: RunnerAddress
    readonly maxIdleTime?: DurationInput | undefined
    readonly concurrency?: number | "unbounded" | undefined
    readonly mailboxCapacity?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly defectRetryPolicy?: Schedule.Schedule<any, unknown, never> | undefined
    readonly spanAttributes?: Record<string, string> | undefined
  }
) {
  const config = yield* ShardingConfig
  const snowflakeGen = yield* Snowflake.Generator
  const managerScope = yield* Effect.scope
  const storageEnabled = options.storage !== MessageStorage.noop
  const mailboxCapacity = options.mailboxCapacity ?? config.entityMailboxCapacity
  const clock = yield* Effect.clock
  const context = yield* Effect.context<Rpc.Context<Rpcs> | Rpc.Middleware<Rpcs> | RX>()
  const retryDriver = yield* Schedule.driver(
    options.defectRetryPolicy ? Schedule.andThen(options.defectRetryPolicy, defaultRetryPolicy) : defaultRetryPolicy
  )

  const activeServers = new Map<EntityId, EntityState>()

  const entities: ResourceMap<
    EntityAddress,
    EntityState,
    EntityNotAssignedToRunner
  > = yield* ResourceMap.make(Effect.fnUntraced(function*(address) {
    if (yield* options.sharding.isShutdown) {
      return yield* new EntityNotAssignedToRunner({ address })
    }

    const scope = yield* Effect.scope
    const endLatch = yield* Effect.makeLatch()

    // on shutdown, reset the storage for the entity
    yield* Scope.addFinalizer(
      scope,
      Effect.ignore(options.storage.resetAddress(address))
    )

    const activeRequests: EntityState["activeRequests"] = new Map()
    let defectRequestIds: Array<bigint> = []

    // the server is stored in a ref, so if there is a defect, we can
    // swap the server without losing the active requests
    const writeRef = yield* ResourceRef.from(
      scope,
      Effect.fnUntraced(function*(scope) {
        let isShuttingDown = false

        // Initiate the behavior for the entity
        const handlers = yield* (entity.protocol.toHandlersContext(buildHandlers).pipe(
          Effect.provide(context.pipe(
            Context.add(CurrentAddress, address),
            Context.add(CurrentRunnerAddress, options.runnerAddress),
            Context.add(Scope.Scope, scope)
          )),
          Effect.locally(FiberRef.currentLogAnnotations, HashMap.empty())
        ) as Effect.Effect<Context.Context<Rpc.ToHandler<Rpcs>>>)

        const server = yield* RpcServer.makeNoSerialization(entity.protocol, {
          spanPrefix: `${entity.type}(${address.entityId})`,
          spanAttributes: {
            ...options.spanAttributes,
            "entity.type": entity.type,
            "entity.id": address.entityId
          },
          concurrency: options.concurrency ?? 1,
          disableFatalDefects: options.disableFatalDefects,
          onFromServer(response): Effect.Effect<void> {
            switch (response._tag) {
              case "Exit": {
                const request = activeRequests.get(response.requestId)
                if (!request) return Effect.void

                request.sentReply = true

                // For durable messages, ignore interrupts during shutdown.
                // They will be retried when the entity is restarted.
                // Also, if the request is uninterruptible, we ignore the
                // interrupt.
                if (
                  storageEnabled &&
                  Context.get(request.rpc.annotations, Persisted) &&
                  Exit.isInterrupted(response.exit) &&
                  (isShuttingDown || Context.get(request.rpc.annotations, Uninterruptible))
                ) {
                  return Effect.void
                }
                return retryRespond(
                  4,
                  Effect.suspend(() =>
                    request.message.respond(
                      new Reply.WithExit({
                        requestId: Snowflake.Snowflake(response.requestId),
                        id: snowflakeGen.unsafeNext(),
                        exit: response.exit
                      })
                    )
                  )
                ).pipe(
                  Effect.flatMap(() => {
                    activeRequests.delete(response.requestId)

                    // ensure that the reaper does not remove the entity as we haven't
                    // been "idle" yet
                    if (activeRequests.size === 0) {
                      state.lastActiveCheck = clock.unsafeCurrentTimeMillis()
                    }

                    return Effect.void
                  }),
                  Effect.orDie
                )
              }
              case "Chunk": {
                const request = activeRequests.get(response.requestId)
                if (!request) return Effect.void
                const sequence = request.sequence
                request.sequence++
                if (!request.sentReply) {
                  request.sentReply = true
                }
                return Effect.orDie(retryRespond(
                  4,
                  Effect.suspend(() => {
                    const reply = new Reply.Chunk({
                      requestId: Snowflake.Snowflake(response.requestId),
                      id: snowflakeGen.unsafeNext(),
                      sequence,
                      values: response.values
                    })
                    request.lastSentChunk = Option.some(reply)
                    return request.message.respond(reply)
                  })
                ))
              }
              case "Defect": {
                return Effect.forkIn(onDefect(Cause.die(response.defect)), managerScope)
              }
              case "ClientEnd": {
                return endLatch.open
              }
            }
          }
        }).pipe(
          Scope.extend(scope),
          Effect.provide(handlers)
        )

        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => {
            isShuttingDown = true
          })
        )

        for (const id of defectRequestIds) {
          const { lastSentChunk, message } = activeRequests.get(id)!
          yield* server.write(0, {
            ...message.envelope,
            id: RequestId(message.envelope.requestId),
            tag: message.envelope.tag as any,
            payload: new Request({
              ...message.envelope,
              lastSentChunk
            } as any) as any
          })
        }
        defectRequestIds = []

        return server.write
      })
    )

    function onDefect(cause: Cause.Cause<never>): Effect.Effect<void> {
      const effect = writeRef.unsafeRebuild()
      defectRequestIds = Array.from(activeRequests.keys())
      return Effect.logError("Defect in entity, restarting", cause).pipe(
        Effect.andThen(Effect.ignore(retryDriver.next(void 0))),
        Effect.andThen(effect),
        Effect.annotateLogs({
          module: "EntityManager",
          address,
          runner: options.runnerAddress
        }),
        Effect.catchAllCause(onDefect)
      )
    }

    const state: EntityState = {
      address,
      mailboxGauge: ClusterMetrics.mailboxSize.pipe(
        Metric.tagged("type", entity.type),
        Metric.tagged("entityId", address.entityId)
      ),
      write(clientId, message) {
        if (writeRef.state.current._tag !== "Acquired") {
          return Effect.flatMap(writeRef.await, (write) => write(clientId, message))
        }
        return writeRef.state.current.value(clientId, message)
      },
      activeRequests,
      lastActiveCheck: clock.unsafeCurrentTimeMillis()
    }

    // During shutdown, signal that no more messages will be processed
    // and wait for the fiber to complete.
    //
    // If the termination timeout is reached, let the server clean itself up
    yield* Scope.addFinalizer(
      scope,
      Effect.withFiberRuntime((fiber) => {
        activeServers.delete(address.entityId)
        internalInterruptors.add(fiber.id())
        return state.write(0, { _tag: "Eof" }).pipe(
          Effect.andThen(Effect.interruptible(endLatch.await)),
          Effect.timeoutOption(config.entityTerminationTimeout)
        )
      })
    )
    activeServers.set(address.entityId, state)

    return state
  }, Effect.locally(FiberRef.currentLogAnnotations, HashMap.empty())))

  const reaper = yield* EntityReaper
  const maxIdleTime = Duration.toMillis(options.maxIdleTime ?? config.entityMaxIdleTime)
  if (Number.isFinite(maxIdleTime)) {
    yield* reaper.register({
      maxIdleTime,
      servers: activeServers,
      entities
    })
  }

  // update metrics for active servers
  const gauge = ClusterMetrics.entities.pipe(Metric.tagged("type", entity.type))
  yield* Effect.sync(() => {
    gauge.unsafeUpdate(BigInt(activeServers.size), [])
    for (const state of activeServers.values()) {
      state.mailboxGauge.unsafeUpdate(BigInt(state.activeRequests.size), [])
    }
  }).pipe(
    Effect.andThen(Effect.sleep(1000)),
    Effect.forever,
    Effect.forkIn(managerScope)
  )

  function sendLocal<R extends Rpc.Any>(
    message: Message.IncomingLocal<R>
  ): Effect.Effect<void, EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage> {
    return Effect.locally(
      Effect.flatMap(
        entities.get(message.envelope.address),
        (server): Effect.Effect<void, EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage> => {
          switch (message._tag) {
            case "IncomingRequestLocal": {
              // If the request is already running, then we might have more than
              // one sender for the same request. In this case, the other senders
              // should resume from storage only.
              let entry = server.activeRequests.get(message.envelope.requestId)
              if (entry) {
                return Effect.fail(
                  new AlreadyProcessingMessage({
                    envelopeId: message.envelope.requestId,
                    address: message.envelope.address
                  })
                )
              }

              const rpc = entity.protocol.requests.get(message.envelope.tag)! as any as Rpc.AnyWithProps
              if (!storageEnabled && Context.get(rpc.annotations, Persisted)) {
                return Effect.dieMessage(
                  "EntityManager.sendLocal: Cannot process a persisted message without MessageStorage"
                )
              }

              if (mailboxCapacity !== "unbounded" && server.activeRequests.size >= mailboxCapacity) {
                return Effect.fail(new MailboxFull({ address: message.envelope.address }))
              }

              entry = {
                rpc,
                message,
                sentReply: false,
                lastSentChunk: message.lastSentReply as any,
                sequence: Option.match(message.lastSentReply, {
                  onNone: () => 0,
                  onSome: (reply) => reply._tag === "Chunk" ? reply.sequence + 1 : 0
                })
              }
              server.activeRequests.set(message.envelope.requestId, entry)
              return server.write(0, {
                ...message.envelope,
                id: RequestId(message.envelope.requestId),
                payload: new Request({
                  ...message.envelope,
                  lastSentChunk: message.lastSentReply as any
                })
              })
            }
            case "IncomingEnvelope": {
              const entry = server.activeRequests.get(message.envelope.requestId)
              if (!entry) {
                return Effect.void
              } else if (
                message.envelope._tag === "AckChunk" &&
                Option.isSome(entry.lastSentChunk) &&
                message.envelope.replyId !== entry.lastSentChunk.value.id
              ) {
                return Effect.void
              }
              return server.write(
                0,
                message.envelope._tag === "AckChunk"
                  ? { _tag: "Ack", requestId: RequestId(message.envelope.requestId) }
                  : { _tag: "Interrupt", requestId: RequestId(message.envelope.requestId), interruptors: [] }
              )
            }
          }
        }
      ),
      FiberRef.currentLogAnnotations,
      HashMap.empty()
    )
  }

  const interruptShard = (shardId: ShardId) =>
    Effect.suspend(function loop(): Effect.Effect<void> {
      const toInterrupt = new Set<EntityState>()
      for (const state of activeServers.values()) {
        if (shardId[Equal.symbol](state.address.shardId)) {
          toInterrupt.add(state)
        }
      }
      if (toInterrupt.size === 0) {
        return Effect.void
      }
      return Effect.flatMap(
        Effect.forEach(toInterrupt, (state) => entities.removeIgnore(state.address), {
          concurrency: "unbounded",
          discard: true
        }),
        loop
      )
    })

  const decodeMessage = Schema.decode(makeMessageSchema(entity))

  return identity<EntityManager>({
    interruptShard,
    isProcessingFor(message, options) {
      const state = activeServers.get(message.envelope.address.entityId)
      if (!state) return false
      const request = state.activeRequests.get(message.envelope.requestId)
      if (request === undefined) {
        return false
      } else if (options?.excludeReplies && request.sentReply) {
        return false
      }
      return true
    },
    sendLocal,
    send: (message) =>
      decodeMessage(message).pipe(
        Effect.matchEffect({
          onFailure: (cause) => {
            if (message._tag === "IncomingEnvelope") {
              return Effect.die(new MalformedMessage({ cause }))
            }
            return Effect.orDie(message.respond(
              new Reply.ReplyWithContext({
                reply: new Reply.WithExit({
                  id: snowflakeGen.unsafeNext(),
                  requestId: message.envelope.requestId,
                  exit: Exit.die(new MalformedMessage({ cause }))
                }),
                rpc: entity.protocol.requests.get(message.envelope.tag)!,
                context
              })
            ))
          },
          onSuccess: (decoded) => {
            if (decoded._tag === "IncomingEnvelope") {
              return sendLocal(
                new Message.IncomingEnvelope(decoded)
              )
            }
            const request = message as Message.IncomingRequest<any>
            const rpc = entity.protocol.requests.get(decoded.envelope.tag)!
            return sendLocal(
              new Message.IncomingRequestLocal({
                envelope: decoded.envelope,
                lastSentReply: decoded.lastSentReply,
                respond: (reply) =>
                  request.respond(
                    new Reply.ReplyWithContext({
                      reply,
                      rpc,
                      context
                    })
                  )
              })
            )
          }
        }),
        Effect.provide(context as Context.Context<unknown>)
      ),
    activeEntityCount: Effect.sync(() => activeServers.size)
  })
})

const defaultRetryPolicy = Schedule.exponential(500, 1.5).pipe(
  Schedule.union(Schedule.spaced("10 seconds"))
)

const makeMessageSchema = <Type extends string, Rpcs extends Rpc.Any>(entity: Entity<Type, Rpcs>): Schema.Schema<
  {
    readonly _tag: "IncomingRequest"
    readonly envelope: Envelope.Request.Any
    readonly lastSentReply: Option.Option<Reply.Reply<Rpcs>>
  } | {
    readonly _tag: "IncomingEnvelope"
    readonly envelope: Envelope.AckChunk | Envelope.Interrupt
  },
  Message.Incoming<Rpcs>,
  Rpc.Context<Rpcs>
> => {
  const requests = Arr.empty<Schema.Schema.Any>()

  for (const rpc of entity.protocol.requests.values()) {
    requests.push(
      Schema.TaggedStruct("IncomingRequest", {
        envelope: Schema.transform(
          Schema.Struct({
            ...Envelope.PartialEncodedRequestFromSelf.fields,
            tag: Schema.Literal(rpc._tag),
            payload: (rpc as any as Rpc.AnyWithProps).payloadSchema
          }),
          Envelope.RequestFromSelf,
          {
            decode: (encoded) => Envelope.makeRequest(encoded),
            encode: identity
          }
        ),
        lastSentReply: Schema.OptionFromSelf(Reply.Reply(rpc))
      })
    )
  }

  return Schema.Union(
    ...requests,
    Schema.TaggedStruct("IncomingEnvelope", {
      envelope: Schema.Union(
        Schema.typeSchema(Envelope.AckChunk),
        Schema.typeSchema(Envelope.Interrupt)
      )
    })
  ) as any
}

const retryRespond = <A, E, R>(times: number, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  times === 0 ?
    effect :
    Effect.catchAll(effect, () => Effect.delay(retryRespond(times - 1, effect), 200))
