/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { globalValue } from "effect/GlobalValue"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import type { Predicate } from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { PersistenceError } from "./ClusterError.js"
import { MalformedMessage } from "./ClusterError.js"
import * as DeliverAt from "./DeliverAt.js"
import type { EntityAddress } from "./EntityAddress.js"
import * as Envelope from "./Envelope.js"
import * as Message from "./Message.js"
import * as Reply from "./Reply.js"
import type { ShardId } from "./ShardId.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category context
 */
export class MessageStorage extends Context.Tag("@effect/cluster/MessageStorage")<MessageStorage, {
  /**
   * Save the provided message and its associated metadata.
   */
  readonly saveRequest: <R extends Rpc.Any>(
    envelope: Message.OutgoingRequest<R>
  ) => Effect.Effect<SaveResult<R>, PersistenceError | MalformedMessage>

  /**
   * Save the provided message and its associated metadata.
   */
  readonly saveEnvelope: (
    envelope: Message.OutgoingEnvelope
  ) => Effect.Effect<void, PersistenceError | MalformedMessage>

  /**
   * Save the provided `Reply` and its associated metadata.
   */
  readonly saveReply: <R extends Rpc.Any>(
    reply: Reply.ReplyWithContext<R>
  ) => Effect.Effect<void, PersistenceError | MalformedMessage>

  /**
   * Retrieves the replies for the specified requests.
   *
   * - Un-acknowledged chunk replies
   * - WithExit replies
   */
  readonly repliesFor: <R extends Rpc.Any>(
    requests: Iterable<Message.OutgoingRequest<R>>
  ) => Effect.Effect<Array<Reply.Reply<R>>, PersistenceError | MalformedMessage>

  /**
   * For locally sent messages, register a handler to process the replies.
   */
  readonly registerReplyHandler: <R extends Rpc.Any>(
    message: Message.OutgoingRequest<R> | Message.IncomingRequest<R>
  ) => Effect.Effect<void>

