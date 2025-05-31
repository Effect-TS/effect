/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient_ from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcSchema from "@effect/rpc/RpcSchema"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type { PersistenceError } from "./ClusterError.js"
import {
  AlreadyProcessingMessage,
  EntityNotAssignedToRunner,
  EntityNotManagedByRunner,
  MailboxFull,
  RunnerUnavailable
} from "./ClusterError.js"
import { Persisted } from "./ClusterSchema.js"
import * as Envelope from "./Envelope.js"
import * as Message from "./Message.js"
import * as MessageStorage from "./MessageStorage.js"
import * as Reply from "./Reply.js"
import type { RunnerAddress } from "./RunnerAddress.js"
import { ShardingConfig } from "./ShardingConfig.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category context
 */
export class Runners extends Context.Tag("@effect/cluster/Runners")<Runners, {
  /**
   * Checks if a Runner is responsive.
   */
  readonly ping: (address: RunnerAddress) => Effect.Effect<void, RunnerUnavailable>

  /**
   * Send a message locally.
   *
   * This ensures that the message hits storage before being sent to the local
   * entity.
   */
  readonly sendLocal: <R extends Rpc.Any>(
    options: {
      readonly message: Message.Outgoing<R>
      readonly send: <Rpc extends Rpc.Any>(
        message: Message.IncomingLocal<Rpc>
      ) => Effect.Effect<
        void,
        EntityNotManagedByRunner | EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage
      >
      readonly simulateRemoteSerialization: boolean
    }
  ) => Effect.Effect<
    void,
    EntityNotManagedByRunner | EntityNotAssignedToRunner | MailboxFull | AlreadyProcessingMessage | PersistenceError
  >

  /**
   * Send a message to a Runner.
   */
  readonly send: <R extends Rpc.Any>(
    options: {
      readonly address: RunnerAddress
      readonly message: Message.Outgoing<R>
    }
  ) => Effect.Effect<
    void,
    | EntityNotManagedByRunner
    | EntityNotAssignedToRunner
    | RunnerUnavailable
    | MailboxFull
    | AlreadyProcessingMessage
    | PersistenceError
  >

  /**
   * Notify a Runner that a message is available, then read replies from storage.
   */
  readonly notify: <R extends Rpc.Any>(
    options: {
      readonly address: Option.Option<RunnerAddress>
      readonly message: Message.Outgoing<R>
      readonly discard: boolean
    }
  ) => Effect.Effect<void, EntityNotManagedByRunner | PersistenceError>

  /**
   * Notify the current Runner that a message is available, then read replies from
   * storage.
   *
   * This ensures that the message hits storage before being sent to the local
   * entity.
   */
  readonly notifyLocal: <R extends Rpc.Any>(
    options: {
      readonly message: Message.Outgoing<R>
      readonly notify: (
        options: Message.IncomingLocal<any>
      ) => Effect.Effect<void, EntityNotManagedByRunner | EntityNotAssignedToRunner>
      readonly discard: boolean
    }
  ) => Effect.Effect<void, EntityNotManagedByRunner | PersistenceError>
}>() {}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (options: Omit<Runners["Type"], "sendLocal" | "notifyLocal">) => Effect.Effect<
  Runners["Type"],
  never,
  MessageStorage.MessageStorage | Snowflake.Generator | ShardingConfig | Scope
