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
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import { Persisted } from "effect/unstable/cluster/ClusterSchema"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as ShardId from "effect/unstable/cluster/ShardId"
import type * as Rpc from "effect/unstable/rpc/Rpc"
import { decodeName } from "./internal/clusterName.ts"
import {
  ackChunk,
  clearReplies,
  completeTell,
  EncodedMessageTooLargeError,
  loadMessage,
  loadNextReply,
  loadUnprocessed,
  MailboxFullError,
  persistRequest,
  type PersistResult,
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

interface ReplySession {
  readonly replies: Array<string>
  readonly takers: Array<{
    readonly resolve: (reply: string | undefined) => void
    readonly reject: (error: unknown) => void
  }>
  done: boolean
  failed: boolean
  failure: unknown
  ack: {
    readonly replyId: string
    readonly resolve: () => void
  } | undefined
  interrupt: (() => Promise<void>) | undefined
}

interface ReplayMessage {
  readonly envelope: string
  readonly lastSentChunk: string | undefined
  readonly discard: boolean
}

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
  readonly #sessions = new Map<string, ReplySession>()

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
    return Effect.gen({ self: this }, function*() {
      const storage = this.#state.storage
      const runtime = yield* this.#getRuntime(registration)
      yield* Effect.forEach(
        loadUnprocessed(storage.sql),
        (row) =>
          this.#runStored(registration, runtime, row.envelope, row.lastSentChunk, row.discard).pipe(
            Effect.catchCause((cause) => this.#completeReplayFailure(registration, row, cause))
          ),
        { discard: true }
      )

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (!isPersisted) {
        const replies = yield* this.#run(registration, runtime, envelope, undefined, discard, false)
        return { requestId: String(envelope.requestId), replies }
      }

      let persisted: PersistResult
      try {
        persisted = storage.transactionSync(() =>
          persistRequest(
            storage.sql,
            envelopeText,
            Envelope.primaryKey(envelope),
            discard
          )
        )
      } catch (error) {
        if (error instanceof MailboxFullError) {
          return { requestId: String(envelope.requestId), replies: [], error: "MailboxFull" as const }
        } else if (error instanceof EncodedMessageTooLargeError) {
          return { requestId: String(envelope.requestId), replies: [], error: "EncodedMessageTooLarge" as const }
        }
        return yield* Effect.die(error)
      }
      if (persisted._tag === "Duplicate") {
        const nextReply = loadNextReply(storage.sql, persisted.originalId)
        if (nextReply !== undefined) {
          this.#releaseTerminalSession(persisted.originalId, nextReply)
          return { requestId: persisted.originalId, replies: [nextReply] }
        }
        if (persisted.processed) {
          return { requestId: persisted.originalId, replies: [] }
        }
        const original = loadMessage(storage.sql, persisted.originalId)
        if (original === undefined) return yield* Effect.die("Duplicate mailbox row disappeared")
        const replies = yield* this.#runStored(
          registration,
          runtime,
          original.envelope,
          original.lastSentChunk,
          original.discard
        )
        return { requestId: persisted.originalId, replies }
      }
      const replies = yield* this.#run(registration, runtime, envelope, undefined, discard, true)
      return { requestId: String(envelope.requestId), replies }
    })
  }

  /** @internal Acknowledges a streamed chunk. */
  acknowledge(requestId: string, replyId: string): Promise<ReadonlyArray<string>> {
    this.#state.storage.transactionSync(() => ackChunk(this.#state.storage.sql, requestId, replyId))
    const session = this.#sessions.get(requestId)
    if (session !== undefined) {
      if (session.ack?.replyId === replyId) {
        session.ack.resolve()
        session.ack = undefined
        return this.#takeReply(requestId, session)
      }
      const nextReply = loadNextReply(this.#state.storage.sql, requestId)
      return Promise.resolve(nextReply === undefined ? [] : [nextReply])
    }
    const nextReply = loadNextReply(this.#state.storage.sql, requestId)
    return Promise.resolve(nextReply === undefined ? [] : [nextReply])
  }

  /** @internal Interrupts an in-memory handler execution. Persisted rows remain replayable. */
  interrupt(requestId: string): Promise<void> {
    const session = this.#sessions.get(requestId)
    if (session === undefined) return Promise.resolve()
    this.#sessions.delete(requestId)
    session.ack?.resolve()
    session.ack = undefined
    session.done = true
    for (const take of session.takers.splice(0)) take.resolve(undefined)
    return session.interrupt?.() ?? Promise.resolve()
  }

  /** @internal */
  clearReplies(requestId: string): void {
    this.#state.storage.transactionSync(() => clearReplies(this.#state.storage.sql, requestId))
  }

  /** @internal */
  reset(requestId: string): Promise<void> {
    this.clearReplies(requestId)
    return Promise.resolve()
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

  #completeReplayFailure(
    registration: EntityRegistration,
    row: ReplayMessage,
    cause: Cause.Cause<unknown>
  ): Effect.Effect<void> {
    const storage = this.#state.storage
    return Effect.suspend(() => {
      const encoded = JSON.parse(row.envelope) as { readonly requestId?: unknown; readonly tag?: unknown }
      if (typeof encoded.requestId !== "string") return Effect.void
      if (row.discard || typeof encoded.tag !== "string") {
        completeTell(storage.sql, encoded.requestId)
        return Effect.void
      }
      const rpc = registration.entity.protocol.requests.get(encoded.tag) as Rpc.AnyWithProps | undefined
      if (rpc === undefined) {
        completeTell(storage.sql, encoded.requestId)
        return Effect.void
      }
      return Effect.flatMap(
        encodeReplyFor(
          registration,
          rpc,
          new Reply.WithExit({
            requestId: encoded.requestId as any,
            id: crypto.randomUUID() as any,
            exit: Exit.failCause(cause)
          })
        ),
        (reply) => Effect.sync(() => storage.transactionSync(() => saveReply(storage.sql, reply)))
      ).pipe(
        Effect.catchCause(() =>
          Effect.sync(() => {
            completeTell(storage.sql, encoded.requestId as string)
          })
        )
      )
    })
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
    return Effect.gen({ self: this }, function*() {
      let lastSentChunk = Option.none<Reply.Chunk<any>>()
      if (lastSentChunkText !== undefined) {
        const reply = yield* decodeReplyFor(rpc, registration.context, lastSentChunkText)
        if (reply._tag === "Chunk") lastSentChunk = Option.some(reply)
      }
      const requestId = String(envelope.requestId)
      if (!discard) {
        const active = this.#sessions.get(requestId)
        if (active !== undefined) {
          const nextReply = persisted ? loadNextReply(storage.sql, requestId) : undefined
          return nextReply === undefined ? [] : [nextReply]
        }
      }

      const session = discard ? undefined : this.#makeSession(requestId)
      const execution = runtime.run(
        envelope,
        lastSentChunk,
        discard,
        (reply) =>
          Effect.gen({ self: this }, function*() {
            const encoded = yield* encodeReplyFor(registration, rpc, reply)
            if (persisted) {
              storage.transactionSync(() => saveReply(storage.sql, encoded))
            }
            if (session !== undefined) {
              yield* Effect.promise(() => this.#offerReply(session, encoded))
            }
          })
      )
      if (discard) {
        yield* execution
        if (persisted) completeTell(storage.sql, requestId)
        return []
      }

      const fiber = Effect.runFork(execution)
      session!.interrupt = () => Effect.runPromise(Fiber.interrupt(fiber))
      const completion = Effect.runPromise(Fiber.await(fiber)).then((exit) => {
        this.#finishSession(requestId, session!, exit)
      })
      this.#state.waitUntil(completion)
      return yield* Effect.promise(() => this.#takeReply(requestId, session!))
    })
  }

  #makeSession(requestId: string): ReplySession {
    const session: ReplySession = {
      replies: [],
      takers: [],
      done: false,
      failed: false,
      failure: undefined,
      ack: undefined,
      interrupt: undefined
    }
    this.#sessions.set(requestId, session)
    return session
  }

  #offerReply(session: ReplySession, reply: string): Promise<void> {
    const encoded = JSON.parse(reply) as { readonly _tag?: unknown; readonly id?: unknown }
    let acknowledged = Promise.resolve()
    if (encoded._tag === "Chunk" && typeof encoded.id === "string") {
      let resolve!: () => void
      acknowledged = new Promise<void>((resume) => {
        resolve = resume
      })
      session.ack = { replyId: encoded.id, resolve }
    }
    const take = session.takers.shift()
    if (take === undefined) session.replies.push(reply)
    else take.resolve(reply)
    return acknowledged
  }

  async #takeReply(requestId: string, session: ReplySession): Promise<ReadonlyArray<string>> {
    const reply = session.replies.shift() ?? await (session.done
      ? session.failed ? Promise.reject(session.failure) : Promise.resolve(undefined)
      : new Promise<string | undefined>((resolve, reject) => session.takers.push({ resolve, reject })))
    if (reply === undefined) return []
    this.#releaseTerminalSession(requestId, reply)
    return [reply]
  }

  #finishSession(requestId: string, session: ReplySession, exit: Exit.Exit<unknown, unknown>): void {
    session.done = true
    if (Exit.isFailure(exit)) {
      session.failed = true
      session.failure = Cause.squash(exit.cause)
    }
    for (const take of session.takers.splice(0)) {
      if (session.failed) take.reject(session.failure)
      else take.resolve(undefined)
    }
    if (session.replies.length === 0 && session.ack === undefined) {
      this.#sessions.delete(requestId)
    }
  }

  #releaseTerminalSession(requestId: string, reply: string): void {
    if ((JSON.parse(reply) as { readonly _tag?: unknown })._tag === "WithExit") {
      this.#sessions.delete(requestId)
    }
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
