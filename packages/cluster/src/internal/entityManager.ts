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
import type * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Runtime from "effect/Runtime"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { AlreadyProcessingMessage, EntityNotAssignedToRunner, MailboxFull, MalformedMessage } from "../ClusterError.js"
import * as ClusterMetrics from "../ClusterMetrics.js"
import { Persisted, Uninterruptible } from "../ClusterSchema.js"
import type { Entity, HandlersFrom } from "../Entity.js"
import { CurrentAddress, CurrentRunnerAddress, KeepAliveLatch, KeepAliveRpc, Request } from "../Entity.js"
import type { EntityAddress } from "../EntityAddress.js"
import type { EntityId } from "../EntityId.js"
import type * as Envelope from "../Envelope.js"
import * as Message from "../Message.js"
import * as MessageStorage from "../MessageStorage.js"
import * as Reply from "../Reply.js"
import type { RunnerAddress } from "../RunnerAddress.js"
import type { ShardId } from "../ShardId.js"
import type { Sharding } from "../Sharding.js"
import { ShardingConfig } from "../ShardingConfig.js"
import * as Snowflake from "../Snowflake.js"
import { EntityReaper } from "./entityReaper.js"
import { joinAllDiscard } from "./fiber.js"
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
  readonly clearProcessed: () => void

  readonly interruptShard: (shardId: ShardId) => Effect.Effect<void>

  readonly activeEntityCount: Effect.Effect<number>
}