> = Effect.fnUntraced(function*(options: Omit<Runners["Type"], "sendLocal" | "notifyLocal">) {
  const storage = yield* MessageStorage.MessageStorage
  const snowflakeGen = yield* Snowflake.Generator
  const config = yield* ShardingConfig

  const requestIdRewrites = new Map<Snowflake.Snowflake, Snowflake.Snowflake>()

  function notifyWith<E>(
    message: Message.Outgoing<any>,
    afterPersist: (message: Message.Outgoing<any>, isDuplicate: boolean) => Effect.Effect<void, E>
  ): Effect.Effect<void, E | PersistenceError> {
    const rpc = message.rpc as any as Rpc.AnyWithProps
    const persisted = Context.get(rpc.annotations, Persisted)
    if (!persisted) {
      return Effect.dieMessage("Runners.notify only supports persisted messages")
    }

    if (message._tag === "OutgoingEnvelope") {
      const rewriteId = requestIdRewrites.get(message.envelope.requestId)
      const requestId = rewriteId ?? message.envelope.requestId
      const entry = storageRequests.get(requestId)
      if (rewriteId) {
        message = new Message.OutgoingEnvelope({
          ...message,
          envelope: message.envelope.withRequestId(rewriteId)
        })
      }
      return storage.saveEnvelope(message).pipe(
        Effect.catchTag("MalformedMessage", Effect.die),
        Effect.zipRight(
          entry ? Effect.zipRight(entry.latch.open, afterPersist(message, false)) : afterPersist(message, false)
        )
      )
    }

    // For requests, after persisting the request, we need to check if the
    // request is a duplicate. If it is, we need to resume from the last
    // received reply.
    //
    // Otherwise, we notify the remote entity and then reply from storage.
    return Effect.flatMap(
      Effect.catchTag(storage.saveRequest(message), "MalformedMessage", Effect.die),
      MessageStorage.SaveResult.$match({
        Success: () => afterPersist(message, false),
        Duplicate: ({ lastReceivedReply, originalId }) => {
          requestIdRewrites.set(message.envelope.requestId, originalId)
          return afterPersist(
            new Message.OutgoingRequest({
              ...message,
              lastReceivedReply,
              envelope: Envelope.makeRequest({
                ...message.envelope,
                requestId: originalId
              }),
              respond(reply) {
                if (reply._tag === "WithExit") {
                  requestIdRewrites.delete(message.envelope.requestId)
                }
                return message.respond(reply.withRequestId(message.envelope.requestId))
              }
            }),
            true
          )
        }
      })
    )
  }

  type StorageRequestEntry = {
    readonly latch: Effect.Latch
    replies: Array<Reply.Reply<any>>
  }
  const storageRequests = new Map<Snowflake.Snowflake, StorageRequestEntry>()
  const waitingStorageRequests = new Map<Snowflake.Snowflake, Message.OutgoingRequest<any>>()
  const replyFromStorage = Effect.fnUntraced(
    function*(message: Message.OutgoingRequest<any>) {
      const entry: StorageRequestEntry = {
        latch: Effect.unsafeMakeLatch(false),
        replies: []
      }
      storageRequests.set(message.envelope.requestId, entry)

      while (true) {
        // wait for the storage loop to notify us
        entry.latch.unsafeClose()
        waitingStorageRequests.set(message.envelope.requestId, message)
        yield* storageLatch.open
        yield* entry.latch.await

        // send the replies back
        for (const reply of entry.replies) {
          // we have reached the end
          if (reply._tag === "WithExit") {
            return yield* message.respond(reply)
          }

          entry.latch.unsafeClose()
          yield* message.respond(reply)
          yield* entry.latch.await
        }
        entry.replies = []
      }
    },
    (effect, message) =>
      Effect.ensuring(
        effect,
        Effect.sync(() => {
          storageRequests.delete(message.envelope.requestId)
          waitingStorageRequests.delete(message.envelope.requestId)
        })
      )
  )

  const storageLatch = Effect.unsafeMakeLatch(false)
  if (storage !== MessageStorage.noop) {
    yield* Effect.gen(function*() {
      while (true) {
        yield* storageLatch.await
        storageLatch.unsafeClose()

        const replies = yield* storage.repliesFor(waitingStorageRequests.values()).pipe(
          Effect.catchAllCause((cause) =>
            Effect.as(
              Effect.annotateLogs(Effect.logDebug(cause), {
                package: "@effect/cluster",
                module: "Runners",
                fiber: "Read replies loop"
              }),
              []
            )
          )
        )

        const foundRequests = new Set<StorageRequestEntry>()

        // put the replies into the storage requests and then open the latches
        for (const reply of replies) {
          const entry = storageRequests.get(reply.requestId)
          if (!entry) continue
          entry.replies.push(reply)
          waitingStorageRequests.delete(reply.requestId)
          foundRequests.add(entry)
        }

        for (const entry of foundRequests) {
          entry.latch.unsafeOpen()
        }
      }
    }).pipe(
      Effect.interruptible,
      Effect.forkScoped
    )

    yield* Effect.suspend(() => {
      if (waitingStorageRequests.size === 0) {
        return storageLatch.await
      }
      return storageLatch.open
    }).pipe(
      Effect.delay(config.entityReplyPollInterval),
      Effect.forever,
      Effect.interruptible,
      Effect.forkScoped
    )
  }

  return Runners.of({
    ...options,
    sendLocal(options) {
      const message = options.message
      if (!options.simulateRemoteSerialization) {
        return options.send(Message.incomingLocalFromOutgoing(message))
      }
      return Message.serialize(message).pipe(
        Effect.flatMap((encoded) => Message.deserializeLocal(message, encoded)),
        Effect.flatMap(options.send),
        Effect.catchTag("MalformedMessage", (error) => {
          if (message._tag === "OutgoingEnvelope") {
            return Effect.die(error)
          }
          return message.respond(
            new Reply.WithExit({
              id: snowflakeGen.unsafeNext(),
              requestId: message.envelope.requestId,
              exit: Exit.die(error)
            })
          )
        })
      )
    },
    notify(options_) {
      const { discard, message } = options_
      return notifyWith(message, (message, duplicate) => {
        if (discard || message._tag === "OutgoingEnvelope") {
          return options.notify(options_)
        } else if (!duplicate && options_.address._tag === "Some") {
          return Effect.catchAll(
            options.send({
              address: options_.address.value,
              message
            }),
            (error) => {
              if (error._tag === "EntityNotManagedByRunner") {
                return Effect.fail(error)
              }
              return replyFromStorage(message)
            }
          )
        }
        return options.notify(options_).pipe(
          Effect.andThen(replyFromStorage(message))
        )
      })
    },
    notifyLocal(options) {
      return notifyWith(options.message, (message, duplicate) => {
        if (options.discard || message._tag === "OutgoingEnvelope") {
          return Effect.catchTag(
            options.notify(Message.incomingLocalFromOutgoing(message)),
            "EntityNotAssignedToRunner",
            () => Effect.void
          )
        } else if (!duplicate) {
          return storage.registerReplyHandler(message).pipe(
            Effect.andThen(options.notify(Message.incomingLocalFromOutgoing(message))),
            Effect.catchTag("EntityNotAssignedToRunner", () => Effect.void)
          )
        }
        return options.notify(Message.incomingLocalFromOutgoing(message)).pipe(
          Effect.catchTag("EntityNotAssignedToRunner", () => Effect.void),
          Effect.andThen(replyFromStorage(message))
        )
      })
    }
  })
})

