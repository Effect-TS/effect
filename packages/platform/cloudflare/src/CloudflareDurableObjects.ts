/**
 * The Durable Object classes behind `CloudflareCluster.layer`.
 *
 * A Worker using the Cloudflare cluster re-exports these four classes from its
 * entry module and binds each one in `wrangler.jsonc` as a SQLite-backed
 * Durable Object class. The cluster resolves objects through the same-Worker
 * namespace bindings only; none of these classes serve a public route, and any
 * direct `fetch` of an object is rejected.
 *
 * @since 4.0.0
 */
import { DurableObject } from "cloudflare:workers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { Persisted } from "effect/unstable/cluster/ClusterSchema"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as Envelope from "effect/unstable/cluster/Envelope"
import type * as Reply from "effect/unstable/cluster/Reply"
import * as ShardId from "effect/unstable/cluster/ShardId"
import type * as Rpc from "effect/unstable/rpc/Rpc"
import { decodeName } from "./internal/clusterName.ts"
import {
  ackChunk,
  completeTell,
  EncodedMessageTooLargeError,
  loadMessage,
  loadNextReply,
  loadUnprocessed,
  MailboxFullError,
  persistRequest,
  resetMessage,
  saveReply
} from "./internal/entityMailbox.ts"
import { type EntityRegistration, getEntityRegistration } from "./internal/entityRegistry.ts"
import { makeEntityRuntime } from "./internal/entityRuntime.ts"
import { armAlarm, earliestDeliverAt, ensureEntityStorage } from "./internal/entityStorage.ts"
import { decodeReplyFor, decodeRequest, encodeReplyFor } from "./internal/entityWire.ts"

const notExposed = (className: string) => () => {
  throw new Error(
    `@effect/platform-cloudflare: ${className} is not exposed over fetch, use the same-Worker namespace binding`
  )
}

type EntityRuntime = Effect.Success<ReturnType<typeof makeEntityRuntime>>