// Represents the entities managed by this entity manager
/** @internal */
export type EntityState = {
  readonly address: EntityAddress
  readonly scope: Scope.Scope
  readonly activeRequests: Map<bigint, {
    readonly rpc: Rpc.AnyWithProps
    readonly message: Message.IncomingRequestLocal<any>
    sentReply: boolean
    lastSentChunk: Option.Option<Reply.Chunk<Rpc.Any>>
    sequence: number
  }>
  lastActiveCheck: number
  write: RpcServer.RpcServer<any>["write"]
  readonly keepAliveLatch: Effect.Latch
  keepAliveEnabled: boolean
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
  const entityRpcs = new Map(entity.protocol.requests)

  // add internal rpcs
  entityRpcs.set(KeepAliveRpc._tag, KeepAliveRpc as any)

  const activeServers = new Map<EntityId, EntityState>()
  const serverCloseLatches = new Map<EntityAddress, Effect.Latch>()
  const processedRequestIds = new Set<Snowflake.Snowflake>()

  const entities: ResourceMap<
    EntityAddress,
    EntityState,
    EntityNotAssignedToRunner
  > = yield* ResourceMap.make(Effect.fnUntraced(function*(address: EntityAddress) {
    if (!options.sharding.hasShardId(address.shardId)) {
      return yield* new EntityNotAssignedToRunner({ address })
    }

    const scope = yield* Effect.scope
    const endLatch = Effect.unsafeMakeLatch()
    const keepAliveLatch = Effect.unsafeMakeLatch(false)

    // on shutdown, reset the storage for the entity
    yield* Scope.addFinalizerExit(
      scope,
      () => {
        serverCloseLatches.get(address)?.unsafeOpen()
        serverCloseLatches.delete(address)
        return Effect.void
      }
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
            Context.add(KeepAliveLatch, keepAliveLatch),
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
                  Exit.isFailure(response.exit) &&
                  Exit.isInterrupted(response.exit) &&
                  (isShuttingDown || Uninterruptible.forServer(request.rpc.annotations))
                ) {
                  if (!isShuttingDown) {
                    return server.write(0, {
                      ...request.message.envelope,
                      id: RequestId(request.message.envelope.requestId),
                      tag: request.message.envelope.tag as any,
                      payload: new Request({
                        ...request.message.envelope,
                        lastSentChunk: request.lastSentChunk
                      } as any) as any
                    }).pipe(
                      Effect.forkIn(scope)
                    )
                  }
                  activeRequests.delete(response.requestId)
                  return options.storage.unregisterReplyHandler(request.message.envelope.requestId)
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
                    processedRequestIds.add(request.message.envelope.requestId)
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

        if (defectRequestIds.length > 0) {
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
        }

        return server.write
      })
    )

    function onDefect(cause: Cause.Cause<never>): Effect.Effect<void> {
      if (!activeServers.has(address.entityId)) {
        return endLatch.open
      }
      const effect = writeRef.unsafeRebuild()
      defectRequestIds = Array.from(activeRequests.keys())
      return Effect.logError("Defect in entity, restarting", cause).pipe(
        Effect.andThen(Effect.ignore(retryDriver.next(void 0))),
        Effect.flatMap(() => activeServers.has(address.entityId) ? effect : endLatch.open),
        Effect.annotateLogs({
          module: "EntityManager",
          address,
          runner: options.runnerAddress
        }),
        Effect.catchAllCause(onDefect)
      )
    }

    const state: EntityState = {
      scope,
      address,
      write(clientId, message) {
        if (writeRef.state.current._tag !== "Acquired") {
          return Effect.flatMap(writeRef.await, (write) => write(clientId, message))
        }
        return writeRef.state.current.value(clientId, message)
      },
      activeRequests,
      lastActiveCheck: clock.unsafeCurrentTimeMillis(),
      keepAliveLatch,
      keepAliveEnabled: false
    }

    // During shutdown, signal that no more messages will be processed
    // and wait for the fiber to complete.
    //
    // If the termination timeout is reached, let the server clean itself up
    yield* Scope.addFinalizer(
      scope,
      Effect.withFiberRuntime((fiber) => {
        activeServers.delete(address.entityId)
        serverCloseLatches.set(address, Effect.unsafeMakeLatch(false))
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
              if (entry || processedRequestIds.has(message.envelope.requestId)) {
                return Effect.fail(
                  new AlreadyProcessingMessage({
                    envelopeId: message.envelope.requestId,
                    address: message.envelope.address
                  })
                )
              }

              const rpc = entityRpcs.get(message.envelope.tag)! as any as Rpc.AnyWithProps
              if (!storageEnabled && Context.get(rpc.annotations, Persisted)) {
                return Effect.dieMessage(
                  "EntityManager.sendLocal: Cannot process a persisted message without MessageStorage"
                )
              }

              // Cluster internal RPCs

              // keep-alive RPC
              if (rpc._tag === KeepAliveRpc._tag) {
                const msg = message as unknown as Message.IncomingRequestLocal<typeof KeepAliveRpc>
                const reply = Effect.suspend(() =>
                  Effect.orDie(retryRespond(
                    4,
                    msg.respond(
                      new Reply.WithExit<typeof KeepAliveRpc>({
                        requestId: message.envelope.requestId,
                        id: snowflakeGen.unsafeNext(),
                        exit: Exit.void
                      })
                    )
                  ))
                )

                if (server.keepAliveEnabled) return reply
                server.keepAliveEnabled = true
                return server.keepAliveLatch.whenOpen(Effect.suspend(() => {
                  server.keepAliveEnabled = false
                  return reply
                })).pipe(
                  Effect.forkIn(server.scope),
                  Effect.asVoid
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

  const decodeMessage = makeMessageDecode(entity, entityRpcs)

  const runFork = Runtime.runFork(
    yield* Effect.runtime<never>().pipe(
      Effect.interruptible
    )
  )

  return identity<EntityManager>({
    interruptShard: (shardId: ShardId) =>
      Effect.suspend(function loop(): Effect.Effect<void> {
        const fibers = Arr.empty<Fiber.RuntimeFiber<void>>()
        activeServers.forEach((state) => {
          if (shardId[Equal.symbol](state.address.shardId)) {
            fibers.push(runFork(entities.removeIgnore(state.address)))
          }
        })
        serverCloseLatches.forEach((latch, address) => {
          if (shardId[Equal.symbol](address.shardId)) {
            fibers.push(runFork(latch.await))
          }
        })
        if (fibers.length === 0) return Effect.void
        return Effect.flatMap(joinAllDiscard(fibers), loop)
      }),
    isProcessingFor(message, options) {
      if (options?.excludeReplies !== true && processedRequestIds.has(message.envelope.requestId)) {
        return true
      }
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
    clearProcessed() {
      processedRequestIds.clear()
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
                rpc: entityRpcs.get(message.envelope.tag)!,
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
            const rpc = entityRpcs.get(decoded.envelope.tag)!
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

const makeMessageDecode = <Type extends string, Rpcs extends Rpc.Any>(
  entity: Entity<Type, Rpcs>,
  entityRpcs: Map<string, Rpcs>
) => {
  const decodeRequest = (
    message: Message.IncomingRequest<Rpcs>,
    rpc: Rpc.AnyWithProps
  ) => {
    const payload = Schema.decode(rpc.payloadSchema)(message.envelope.payload)
    const lastSentReply = Option.isSome(message.lastSentReply)
      ? Effect.asSome(Schema.decode(Reply.Reply(rpc as any))(message.lastSentReply.value))
      : Effect.succeedNone
    return Effect.flatMap(payload, (payload) =>
      Effect.map(lastSentReply, (lastSentReply) => ({
        _tag: "IncomingRequest" as const,
        envelope: {
          ...message.envelope,
          payload
        } as Envelope.Request.Any,
        lastSentReply
      })))
  }

  return (message: Message.Incoming<Rpcs>): Effect.Effect<
    {
      readonly _tag: "IncomingRequest"
      readonly envelope: Envelope.Request.Any
      readonly lastSentReply: Option.Option<Reply.Reply<Rpcs>>
    } | {
      readonly _tag: "IncomingEnvelope"
      readonly envelope: Envelope.AckChunk | Envelope.Interrupt
    },
    ParseResult.ParseError,
    Rpc.Context<Rpcs>
  > => {
    if (message._tag === "IncomingEnvelope") {
      return Effect.succeed(message)
    }
    const rpc = entityRpcs.get(message.envelope.tag) as any as Rpc.AnyWithProps
    if (!rpc) {
      return Effect.fail(
        new ParseResult.ParseError({
          issue: new ParseResult.Unexpected(
            message,
            `Unknown tag ${message.envelope.tag} for entity type ${entity.type}`
          )
        })
      )
    }
    return decodeRequest(message, rpc) as Effect.Effect<
      {
        readonly _tag: "IncomingRequest"
        readonly envelope: Envelope.Request.Any
        readonly lastSentReply: Option.Option<Reply.Reply<Rpcs>>
      },
      ParseResult.ParseError,
      Rpc.Context<Rpcs>
    >
  }
}

const retryRespond = <A, E, R>(times: number, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  times === 0 ?
    effect :
    Effect.catchAll(effect, () => Effect.delay(retryRespond(times - 1, effect), 200))