  /**
   * Retrieves the unprocessed messages for the specified shards.
   *
   * A message is unprocessed when:
   *
   * - Requests that have no WithExit replies
   *   - Or they have no unacknowledged chunk replies
   * - The latest AckChunk envelope
   * - All Interrupt's for unprocessed requests
   */
  readonly unprocessedMessages: (
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<Array<Message.Incoming<any>>, PersistenceError>

  /**
   * Retrieves the unprocessed messages by id.
   */
  readonly unprocessedMessagesById: <R extends Rpc.Any>(
    messageIds: Iterable<Snowflake.Snowflake>
  ) => Effect.Effect<Array<Message.Incoming<R>>, PersistenceError>

  /**
   * Reset the mailbox state for the provided shards.
   */
  readonly resetShards: (
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Reset the mailbox state for the provided address.
   */
  readonly resetAddress: (
    address: EntityAddress
  ) => Effect.Effect<void, PersistenceError>
}>() {}

/**
 * @since 1.0.0
 * @category SaveResult
 */
export type SaveResult<R extends Rpc.Any> = SaveResult.Success | SaveResult.Duplicate<R>

/**
 * @since 1.0.0
 * @category SaveResult
 */
export const SaveResult = Data.taggedEnum<SaveResult.Constructor>()

/**
 * @since 1.0.0
 * @category SaveResult
 */
export const SaveResultEncoded = Data.taggedEnum<SaveResult.Encoded>()

/**
 * @since 1.0.0
 * @category SaveResult
 */
export declare namespace SaveResult {
  /**
   * @since 1.0.0
   * @category SaveResult
   */
  export type Encoded = SaveResult.Success | SaveResult.DuplicateEncoded

  /**
   * @since 1.0.0
   * @category SaveResult
   */
  export interface Success {
    readonly _tag: "Success"
  }

  /**
   * @since 1.0.0
   * @category SaveResult
   */
  export interface Duplicate<R extends Rpc.Any> {
    readonly _tag: "Duplicate"
    readonly originalId: Snowflake.Snowflake
    readonly lastReceivedReply: Option.Option<Reply.Reply<R>>
  }

  /**
   * @since 1.0.0
   * @category SaveResult
   */
  export interface DuplicateEncoded {
    readonly _tag: "Duplicate"
    readonly originalId: Snowflake.Snowflake
    readonly lastReceivedReply: Option.Option<Reply.ReplyEncoded<any>>
  }

  /**
   * @since 1.0.0
   * @category SaveResult
   */
  export interface Constructor extends Data.TaggedEnum.WithGenerics<1> {
    readonly taggedEnum: SaveResult<this["A"] extends Rpc.Any ? this["A"] : never>
  }
}

/**
 * @since 1.0.0
 * @category Encoded
 */
export type Encoded = {
  /**
   * Save the provided message and its associated metadata.
   */
  readonly saveEnvelope: (
    options: {
      readonly envelope: Envelope.Envelope.Encoded
      readonly primaryKey: string | null
      readonly deliverAt: number | null
    }
  ) => Effect.Effect<SaveResult.Encoded, PersistenceError>

  /**
   * Save the provided `Reply` and its associated metadata.
   */
  readonly saveReply: (
    reply: Reply.ReplyEncoded<any>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Retrieves the replies for the specified requests.
   *
   * - Un-acknowledged chunk replies
   * - WithExit replies
   */
  readonly repliesFor: (requestIds: Array<string>) => Effect.Effect<
    Array<Reply.ReplyEncoded<any>>,
    PersistenceError
  >

  /**
   * Retrieves the unprocessed messages for the given shards.
   *
   * A message is unprocessed when:
   *
   * - Requests that have no WithExit replies
   *   - Or they have no unacknowledged chunk replies
   * - The latest AckChunk envelope
   * - All Interrupt's for unprocessed requests
   */
  readonly unprocessedMessages: (
    shardIds: ReadonlyArray<number>,
    now: number
  ) => Effect.Effect<
    Array<{
      readonly envelope: Envelope.Envelope.Encoded
      readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
    }>,
    PersistenceError
  >

  /**
   * Retrieves the unprocessed messages by id.
   */
  readonly unprocessedMessagesById: (
    messageIds: ReadonlyArray<Snowflake.Snowflake>,
    now: number
  ) => Effect.Effect<
    Array<{
      readonly envelope: Envelope.Envelope.Encoded
      readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
    }>,
    PersistenceError
  >

  /**
   * Reset the mailbox state for the provided address.
   */
  readonly resetAddress: (
    address: EntityAddress
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Reset the mailbox state for the provided shards.
   */
  readonly resetShards: (
    shardIds: ReadonlyArray<number>
  ) => Effect.Effect<void, PersistenceError>
}

/**
 * @since 1.0.0
 * @category Encoded
 */
export type EncodedUnprocessedOptions<A> = {
  readonly existingShards: Array<number>
  readonly newShards: Array<number>
  readonly cursor: Option.Option<A>
}

/**
 * @since 1.0.0
 * @category Encoded
 */
export type EncodedRepliesOptions<A> = {
  readonly existingRequests: Array<string>
  readonly newRequests: Array<string>
  readonly cursor: Option.Option<A>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  storage: Omit<MessageStorage["Type"], "registerReplyHandler">
): Effect.Effect<MessageStorage["Type"]> =>
  Effect.sync(() => {
    const replyHandlers = new Map<
      Snowflake.Snowflake,
      (reply: Reply.ReplyWithContext<any>) => Effect.Effect<void, PersistenceError | MalformedMessage>
    >()
    return MessageStorage.of({
      ...storage,
      registerReplyHandler: (message) =>
        Effect.sync(() => {
          replyHandlers.set(
            message.envelope.requestId,
            message._tag === "IncomingRequest" ? message.respond : (reply) => message.respond(reply.reply)
          )
        }),
      saveReply(reply) {
        return Effect.flatMap(storage.saveReply(reply), () => {
          const handler = replyHandlers.get(reply.reply.requestId)
          if (!handler) {
            return Effect.void
          } else if (reply.reply._tag === "WithExit") {
            replyHandlers.delete(reply.reply.requestId)
          }
          return handler(reply)
        })
      }
    })
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeEncoded: (encoded: Encoded) => Effect.Effect<
  MessageStorage["Type"],
  never,
  Snowflake.Generator
> = Effect.fnUntraced(function*(encoded: Encoded) {
  const snowflakeGen = yield* Snowflake.Generator
  const clock = yield* Effect.clock

  const storage: MessageStorage["Type"] = yield* make({
    saveRequest: (message) =>
      Message.serializeEnvelope(message).pipe(
        Effect.flatMap((envelope) =>
          encoded.saveEnvelope({
            envelope,
            primaryKey: Envelope.primaryKey(message.envelope),
            deliverAt: DeliverAt.toMillis(message.envelope.payload)
          })
        ),
        Effect.flatMap((result) => {
          if (result._tag === "Success" || result.lastReceivedReply._tag === "None") {
            return Effect.succeed(result as SaveResult<any>)
          }
          const duplicate = result
          const schema = Reply.Reply(message.rpc)
          return Schema.decode(schema)(result.lastReceivedReply.value).pipe(
            Effect.locally(FiberRef.currentContext, message.context),
            MalformedMessage.refail,
            Effect.map((reply) =>
              SaveResult.Duplicate({
                originalId: duplicate.originalId,
                lastReceivedReply: Option.some(reply)
              })
            )
          )
        })
      ),
    saveEnvelope: (message) =>
      Message.serializeEnvelope(message).pipe(
        Effect.flatMap((envelope) =>
          encoded.saveEnvelope({
            envelope,
            primaryKey: null,
            deliverAt: null
          })
        ),
        Effect.asVoid
      ),
    saveReply: (reply) => Effect.flatMap(Reply.serialize(reply), encoded.saveReply),
    repliesFor: Effect.fnUntraced(function*(messages) {
      const requestIds = Arr.empty<string>()
      const map = new Map<string, Message.OutgoingRequest<any>>()
      for (const message of messages) {
        const id = String(message.envelope.requestId)
        requestIds.push(id)
        map.set(id, message)
      }
      if (requestIds.length === 0) return []
      const encodedReplies = yield* encoded.repliesFor(requestIds)
      return yield* decodeReplies(map, encodedReplies)
    }),
    unprocessedMessages: (shardIds) => {
      const shards = Array.from(shardIds)
      if (shards.length === 0) return Effect.succeed([])
      return Effect.flatMap(
        Effect.suspend(() => encoded.unprocessedMessages(shards, clock.unsafeCurrentTimeMillis())),
        decodeMessages
      )
    },
    unprocessedMessagesById(messageIds) {
      const ids = Array.from(messageIds)
      if (ids.length === 0) return Effect.succeed([])
      return Effect.flatMap(
        Effect.suspend(() => encoded.unprocessedMessagesById(ids, clock.unsafeCurrentTimeMillis())),
        decodeMessages
      )
    },
    resetAddress: (address) => encoded.resetAddress(address),
    resetShards: (shardIds) => encoded.resetShards(Array.from(shardIds))
  })

  const decodeMessages = (
    envelopes: Array<{
      readonly envelope: Envelope.Envelope.Encoded
      readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
    }>
  ) => {
    const messages: Array<Message.Incoming<any>> = []
    let index = 0

    // if we have a malformed message, we should not return it and update
    // the storage with a defect
    const decodeMessage = Effect.catchAll(
      Effect.suspend(() => {
        const envelope = envelopes[index]
        if (!envelope) return Effect.succeed(undefined)
        return decodeEnvelopeWithReply(envelope)
      }),
      (error) => {
        const envelope = envelopes[index]
        return storage.saveReply(Reply.ReplyWithContext.fromDefect({
          id: snowflakeGen.unsafeNext(),
          requestId: Snowflake.Snowflake(envelope.envelope.requestId),
          defect: error.toString()
        })).pipe(
          Effect.forkDaemon,
          Effect.asVoid
        )
      }
    )
    return Effect.as(
      Effect.whileLoop({
        while: () => index < envelopes.length,
        body: () => decodeMessage,
        step: (message) => {
          const envelope = envelopes[index++]
          if (!message) return
          messages.push(
            message.envelope._tag === "Request"
              ? new Message.IncomingRequest({
                envelope: message.envelope,
                lastSentReply: envelope.lastSentReply,
                respond: storage.saveReply
              })
              : new Message.IncomingEnvelope({
                envelope: message.envelope
              })
          )
        }
      }),
      messages
    )
  }

  const decodeReplies = (
    messages: Map<string, Message.OutgoingRequest<any>>,
    encodedReplies: Array<Reply.ReplyEncoded<any>>
  ) => {
    const replies: Array<Reply.Reply<any>> = []
    const ignoredRequests = new Set<string>()
    let index = 0

    const decodeReply: Effect.Effect<void | Reply.Reply<any>> = Effect.catchAll(
      Effect.suspend(() => {
        const reply = encodedReplies[index]
        if (ignoredRequests.has(reply.requestId)) return Effect.void
        const message = messages.get(reply.requestId)
        if (!message) return Effect.void
        const schema = Reply.Reply(message.rpc)
        return Schema.decode(schema)(reply).pipe(
          Effect.locally(FiberRef.currentContext, message.context)
        ) as Effect.Effect<Reply.Reply<any>, ParseError>
      }),
      (error) => {
        const reply = encodedReplies[index]
        ignoredRequests.add(reply.requestId)
        return Effect.succeed(
          new Reply.WithExit({
            id: snowflakeGen.unsafeNext(),
            requestId: Snowflake.Snowflake(reply.requestId),
            exit: Exit.die(error)
          })
        )
      }
    )

    return Effect.as(
      Effect.whileLoop({
        while: () => index < encodedReplies.length,
        body: () => decodeReply,
        step: (reply) => {
          index++
          if (reply) replies.push(reply)
        }
      }),
      replies
    )
  }

  return storage
})

/**
 * @since 1.0.0
 * @category Constructors
 */
export const noop: MessageStorage["Type"] = globalValue(
  "@effect/cluster/MessageStorage/noop",
  () =>
    Effect.runSync(make({
      saveRequest: () => Effect.succeed(SaveResult.Success()),
      saveEnvelope: () => Effect.void,
      saveReply: () => Effect.void,
      repliesFor: () => Effect.succeed([]),
      unprocessedMessages: () => Effect.succeed([]),
      unprocessedMessagesById: () => Effect.succeed([]),
      resetAddress: () => Effect.void,
      resetShards: () => Effect.void
    }))
)

/**
 * @since 1.0.0
 * @category Memory
 */
export type MemoryEntry = {
  readonly envelope: Envelope.Request.Encoded
  lastReceivedChunk: Option.Option<Reply.ChunkEncoded<any>>
  replies: Array<Reply.ReplyEncoded<any>>
}

/**
 * @since 1.0.0
 * @category Memory
 */
export class MemoryDriver extends Effect.Service<MemoryDriver>()("@effect/cluster/MessageStorage/MemoryDriver", {
  dependencies: [Snowflake.layerGenerator],
  effect: Effect.gen(function*() {
    const requests = new Map<string, MemoryEntry>()
    const requestsByPrimaryKey = new Map<string, MemoryEntry>()
    const unprocessed = new Set<Envelope.Request.Encoded>()
    const replyIds = new Set<string>()

    const journal: Array<Envelope.Envelope.Encoded> = []

    const cursors = new WeakMap<{}, number>()

    const unprocessedWith = (predicate: Predicate<Envelope.Envelope.Encoded>) => {
      const messages: Array<{
        readonly envelope: Envelope.Envelope.Encoded
        readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
      }> = []
      for (const envelope of unprocessed) {
        if (!predicate(envelope)) {
          continue
        }
        if (envelope._tag === "Request") {
          const entry = requests.get(envelope.requestId)
          messages.push({
            envelope,
            lastSentReply: Option.fromNullable(entry?.replies[entry.replies.length - 1])
          })
        } else {
          messages.push({
            envelope,
            lastSentReply: Option.none()
          })
        }
      }
      return messages
    }

    const replyLatch = yield* Effect.makeLatch()

    const encoded: Encoded = {
      saveEnvelope: ({ envelope, primaryKey }) =>
        Effect.sync(() => {
          const existing = primaryKey
            ? requestsByPrimaryKey.get(primaryKey)
            : envelope._tag === "Request" && requests.get(envelope.requestId)
          if (existing) {
            return SaveResultEncoded.Duplicate({
              originalId: Snowflake.Snowflake(existing.envelope.requestId),
              lastReceivedReply: existing.lastReceivedChunk
            })
          }
          if (envelope._tag === "Request") {
            const entry: MemoryEntry = { envelope, replies: [], lastReceivedChunk: Option.none() }
            requests.set(envelope.requestId, entry)
            if (primaryKey) {
              requestsByPrimaryKey.set(primaryKey, entry)
            }
            unprocessed.add(envelope)
          } else if (envelope._tag === "AckChunk") {
            const entry = requests.get(envelope.requestId)
            if (entry) {
              entry.lastReceivedChunk = Arr.findFirst(
                entry.replies,
                (r): r is Reply.ChunkEncoded<any> => r._tag === "Chunk" && r.id === envelope.replyId
              ).pipe(Option.orElse(() => entry.lastReceivedChunk))
            }
          }
          journal.push(envelope)
          return SaveResultEncoded.Success()
        }),
      saveReply: (reply) =>
        Effect.sync(() => {
          const entry = requests.get(reply.requestId)
          if (!entry || replyIds.has(reply.id)) return
          if (reply._tag === "WithExit") {
            unprocessed.delete(entry.envelope)
          }
          entry.replies.push(reply)
          replyIds.add(reply.id)
          replyLatch.unsafeOpen()
        }),
      repliesFor: (requestIds) =>
        Effect.sync(() => {
          const replies = Arr.empty<Reply.ReplyEncoded<any>>()
          for (const requestId of requestIds) {
            const request = requests.get(requestId)
            if (!request) continue
            else if (Option.isNone(request.lastReceivedChunk)) {
              // eslint-disable-next-line no-restricted-syntax
              replies.push(...request.replies)
              continue
            }
            const sequence = request.lastReceivedChunk.value.sequence
            for (const reply of request.replies) {
              if (reply._tag === "Chunk" && reply.sequence <= sequence) {
                continue
              }
              replies.push(reply)
            }
          }
          return replies
        }),
      unprocessedMessages: (shardIds) =>
        Effect.sync(() => {
          if (unprocessed.size === 0) return []
          const messages = Arr.empty<{
            envelope: Envelope.Envelope.Encoded
            lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
          }>()
          let index = journal.indexOf(Iterable.unsafeHead(unprocessed))
          for (; index < journal.length; index++) {
            const envelope = journal[index]
            if (!shardIds.includes(envelope.address.shardId)) {
              continue
            }
            if (envelope._tag === "Request") {
              const entry = requests.get(envelope.requestId)!
              messages.push({
                envelope,
                lastSentReply: Arr.last(entry.replies)
              })
            } else {
              messages.push({
                envelope,
                lastSentReply: Option.none()
              })
            }
          }
          return messages
        }),
      unprocessedMessagesById: (ids) =>
        Effect.sync(() => {
          const envelopeIds = new Set<string>()
          for (const id of ids) {
            envelopeIds.add(String(id))
          }
          return unprocessedWith((envelope) => envelopeIds.has(envelope.requestId))
        }),
      resetAddress: () => Effect.void,
      resetShards: () => Effect.void
    }

    const storage = yield* makeEncoded(encoded)

    return {
      storage,
      encoded,
      requests,
      requestsByPrimaryKey,
      unprocessed,
      replyIds,
      journal,
      cursors
    } as const
  })
}) {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: Layer.Layer<MessageStorage> = Layer.succeed(MessageStorage, noop)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<
  MessageStorage | MemoryDriver,
  never,
  ShardingConfig
> = Layer.effect(MessageStorage, Effect.map(MemoryDriver, (_) => _.storage)).pipe(
  Layer.provideMerge(MemoryDriver.Default)
)

// --- internal ---

const EnvelopeWithReply: Schema.Schema<{
  readonly envelope: Envelope.Envelope.PartialEncoded
  readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
}, {
  readonly envelope: Envelope.Envelope.Encoded
  readonly lastSentReply: Schema.OptionEncoded<Reply.ReplyEncoded<any>>
}> = Schema.Struct({
  envelope: Envelope.PartialEncoded,
  lastSentReply: Schema.OptionFromSelf(Reply.Encoded)
}) as any

const decodeEnvelopeWithReply = Schema.decode(EnvelopeWithReply)
