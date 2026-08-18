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
import * as Result from "effect/Result"
import * as ClusterMetrics from "effect/unstable/cluster/ClusterMetrics"
import { Persisted } from "effect/unstable/cluster/ClusterSchema"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as ShardId from "effect/unstable/cluster/ShardId"
import type * as Rpc from "effect/unstable/rpc/Rpc"
import { decodeName, encodeName } from "./internal/clusterName.ts"
import { makeEntityKeepAlive } from "./internal/entityKeepAlive.ts"
import {
  ackChunk,
  clearReplies,
  completeTell,
  EncodedMessageTooLargeError,
  loadDue,
  loadMessage,
  loadNextReply,
  loadUnprocessed,
  MailboxFullError,
  persistRequest,
  type PersistResult,
  saveReply
} from "./internal/entityMailbox.ts"
import { type EntityRegistration, getEntityRegistration } from "./internal/entityRegistry.ts"
import { deliverReply as deliverEntityReply } from "./internal/entityReply.ts"
import { makeEntityRuntime } from "./internal/entityRuntime.ts"
import { armAlarm, earliestDeliverAt, ensureEntityStorage } from "./internal/entityStorage.ts"
import { decodeReplyFor, decodeRequest, encodeReplyFor } from "./internal/entityWire.ts"
import { makeQueueRuntime } from "./internal/queueRuntime.ts"
import { earliestLeaseExpiry } from "./internal/queueStorage.ts"
import { getSingletonRegistration } from "./internal/singletonRegistry.ts"
import { makeSingletonRuntime } from "./internal/singletonRuntime.ts"
import { ensureSingletonStorage, loadSingletonState, rememberSingletonName } from "./internal/singletonStorage.ts"
import type { WorkflowRunOptions, WorkflowStub } from "./internal/workflowRegistry.ts"
import { makeWorkflowRuntime } from "./internal/workflowRuntime.ts"
import { earliestClockWakeUp, ensureWorkflowStorage, loadExecution } from "./internal/workflowStorage.ts"

const notExposed = (className: string) => () => {
  throw new Error(
    `@effect/platform-cloudflare: ${className} is not exposed over fetch, use the same-Worker namespace binding`
  )
}

type EntityRuntime = Effect.Success<ReturnType<typeof makeEntityRuntime>>

type WorkflowRuntime = ReturnType<typeof makeWorkflowRuntime>

type QueueRuntime = ReturnType<typeof makeQueueRuntime>

type QueueItem = Awaited<ReturnType<QueueRuntime["take"]>>

type SingletonRuntime = ReturnType<typeof makeSingletonRuntime>

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
  readonly deliverAt?: number | undefined
  readonly replyTos?: ReadonlyArray<string> | undefined
}

interface InvokeResult {
  readonly requestId: string
  readonly replies: ReadonlyArray<string>
  readonly error?: "MailboxFull" | "EncodedMessageTooLarge" | "AskDeduplicatedToTell" | undefined
}

interface InvokeOutcome {
  readonly result: InvokeResult
  readonly deferred?: Promise<InvokeResult> | undefined
}

interface DeliveryOptions {
  readonly deliverAt?: number | undefined
  readonly primaryKey?: string | null | undefined
  readonly replyTo?: string | undefined
}