/**
 * @since 1.0.0
 * @category No-op
 */
export const makeNoop: Effect.Effect<
  Runners["Type"],
  never,
  MessageStorage.MessageStorage | Snowflake.Generator | ShardingConfig | Scope
> = make({
  send: ({ message }) => Effect.fail(new EntityNotManagedByRunner({ address: message.envelope.address })),
  notify: () => Effect.void,
  ping: () => Effect.void
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerNoop: Layer.Layer<
  Runners,
  never,
  ShardingConfig | MessageStorage.MessageStorage
> = Layer.scoped(Runners, makeNoop).pipe(Layer.provide([Snowflake.layerGenerator]))

const rpcErrors: Schema.Union<[
  typeof EntityNotManagedByRunner,
  typeof EntityNotAssignedToRunner,
  typeof MailboxFull,
  typeof AlreadyProcessingMessage
]> = Schema.Union(
  EntityNotManagedByRunner,
  EntityNotAssignedToRunner,
  MailboxFull,
  AlreadyProcessingMessage
)

/**
 * @since 1.0.0
 * @category Rpcs
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make("Ping"),
  Rpc.make("Notify", {
    payload: {
      envelope: Envelope.PartialEncoded
    },
    success: Schema.Void,
    error: Schema.Union(EntityNotManagedByRunner, EntityNotAssignedToRunner, AlreadyProcessingMessage)
  }),
  Rpc.make("Effect", {
    payload: {
      request: Envelope.PartialEncodedRequest,
      persisted: Schema.Boolean
    },
    success: Schema.Object as Schema.Schema<Reply.ReplyEncoded<any>>,
    error: rpcErrors
  }),
  Rpc.make("Stream", {
    payload: {
      request: Envelope.PartialEncodedRequest,
      persisted: Schema.Boolean
    },
    error: rpcErrors,
    success: Schema.Object as Schema.Schema<Reply.ReplyEncoded<any>>,
    stream: true
  }),
  Rpc.make("Envelope", {
    payload: {
      envelope: Schema.Union(Envelope.AckChunk, Envelope.Interrupt),
      persisted: Schema.Boolean
    },
    error: rpcErrors
  })
) {}

/**
 * @since 1.0.0
 * @category Rpcs
 */
export interface RpcClient extends RpcClient_.FromGroup<typeof Rpcs> {}

/**
 * @since 1.0.0
 * @category Rpcs
 */
export const makeRpcClient: Effect.Effect<
  RpcClient,
  never,
  RpcClient_.Protocol | Scope
> = RpcClient_.make(Rpcs, { spanPrefix: "Runners", disableTracing: true })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRpc: Effect.Effect<
  Runners["Type"],
  never,
  Scope | RpcClientProtocol | MessageStorage.MessageStorage | Snowflake.Generator | ShardingConfig
> = Effect.gen(function*() {
  const makeClientProtocol = yield* RpcClientProtocol
  const snowflakeGen = yield* Snowflake.Generator

  const clients = yield* RcMap.make({
    lookup: (address: RunnerAddress) =>
      Effect.flatMap(
        makeClientProtocol(address),
        (protocol) => Effect.provideService(makeRpcClient, RpcClient_.Protocol, protocol)
      ),
    idleTimeToLive: "1 minute"
  })

  return yield* make({
    ping(address) {
      return RcMap.get(clients, address).pipe(
        Effect.flatMap((client) => client.Ping()),
        Effect.catchAllCause(() => Effect.fail(new RunnerUnavailable({ address }))),
        Effect.scoped
      )
    },
    send({ address, message }) {
      const rpc = message.rpc as any as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (message._tag === "OutgoingEnvelope") {
        return RcMap.get(clients, address).pipe(
          Effect.flatMap((client) =>
            client.Envelope({
              envelope: message.envelope,
              persisted: isPersisted
            })
          ),
          Effect.scoped,
          Effect.catchAllDefect(() => Effect.fail(new RunnerUnavailable({ address })))
        )
      }
      const isStream = RpcSchema.isStreamSchema(rpc.successSchema)
      if (!isStream) {
        return Effect.matchEffect(Message.serializeRequest(message), {
          onSuccess: (request) =>
            RcMap.get(clients, address).pipe(
              Effect.flatMap((client) =>
                client.Effect({
                  request,
                  persisted: isPersisted
                })
              ),
              Effect.flatMap((reply) =>
                Schema.decode(Reply.Reply(message.rpc))(reply).pipe(
                  Effect.locally(FiberRef.currentContext, message.context),
                  Effect.orDie
                )
              ),
              Effect.flatMap(message.respond),
              Effect.scoped,
              Effect.catchAllDefect(() => Effect.fail(new RunnerUnavailable({ address })))
            ),
          onFailure: (error) =>
            message.respond(
              new Reply.WithExit({
                id: snowflakeGen.unsafeNext(),
                requestId: message.envelope.requestId,
                exit: Exit.die(error)
              })
            )
        })
      }
      return Effect.matchEffect(Message.serializeRequest(message), {
        onSuccess: (request) =>
          RcMap.get(clients, address).pipe(
            Effect.flatMap((client) =>
              client.Stream({
                request,
                persisted: isPersisted
              }, { asMailbox: true })
            ),
            Effect.flatMap((mailbox) => {
              const decode = Schema.decode(Reply.Reply(message.rpc))
              return mailbox.take.pipe(
                Effect.flatMap((reply) => Effect.orDie(decode(reply))),
                Effect.flatMap(message.respond),
                Effect.forever,
                Effect.locally(FiberRef.currentContext, message.context),
                Effect.catchIf(Cause.isNoSuchElementException, () => Effect.void),
                Effect.catchAllDefect(() => Effect.fail(new RunnerUnavailable({ address })))
              )
            }),
            Effect.scoped
          ),
        onFailure: (error) =>
          message.respond(
            new Reply.WithExit({
              id: snowflakeGen.unsafeNext(),
              requestId: message.envelope.requestId,
              exit: Exit.die(error)
            })
          )
      })
    },
    notify({ address, message }) {
      if (Option.isNone(address)) {
        return Effect.void
      }
      const envelope = message.envelope
      return RcMap.get(clients, address.value).pipe(
        Effect.flatMap((client) => client.Notify({ envelope })),
        Effect.scoped,
        Effect.catchAll((error) => {
          if (error._tag === "EntityNotManagedByRunner") {
            return Effect.fail(error)
          }
          return Effect.void
        })
      )
    }
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRpc: Layer.Layer<
  Runners,
  never,
  MessageStorage.MessageStorage | RpcClientProtocol | ShardingConfig
> = Layer.scoped(Runners, makeRpc).pipe(
  Layer.provide(Snowflake.layerGenerator)
)

/**
 * @since 1.0.0
 * @category Client
 */
export class RpcClientProtocol extends Context.Tag("@effect/cluster/Runners/RpcClientProtocol")<
  RpcClientProtocol,
  (address: RunnerAddress) => Effect.Effect<RpcClient_.Protocol["Type"], never, Scope>
>() {}