/**
 * The shared entity class. One instance holds one entity address; the handlers
 * for every `EntityType` are registered at Worker init.
 *
 * **Details**
 *
 * The constructor stays cheap: it opens SQLite, ensures the mailbox tables,
 * and re-arms the single alarm from the earliest pending `deliver_at`. User
 * handlers are never built in the constructor; they are built once per wake.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterEntity extends DurableObject<unknown> {
  readonly #state: DurableObjectState
  readonly #address: EntityAddress.EntityAddress
  #runtime: EntityRuntime | undefined
  #serial: Promise<void> = Promise.resolve()

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#state = ctx
    const name = decodeName(ctx.id.name ?? "")
    if (name === undefined) throw new Error("ClusterEntity requires a canonical entity Durable Object name")
    this.#address = EntityAddress.make({
      shardId: ShardId.make("default", 1),
      entityType: EntityType.make(name.type),
      entityId: EntityId.make(name.id)
    })
    const sql = ctx.storage.sql
    ensureEntityStorage(sql)
    const deliverAt = earliestDeliverAt(sql)
    if (deliverAt !== undefined) {
      void ctx.blockConcurrencyWhile(() => Effect.runPromise(armAlarm(ctx.storage, deliverAt)))
    }
  }

  // Scheduled rows cannot exist until the mailbox lands; handling the alarm
  // here keeps an armed alarm from firing into a missing handler.
  override alarm(): void {}

  /** @internal Same-Worker RPC transport used by `CloudflareCluster.layer`. */
  invoke(envelopeText: string, discard: boolean): Promise<{
    readonly requestId: string
    readonly replies: ReadonlyArray<string>
    readonly error?: "MailboxFull" | "EncodedMessageTooLarge" | undefined
  }> {
    const operation = this.#serial.then(() => Effect.runPromise(this.#invoke(envelopeText, discard)))
    this.#serial = operation.then(() => void 0, () => void 0)
    return operation
  }

  #invoke(envelopeText: string, discard: boolean) {
    const registration = getEntityRegistration(this.#address.entityType)
    if (registration === undefined) {
      return Effect.die(`No handlers registered for entity type: ${this.#address.entityType}`)
    }
    const storage = this.#state.storage
    const getRuntime = this.#getRuntime.bind(this)
    const run = this.#run.bind(this)
    const runStored = this.#runStored.bind(this)
    return Effect.gen(function*() {
      const runtime = yield* getRuntime(registration)
      yield* Effect.forEach(
        loadUnprocessed(storage.sql),
        (row) => runStored(registration, runtime, row.envelope, row.lastSentChunk, row.discard),
        { discard: true }
      )

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (!isPersisted) {
        const replies = yield* run(registration, runtime, envelope, undefined, discard, false)
        return { requestId: String(envelope.requestId), replies }
      }

      const result = yield* Effect.result(Effect.catchDefect(
        Effect.sync(() =>
          storage.transactionSync(() =>
            persistRequest(
              storage.sql,
              envelopeText,
              Envelope.primaryKey(envelope),
              discard
            )
          )
        ),
        (error) => Effect.fail(error)
      ))
      if (result._tag === "Failure") {
        if (result.failure instanceof MailboxFullError) {
          return { requestId: String(envelope.requestId), replies: [], error: "MailboxFull" as const }
        } else if (result.failure instanceof EncodedMessageTooLargeError) {
          return { requestId: String(envelope.requestId), replies: [], error: "EncodedMessageTooLarge" as const }
        }
        return yield* Effect.die(result.failure)
      }
      const persistedResult = result.success
      if (persistedResult._tag === "Duplicate") {
        const nextReply = loadNextReply(storage.sql, persistedResult.originalId)
        if (nextReply !== undefined) {
          return { requestId: persistedResult.originalId, replies: [nextReply] }
        }
        if (persistedResult.processed) {
          return { requestId: persistedResult.originalId, replies: [] }
        }
        const original = loadMessage(storage.sql, persistedResult.originalId)
        if (original === undefined) return yield* Effect.die("Duplicate mailbox row disappeared")
        const replies = yield* runStored(
          registration,
          runtime,
          original.envelope,
          original.lastSentChunk,
          original.discard
        )
        return { requestId: persistedResult.originalId, replies }
      }
      const replies = yield* run(registration, runtime, envelope, undefined, discard, true)
      return { requestId: String(envelope.requestId), replies }
    })
  }

  /** @internal Acknowledges a streamed chunk. */
  acknowledge(requestId: string, replyId: string): Promise<ReadonlyArray<string>> {
    this.#state.storage.transactionSync(() => ackChunk(this.#state.storage.sql, requestId, replyId))
    const nextReply = loadNextReply(this.#state.storage.sql, requestId)
    return Promise.resolve(nextReply === undefined ? [] : [nextReply])
  }

  /** @internal */
  clearReplies(requestId: string): void {
    this.#state.storage.transactionSync(() => resetMessage(this.#state.storage.sql, requestId))
  }

  /** @internal */
  reset(requestId: string): void {
    this.#state.storage.transactionSync(() => resetMessage(this.#state.storage.sql, requestId))
  }

  #getRuntime(registration: EntityRegistration) {
    if (this.#runtime !== undefined) return Effect.succeed(this.#runtime)
    return Effect.map(makeEntityRuntime(registration, this.#address, () => crypto.randomUUID()), (runtime) => {
      this.#runtime = runtime
      return runtime
    })
  }

  #runStored(
    registration: EntityRegistration,
    runtime: EntityRuntime,
    envelopeText: string,
    lastSentChunk: string | undefined,
    discard: boolean
  ) {
    return Effect.flatMap(
      decodeRequest(registration, envelopeText),
      (envelope) => this.#run(registration, runtime, envelope, lastSentChunk, discard, true)
    )
  }

  #run(
    registration: EntityRegistration,
    runtime: EntityRuntime,
    envelope: Envelope.Request.Any,
    lastSentChunkText: string | undefined,
    discard: boolean,
    persisted: boolean
  ): Effect.Effect<ReadonlyArray<string>> {
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
    const storage = this.#state.storage
    return Effect.gen(function*() {
      const lastSentChunk = lastSentChunkText === undefined
        ? Option.none()
        : Option.filter(
          Option.some(yield* decodeReplyFor(rpc, registration.context, lastSentChunkText)),
          (reply): reply is Reply.Chunk<any> => reply._tag === "Chunk"
        )
      const replies: Array<string> = []
      yield* runtime.run(
        envelope,
        lastSentChunk as any,
        discard,
        (reply) =>
          Effect.gen(function*() {
            const encoded = yield* encodeReplyFor(registration, rpc, reply)
            if (persisted) {
              storage.transactionSync(() => saveReply(storage.sql, encoded))
            }
            replies.push(encoded)
          })
      )
      if (discard && persisted) completeTell(storage.sql, String(envelope.requestId))
      if (discard || !persisted) return replies
      const nextReply = loadNextReply(storage.sql, String(envelope.requestId))
      return nextReply === undefined ? [] : [nextReply]
    })
  }

  override fetch: () => never = notExposed("ClusterEntity")
}

/**
 * The workflow execution class. Placeholder for the Cloudflare workflow
 * engine; it only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterWorkflow extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterWorkflow")
}

/**
 * The durable queue class. Placeholder for `DurableQueue`; one object per
 * queue name. It only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterDurableQueue extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterDurableQueue")
}

/**
 * The singleton class. Placeholder for `Singleton`; one object per singleton
 * name, woken by a Worker Cron Trigger. It only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterSingleton extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterSingleton")
}