interface WorkerWaiter {
  readonly clientRequestId: string
  readonly resolve: (result: InvokeResult) => void
  readonly reject: (error: unknown) => void
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
  readonly #name: string
  #runtime: EntityRuntime | undefined
  #serial: Promise<void> = Promise.resolve()
  readonly #sessions = new Map<string, ReplySession>()
  readonly #workerWaiters = new Map<string, Array<WorkerWaiter>>()
  readonly #keepAlive

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#state = ctx
    this.#name = ctx.id.name ?? ""
    const name = decodeName(this.#name)
    if (name === undefined) throw new Error("ClusterEntity requires a canonical entity Durable Object name")
    this.#address = EntityAddress.make({
      shardId: ShardId.make("default", 1),
      entityType: EntityType.make(name.type),
      entityId: EntityId.make(name.id)
    })
    this.#keepAlive = makeEntityKeepAlive(() => {
      const namespace = (this.#state.exports as Record<string, unknown>).ClusterEntity as
        | { readonly getByName: (name: string) => { readonly hold: () => Promise<void> } }
        | undefined
      if (namespace === undefined) {
        return Promise.reject(
          new Error("CloudflareCluster: ClusterEntity export is unavailable for keep-alive")
        )
      }
      return namespace.getByName(this.#name).hold()
    })
    const sql = ctx.storage.sql
    ensureEntityStorage(sql)
    const deliverAt = earliestDeliverAt(sql)
    if (deliverAt !== undefined) {
      void ctx.blockConcurrencyWhile(() => Effect.runPromise(armAlarm(ctx.storage, deliverAt)))
    }
  }

  override alarm(): Promise<void> {
    const operation = this.#serial.then(() => Effect.runPromise(this.#runAlarm()))
    this.#serial = operation.then(() => void 0, () => void 0)
    return operation
  }

  /** @internal Keeps this object non-hibernateable while entity resources have holders. */
  hold(): Promise<void> {
    return Effect.runPromise(this.#keepAlive.await)
  }

  /** @internal Same-Worker RPC transport used by `CloudflareCluster.layer`. */
  invoke(envelopeText: string, discard: boolean, delivery?: DeliveryOptions): Promise<InvokeResult> {
    const operation = this.#serial.then(() => Effect.runPromise(this.#invoke(envelopeText, discard, delivery)))
    this.#serial = operation.then(() => void 0, () => void 0)
    return operation.then((outcome) => outcome.deferred ?? outcome.result)
  }

  #invoke(envelopeText: string, discard: boolean, delivery?: DeliveryOptions): Effect.Effect<InvokeOutcome> {
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
          this.#runStored(
            registration,
            runtime,
            row.envelope,
            row.lastSentChunk,
            row.discard,
            row.deliverAt === undefined
              ? undefined
              : {
                scheduled: true,
                ...(row.replyTos === undefined ? undefined : { replyTos: row.replyTos })
              }
          ).pipe(
            Effect.catchCause((cause) => this.#completeReplayFailure(registration, row, cause))
          ),
        { discard: true }
      )

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (!isPersisted) {
        const replies = yield* this.#run(registration, runtime, envelope, undefined, discard, false)
        return { result: { requestId: String(envelope.requestId), replies } }
      }

      const persistedResult = yield* Effect.result(
        // Preserve unknown thrown values so the fallback defect is unchanged.
        // @effect-diagnostics-next-line unknownInEffectCatch:off
        Effect.try({
          try: () =>
            storage.transactionSync(() =>
              persistRequest(
                storage.sql,
                envelopeText,
                delivery?.primaryKey ?? Envelope.primaryKey(envelope),
                discard,
                delivery?.deliverAt,
                delivery?.replyTo
              )
            ),
          catch: (error) => error
        }).pipe(
          Effect.withSpan("CloudflareCluster.persist", {
            attributes: {
              entityType: registration.entity.type,
              entityId: String(this.#address.entityId),
              rpc: envelope.tag
            }
          }, { captureStackTrace: false }),
          Effect.provideContext(registration.context)
        )
      )
      if (Result.isFailure(persistedResult)) {
        const error = persistedResult.failure
        if (error instanceof MailboxFullError) {
          return { result: { requestId: String(envelope.requestId), replies: [], error: "MailboxFull" as const } }
        } else if (error instanceof EncodedMessageTooLargeError) {
          return {
            result: { requestId: String(envelope.requestId), replies: [], error: "EncodedMessageTooLarge" as const }
          }
        }
        return yield* Effect.die(error)
      }
      const persisted: PersistResult = persistedResult.success
      if (persisted._tag === "Duplicate") {
        const original = loadMessage(storage.sql, persisted.originalId)
        if (original === undefined) return yield* Effect.die("Duplicate mailbox row disappeared")
        if (original.discard && !discard) {
          return {
            result: {
              requestId: persisted.originalId,
              replies: [],
              error: "AskDeduplicatedToTell" as const
            }
          }
        }
        const nextReply = loadNextReply(storage.sql, persisted.originalId)
        if (nextReply !== undefined) {
          this.#releaseTerminalSession(persisted.originalId, nextReply)
          return { result: { requestId: persisted.originalId, replies: [nextReply] } }
        }
        if (persisted.processed) {
          return { result: { requestId: persisted.originalId, replies: [] } }
        }
        if (delivery?.deliverAt !== undefined) {
          yield* this.#armEarliestAlarm()
          return this.#delayedOutcome(
            persisted.originalId,
            discard,
            delivery.replyTo,
            String(envelope.requestId)
          )
        }
        if (original.deliverAt !== undefined && original.deliverAt > Date.now()) {
          yield* this.#armEarliestAlarm()
          return this.#delayedOutcome(
            persisted.originalId,
            discard,
            delivery?.replyTo,
            String(envelope.requestId)
          )
        }
        const replies = yield* this.#runStored(
          registration,
          runtime,
          original.envelope,
          original.lastSentChunk,
          original.discard
        )
        return { result: { requestId: persisted.originalId, replies } }
      }
      if (delivery?.deliverAt !== undefined) {
        yield* this.#armEarliestAlarm()
        return this.#delayedOutcome(String(envelope.requestId), discard, delivery.replyTo)
      }
      const replies = yield* this.#run(registration, runtime, envelope, undefined, discard, true)
      return { result: { requestId: String(envelope.requestId), replies } }
    })
  }

  #delayedOutcome(
    requestId: string,
    discard: boolean,
    replyTo: string | undefined,
    clientRequestId = requestId
  ): InvokeOutcome {
    const result = { requestId, replies: [] }
    if (discard || replyTo !== undefined) return { result }
    const deferred = new Promise<InvokeResult>((resolve, reject) => {
      const waiters = this.#workerWaiters.get(requestId) ?? []
      waiters.push({ clientRequestId, resolve, reject })
      this.#workerWaiters.set(requestId, waiters)
    })
    return { result, deferred }
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
  interrupt(storageRequestId: string, clientRequestId = storageRequestId): Promise<void> {
    const waiters = this.#workerWaiters.get(storageRequestId)
    if (waiters !== undefined) {
      const remaining = waiters.filter((waiter) => {
        if (waiter.clientRequestId !== clientRequestId) return true
        waiter.reject(new Error("Delayed entity request interrupted"))
        return false
      })
      if (remaining.length === 0) this.#workerWaiters.delete(storageRequestId)
      else this.#workerWaiters.set(storageRequestId, remaining)
    }
    const session = this.#sessions.get(storageRequestId)
    if (session === undefined) return Promise.resolve()
    this.#sessions.delete(storageRequestId)
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
    return Effect.map(
      makeEntityRuntime(
        registration,
        this.#address,
        () => crypto.randomUUID(),
        this.#name,
        this.#keepAlive.update
      ),
      (runtime) => {
        this.#runtime = runtime
        return runtime
      }
    )
  }

  #runStored(
    registration: EntityRegistration,
    runtime: EntityRuntime,
    envelopeText: string,
    lastSentChunk: string | undefined,
    discard: boolean,
    options?: { readonly scheduled?: boolean; readonly replyTos?: ReadonlyArray<string> | undefined }
  ) {
    return Effect.flatMap(
      decodeRequest(registration, envelopeText),
      (envelope) => this.#run(registration, runtime, envelope, lastSentChunk, discard, true, options)
    )
  }

  #runAlarm() {
    const registration = getEntityRegistration(this.#address.entityType)
    if (registration === undefined) {
      return Effect.die(`No handlers registered for entity type: ${this.#address.entityType}`)
    }
    return Effect.gen({ self: this }, function*() {
      const runtime = yield* this.#getRuntime(registration)
      yield* Effect.forEach(
        loadDue(this.#state.storage.sql),
        (row) =>
          this.#runStored(registration, runtime, row.envelope, row.lastSentChunk, row.discard, {
            scheduled: true,
            ...(row.replyTos === undefined ? undefined : { replyTos: row.replyTos })
          }).pipe(
            Effect.catchCause((cause) => this.#completeReplayFailure(registration, row, cause))
          ),
        { discard: true }
      )
      yield* this.#armEarliestAlarm()
    }).pipe(
      Effect.withSpan("CloudflareCluster.alarm", {
        attributes: {
          entityType: registration.entity.type,
          entityId: String(this.#address.entityId)
        }
      }, { captureStackTrace: false }),
      Effect.provideContext(registration.context)
    )
  }

  #armEarliestAlarm(): Effect.Effect<void> {
    const deliverAt = earliestDeliverAt(this.#state.storage.sql)
    return deliverAt === undefined ? Effect.void : armAlarm(this.#state.storage, deliverAt)
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
        (reply) =>
          Effect.sync(() => storage.transactionSync(() => saveReply(storage.sql, reply))).pipe(
            Effect.andThen(this.#deliverScheduledReply(encoded.requestId as string, reply, row.replyTos))
          )
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
    persisted: boolean,
    options?: { readonly scheduled?: boolean; readonly replyTos?: ReadonlyArray<string> | undefined }
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

      const scheduled = options?.scheduled === true
      const session = discard || scheduled ? undefined : this.#makeSession(requestId)
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
            if (scheduled && reply._tag === "WithExit") {
              yield* this.#deliverScheduledReply(requestId, encoded, options?.replyTos)
            }
          })
      )
      if (discard || scheduled) {
        yield* execution
        if (discard && persisted) completeTell(storage.sql, requestId)
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

  #deliverScheduledReply(
    requestId: string,
    reply: string,
    replyTos: ReadonlyArray<string> | undefined
  ): Effect.Effect<void> {
    const waiters = this.#workerWaiters.get(requestId)
    if (waiters !== undefined) {
      this.#workerWaiters.delete(requestId)
      for (const waiter of waiters) {
        waiter.resolve({ requestId, replies: [reply] })
      }
    }
    if (replyTos === undefined) return Effect.void
    const namespace = (this.#state.exports as Record<string, unknown>).ClusterEntity as
      | {
        readonly getByName: (
          name: string
        ) => { readonly deliverReply: (requestId: string, reply: string) => Promise<boolean> }
      }
      | undefined
    if (namespace === undefined) {
      return Effect.logError(
        "Scheduled entity reply delivery failed",
        new Error("CloudflareCluster: ClusterEntity export is unavailable for scheduled reply delivery")
      )
    }
    return Effect.forEach(
      replyTos,
      (replyTo) =>
        Effect.promise(() => namespace.getByName(replyTo).deliverReply(requestId, reply)).pipe(
          Effect.flatMap((delivered) =>
            delivered
              ? Effect.void
              : Effect.logError(
                "Scheduled entity reply delivery failed",
                new Error(`Scheduled entity reply target is unavailable: ${replyTo}`)
              )
          ),
          Effect.catchCause((cause) => Effect.logError("Scheduled entity reply delivery failed", cause))
        ),
      { discard: true }
    )
  }

  /** @internal Completes an in-memory delayed ask owned by this entity object. */
  deliverReply(requestId: string, reply: string): Promise<boolean> {
    return deliverEntityReply(requestId, reply)
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
 * The workflow execution class behind `CloudflareWorkflowEngine`. One
 * instance holds one workflow execution: run state, activity results keyed
 * `${name}/${attempt}`, durable deferred exits, and the clock due table.
 *
 * **Details**
 *
 * The constructor stays cheap: it opens SQLite, ensures the workflow tables,
 * and re-arms the single alarm from the earliest pending clock. Workflow
 * handlers are looked up in the module-level registry and built once per
 * wake.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterWorkflow extends DurableObject<unknown> {
  readonly #state: DurableObjectState
  readonly #name: string | undefined
  #runtime: WorkflowRuntime | undefined

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#state = ctx
    ensureWorkflowStorage(ctx.storage.sql)
    if (ctx.id.name !== undefined) {
      if (decodeName(ctx.id.name) === undefined) {
        throw new Error("ClusterWorkflow requires a canonical workflow Durable Object name")
      }
      this.#name = ctx.id.name
    } else {
      // An alarm wake carries no `id.name`; recover it from the stored
      // execution so due clocks still fire after eviction.
      const stored = loadExecution(ctx.storage.sql)
      this.#name = stored === undefined ? undefined : encodeName(stored.workflowName, stored.executionId)
    }
    const wakeUp = earliestClockWakeUp(ctx.storage.sql)
    if (wakeUp !== undefined) {
      void ctx.blockConcurrencyWhile(() => Effect.runPromise(armAlarm(ctx.storage, wakeUp)))
    }
  }

  #getRuntime(): WorkflowRuntime {
    if (this.#runtime === undefined) {
      if (this.#name === undefined) {
        throw new Error("ClusterWorkflow requires a canonical workflow Durable Object name")
      }
      this.#runtime = makeWorkflowRuntime({
        name: this.#name,
        sql: this.#state.storage.sql,
        alarm: this.#state.storage,
        now: () => Date.now(),
        waitUntil: (promise) => this.#state.waitUntil(promise),
        getStub: (name) => {
          const namespace = (this.#state.exports as Record<string, unknown>).ClusterWorkflow as
            | { readonly getByName: (name: string) => unknown }
            | undefined
          if (namespace === undefined) {
            throw new Error("CloudflareCluster: ClusterWorkflow export is unavailable for workflow delivery")
          }
          return namespace.getByName(name) as WorkflowStub
        }
      })
    }
    return this.#runtime
  }

  /** @internal Same-Worker RPC transport used by `CloudflareWorkflowEngine`. */
  run(payload: string, options: WorkflowRunOptions): Promise<string> {
    return this.#getRuntime().run(payload, options)
  }

  /** @internal */
  poll(): Promise<string | undefined> {
    return this.#getRuntime().poll()
  }

  /** @internal */
  resume(): Promise<void> {
    return this.#getRuntime().resume()
  }

  /** @internal */
  interrupt(): Promise<void> {
    return this.#getRuntime().interrupt()
  }

  /** @internal */
  interruptUnsafe(): Promise<void> {
    return this.#getRuntime().interruptUnsafe()
  }

  /** @internal Records a durable deferred exit and resumes the execution. */
  deferredDone(name: string, exit: string): Promise<void> {
    return this.#getRuntime().deferredDone(name, exit)
  }

  /** @internal Persists a durable clock and arms the single alarm. */
  scheduleClock(name: string, deferredName: string, wakeUp: number): Promise<void> {
    return this.#getRuntime().scheduleClock(name, deferredName, wakeUp)
  }

  override alarm(): Promise<void> {
    // No stored execution means no clock could have armed this alarm.
    if (this.#name === undefined) return Promise.resolve()
    return this.#getRuntime().runAlarm()
  }

  override fetch: () => never = notExposed("ClusterWorkflow")
}

/**
 * The durable queue class behind the `PersistedQueue` implementation used by
 * `DurableQueue`. One instance holds one named queue.
 *
 * **Details**
 *
 * The constructor stays cheap: it opens SQLite, ensures the queue table, and
 * re-arms the single alarm from the earliest pending lease expiry. Items are
 * leased to takers for a bounded time; the alarm watchdog expires overdue
 * leases so an item whose worker died is redelivered.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterDurableQueue extends DurableObject<unknown> {
  readonly #runtime: QueueRuntime

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    if (ctx.id.name !== undefined && decodeName(ctx.id.name) === undefined) {
      throw new Error("ClusterDurableQueue requires a canonical queue Durable Object name")
    }
    this.#runtime = makeQueueRuntime({
      sql: ctx.storage.sql,
      alarm: ctx.storage,
      now: () => Date.now()
    })
    const expiry = earliestLeaseExpiry(ctx.storage.sql)
    if (expiry !== undefined) {
      void ctx.blockConcurrencyWhile(() => Effect.runPromise(armAlarm(ctx.storage, expiry)))
    }
  }

  /** @internal Same-Worker RPC transport used by `CloudflarePersistedQueue.layer`. */
  offer(id: string, element: string): Promise<void> {
    return this.#runtime.offer(id, element)
  }

  /** @internal Waits until an item is available, then leases it to the caller. */
  take(takerId: string, maxAttempts: number, leaseMillis: number): Promise<QueueItem> {
    return this.#runtime.take(takerId, maxAttempts, leaseMillis)
  }

  /** @internal Cancels a waiting take, releasing an item already leased to it. */
  cancelTake(takerId: string): Promise<void> {
    return this.#runtime.cancelTake(takerId)
  }

  /** @internal */
  complete(id: string): Promise<void> {
    return this.#runtime.complete(id)
  }

  /** @internal Records a failed attempt and requeues the item. */
  fail(id: string, lastFailure: string): Promise<void> {
    return this.#runtime.fail(id, lastFailure)
  }

  /** @internal Requeues the item without counting an attempt. */
  release(id: string): Promise<void> {
    return this.#runtime.release(id)
  }

  /** @internal Extends the lease of an item still being processed. */
  extend(id: string, leaseMillis: number): Promise<void> {
    return this.#runtime.extend(id, leaseMillis)
  }

  override alarm(): Promise<void> {
    return this.#runtime.runAlarm()
  }

  override fetch: () => never = notExposed("ClusterDurableQueue")
}

/**
 * The singleton class. One object holds one registered singleton under the
 * name `Singleton/<name>` and is woken by a Worker Cron Trigger.
 *
 * **Details**
 *
 * The constructor opens SQLite, ensures the singleton state table, and
 * re-arms the watchdog alarm for a wake interrupted by isolate loss. `wake()`
 * runs the registered effect once and returns; it never appends
 * `Effect.never`, so Cloudflare may hibernate the object afterward.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterSingleton extends DurableObject<unknown> {
  readonly #state: DurableObjectState
  readonly #name: string | undefined
  #runtime: SingletonRuntime | undefined

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#state = ctx
    const sql = ctx.storage.sql
    ensureSingletonStorage(sql)
    if (ctx.id.name !== undefined) {
      if (!ctx.id.name.startsWith("Singleton/")) {
        throw new Error("ClusterSingleton requires a Singleton/<name> Durable Object name")
      }
      rememberSingletonName(sql, ctx.id.name)
    }
    const stored = loadSingletonState(sql)
    this.#name = ctx.id.name ?? stored.name
    if (stored.wakeAt !== undefined) {
      void ctx.blockConcurrencyWhile(() => Effect.runPromise(armAlarm(ctx.storage, stored.wakeAt!)))
    }
  }

  #getRuntime(): SingletonRuntime {
    if (this.#runtime !== undefined) return this.#runtime
    if (this.#name === undefined) {
      throw new Error("ClusterSingleton requires a Singleton/<name> Durable Object name")
    }
    const name = this.#name.slice("Singleton/".length)
    const registration = getSingletonRegistration(name)
    if (registration === undefined) {
      throw new Error(`CloudflareCluster: no singleton registered under the name "${name}"`)
    }
    const run = Effect.sync(() => {
      ClusterMetrics.singletons.modifyUnsafe(BigInt(1), registration.context)
    }).pipe(
      Effect.andThen(registration.run),
      Effect.scoped,
      Effect.ensuring(Effect.sync(() => {
        ClusterMetrics.singletons.modifyUnsafe(BigInt(-1), registration.context)
      })),
      Effect.provideContext(registration.context),
      Effect.orDie
    )
    this.#runtime = makeSingletonRuntime({
      sql: this.#state.storage.sql,
      alarm: this.#state.storage,
      now: () => Date.now(),
      run
    })
    return this.#runtime
  }

  /** @internal Runs one Cron Trigger fire, coalescing a concurrent duplicate. */
  wake(): Promise<void> {
    return this.#getRuntime().wake()
  }

  override alarm(): Promise<void> {
    if (loadSingletonState(this.#state.storage.sql).wakeAt === undefined) return Promise.resolve()
    return this.#getRuntime().runAlarm()
  }

  override fetch: () => never = notExposed("ClusterSingleton")
}
