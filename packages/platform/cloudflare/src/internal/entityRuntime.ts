/** @internal */
import type { DurableObjectStorage } from "@cloudflare/workers-types"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Pull from "effect/Pull"
import * as Queue from "effect/Queue"
import * as Result from "effect/Result"
import type * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as ClusterMetrics from "effect/unstable/cluster/ClusterMetrics"
import { Persisted } from "effect/unstable/cluster/ClusterSchema"
import { CurrentAddress, CurrentRunnerAddress, Request } from "effect/unstable/cluster/Entity"
import type * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as RunnerAddress from "effect/unstable/cluster/RunnerAddress"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcSchema from "effect/unstable/rpc/RpcSchema"
import { encodeName } from "./clusterName.ts"
import { EntityKeepAliveHandler } from "./entityKeepAlive.ts"
import type { EntityKeepAlive } from "./entityKeepAlive.ts"
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
  saveReply,
  type StoredMessage
} from "./entityMailbox.ts"
import { type EntityRegistration, getEntityRegistration } from "./entityRegistry.ts"
import { CurrentEntityName, CurrentReplyRegistry, type EntityReplyRegistry, makeReplyRegistry } from "./entityReply.ts"
import { armAlarm, earliestDeliverAt } from "./entityStorage.ts"
import { decodeReplyFor, decodeRequest, encodeReplyFor, type InvokeResult, peekEnvelopeTag } from "./entityWire.ts"

interface CachedHandlers {
  readonly handlers: Record<string, (request: any) => any>
  readonly context: Context.Context<never>
  readonly scope: Scope.Closeable
}

/** @internal */
export const makeEntityRuntime = Effect.fnUntraced(function*(
  registration: EntityRegistration,
  address: EntityAddress.EntityAddress,
  nextId: () => string,
  entityName = encodeName(address.entityType, address.entityId),
  keepAlive?: (enabled: boolean) => Effect.Effect<void>,
  replyRegistry?: EntityReplyRegistry
) {
  let cached: CachedHandlers | undefined
  let building: Deferred.Deferred<CachedHandlers> | undefined
  const metricContext = Context.merge(
    registration.context,
    Metric.CurrentMetricAttributes.context({ type: registration.entity.type })
  )
  // Bounds concurrent handler executions from the entity's `concurrency`
  // build option; `"unbounded"` leaves handlers unlimited.
  const concurrency = registration.options?.concurrency ?? 1
  const handlerSemaphore = concurrency === "unbounded" ? undefined : Semaphore.makeUnsafe(concurrency)

  const invalidate = Effect.fnUntraced(function*() {
    if (cached === undefined) return
    const scope = cached.scope
    cached = undefined
    yield* Scope.close(scope, Exit.void).pipe(
      Effect.ensuring(Effect.sync(() => {
        ClusterMetrics.entities.modifyUnsafe(BigInt(-1), metricContext)
      }))
    )
  })

  const buildHandlers = Effect.fnUntraced(function*() {
    const scope = yield* Scope.make()
    let context = registration.context.pipe(
      Context.add(CurrentAddress, address),
      Context.add(CurrentRunnerAddress, RunnerAddress.make(`${address.entityType}/${address.entityId}`, 0)),
      Context.add(CurrentEntityName, entityName),
      Context.add(Scope.Scope, scope)
    )
    if (keepAlive !== undefined) {
      context = Context.add(context, EntityKeepAliveHandler, keepAlive)
    }
    if (replyRegistry !== undefined) {
      context = Context.add(context, CurrentReplyRegistry, replyRegistry)
    }
    const handlers = yield* Effect.provideContext(registration.build, context).pipe(
      Effect.tapCause((cause) => Scope.close(scope, Exit.failCause(cause)))
    )
    ClusterMetrics.entities.modifyUnsafe(BigInt(1), metricContext)
    return { handlers, context, scope }
  })

  const getHandlers = (): Effect.Effect<CachedHandlers> =>
    Effect.suspend(() => {
      if (cached !== undefined) return Effect.succeed(cached)
      if (building !== undefined) return Deferred.await(building)
      const deferred = Deferred.makeUnsafe<CachedHandlers>()
      building = deferred
      return Effect.onExit(buildHandlers(), (exit) =>
        Effect.sync(() => {
          building = undefined
          if (Exit.isSuccess(exit)) cached = exit.value
          Deferred.doneUnsafe(deferred, exit)
        }))
    })

  const runWithDefectRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    const policy = registration.options?.defectRetryPolicy
    if (policy === undefined) return Effect.exit(effect)
    const retryable = Effect.flatMap(Effect.exit(effect), (exit) =>
      Exit.isFailure(exit) && Cause.hasDies(exit.cause)
        ? Effect.fail(exit.cause)
        : Effect.succeed(exit))
    return Effect.retryOrElse(
      retryable,
      policy as Schedule.Schedule<unknown, Cause.Cause<E>>,
      (cause) => Effect.succeed(Exit.failCause(cause))
    )
  }

  const rebuildAfterDefect = invalidate().pipe(
    Effect.andThen(Effect.catchCause(getHandlers(), () => Effect.void))
  )

  const run = Effect.fnUntraced(function*(
    envelope: Envelope.Request.Any,
    lastSentChunk: Option.Option<Reply.Chunk<any>>,
    discard: boolean,
    respond: (reply: Reply.Reply<any>) => Effect.Effect<void>
  ) {
    const entry = yield* getHandlers()
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps | undefined
    const handler = entry.handlers[envelope.tag]
    if (rpc === undefined || handler === undefined) {
      const exit = Exit.die(`Unknown entity RPC tag: ${envelope.tag}`)
      if (!discard) {
        yield* respond(
          new Reply.WithExit({
            requestId: envelope.requestId,
            id: nextId() as any,
            exit
          })
        )
      }
      return
    }

    const streamSchema = RpcSchema.isStreamSchema(rpc.successSchema) ? rpc.successSchema : undefined
    let currentLastSentChunk = lastSentChunk
    let sequence = Option.match(lastSentChunk, {
      onNone: () => 0,
      onSome: (chunk) => chunk.sequence + 1
    })

    const execute = Effect.suspend(() => {
      const request = new Request({ ...envelope, lastSentChunk: currentLastSentChunk })
      const result = handler(request)
      const unwrapped = Rpc.isWrapper(result as object) ? result.value : result
      if (streamSchema === undefined) return unwrapped as Effect.Effect<any, any>
      return Stream.runForEachArray(unwrapped as Stream.Stream<any, any>, (values) => {
        if (discard) return Effect.void
        const reply = new Reply.Chunk({
          requestId: envelope.requestId,
          id: nextId() as any,
          sequence: sequence++,
          values: values as any
        })
        return Effect.tap(respond(reply), () =>
          Effect.sync(() => {
            currentLastSentChunk = Option.some(reply)
          }))
      })
    }).pipe(
      Effect.withSpan("CloudflareCluster.handler", {
        attributes: {
          entityType: registration.entity.type,
          entityId: String(address.entityId),
          rpc: envelope.tag
        }
      }, { captureStackTrace: false })
    )
    const exit = yield* Effect.provideContext(runWithDefectRetry(execute), entry.context)
    if (!discard) {
      yield* respond(
        new Reply.WithExit({
          requestId: envelope.requestId,
          id: nextId() as any,
          exit: streamSchema !== undefined && Exit.isSuccess(exit) ? Exit.void : exit as any
        })
      )
    }
    if (Exit.isFailure(exit) && Cause.hasDies(exit.cause)) {
      yield* rebuildAfterDefect
    }
  })

  return { run, invalidate, handlerSemaphore } as const
})

type EntityRuntime = Effect.Success<ReturnType<typeof makeEntityRuntime>>

interface SessionReply {
  readonly text: string
  readonly terminal: boolean
}

interface Session {
  readonly queue: Queue.Queue<SessionReply, Cause.Done>
  readonly completeInterrupt: Effect.Effect<void>
  ack: {
    readonly replyId: string
    readonly deferred: Deferred.Deferred<void>
  } | undefined
  fiber: Fiber.Fiber<void> | undefined
}

interface WorkerWaiter {
  readonly clientRequestId: string
  readonly deferred: Deferred.Deferred<InvokeResult>
}

interface RunOptions {
  readonly scheduled?: boolean
  readonly replyTos?: ReadonlyArray<string> | undefined
}

/** @internal */
export interface DeliveryOptions {
  readonly deliverAt?: number | undefined
  readonly primaryKey?: string | null | undefined
  readonly replyTo?: string | undefined
}

/** @internal */
export interface EntityManagerOptions {
  readonly storage: DurableObjectStorage
  readonly address: EntityAddress.EntityAddress
  readonly entityName: string
  readonly keepAlive: EntityKeepAlive
  readonly waitUntil: (effect: Effect.Effect<unknown>) => void
  readonly getNamespace: () => {
    readonly getByName: (name: string) => {
      readonly deliverReply: (requestId: string, reply: string) => Promise<boolean>
    }
  } | undefined
}

/** @internal */
export interface EntityManager {
  readonly invoke: (
    envelopeText: string,
    discard: boolean,
    delivery?: DeliveryOptions | undefined
  ) => Effect.Effect<InvokeResult>
  readonly acknowledge: (requestId: string, replyId: string) => Effect.Effect<ReadonlyArray<string>>
  readonly interrupt: (storageRequestId: string, clientRequestId?: string) => Effect.Effect<void>
  readonly reset: (requestId: string) => Effect.Effect<void>
  readonly alarm: Effect.Effect<void>
  readonly deliverReply: (requestId: string, reply: string) => Effect.Effect<boolean>
}

const success = (requestId: string, replies: ReadonlyArray<string>): InvokeResult => ({
  _tag: "Success",
  requestId,
  replies
})

interface HandlerPermit {
  readonly acquire: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly pause: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

const unlimitedHandlerPermit: HandlerPermit = { acquire: identity, pause: identity }

/**
 * One permit per handler execution. `acquire` holds the permit for the whole
 * run; `pause` gives it back while a chunk is parked on its client
 * acknowledgement so an unacked stream cannot starve other handlers. The
 * `held` flag keeps take/release balanced when interruption lands inside a
 * paused section: a pause that never re-acquires leaves `held` false, and
 * `acquire` then skips its release.
 */
const makeHandlerPermit = (semaphore: Semaphore.Semaphore | undefined): HandlerPermit => {
  if (semaphore === undefined) return unlimitedHandlerPermit
  let held = false
  return {
    acquire: (effect) =>
      Effect.uninterruptibleMask((restore) =>
        restore(Semaphore.take(semaphore, 1)).pipe(
          Effect.flatMap(() => {
            held = true
            return restore(effect)
          }),
          Effect.onExit(() =>
            Effect.suspend(() => {
              if (!held) return Effect.void
              held = false
              return Effect.asVoid(Semaphore.release(semaphore, 1))
            })
          )
        )
      ),
    pause: (effect) =>
      Effect.uninterruptibleMask((restore) =>
        Effect.suspend(() => {
          if (!held) return restore(effect)
          held = false
          return Semaphore.release(semaphore, 1).pipe(
            Effect.flatMap(() => restore(effect)),
            Effect.flatMap((value) =>
              Effect.map(restore(Semaphore.take(semaphore, 1)), () => {
                held = true
                return value
              })
            )
          )
        })
      )
  }
}

/**
 * The Effect-land state machine behind one `ClusterEntity` Durable Object.
 * The class methods are one-line `Effect.runPromise` adapters over the
 * effects returned here; all serialization, sessions, and waiters live in
 * Effect primitives.
 *
 * @internal
 */
export const makeEntityManager = (options: EntityManagerOptions): EntityManager => {
  const storage = options.storage
  const sql = storage.sql
  // Serializes storage entry: envelope decode, persist-before-run, dedupe,
  // duplicate resume, and alarm arming. Handler execution runs in forked
  // fibers governed by the handler concurrency semaphore below.
  const semaphore = Semaphore.makeUnsafe(1)
  const sessions = new Map<string, Session>()
  // Persisted discard/scheduled requests with an in-flight handler; guards
  // against a second execution from replay or duplicate delivery in the same
  // wake, the way `sessions` does for asks.
  const pendingRuns = new Set<string>()
  const workerWaiters = new Map<string, Array<WorkerWaiter>>()
  const replyRegistry = makeReplyRegistry()
  let runtime: EntityRuntime | undefined

  const getRuntime = (registration: EntityRegistration): Effect.Effect<EntityRuntime> =>
    runtime !== undefined ? Effect.succeed(runtime) : Effect.map(
      makeEntityRuntime(
        registration,
        options.address,
        () => crypto.randomUUID(),
        options.entityName,
        options.keepAlive.update,
        replyRegistry
      ),
      (built) => runtime = built
    )

  const armEarliestAlarm = Effect.suspend(() => {
    const deliverAt = earliestDeliverAt(sql)
    return deliverAt === undefined ? Effect.void : armAlarm(storage, deliverAt)
  })

  const takeReply = (requestId: string, session: Session): Effect.Effect<ReadonlyArray<string>> =>
    Queue.take(session.queue).pipe(
      Effect.map((reply) => {
        if (reply.terminal) sessions.delete(requestId)
        return [reply.text]
      }),
      Pull.catchDone(() => Effect.succeed([]))
    )

  const deliverScheduledReply = (
    requestId: string,
    reply: string,
    replyTos: ReadonlyArray<string> | undefined
  ): Effect.Effect<void> =>
    Effect.suspend(() => {
      const waiters = workerWaiters.get(requestId)
      if (waiters !== undefined) {
        workerWaiters.delete(requestId)
        for (const waiter of waiters) {
          Deferred.doneUnsafe(waiter.deferred, Effect.succeed(success(requestId, [reply])))
        }
      }
      if (replyTos === undefined) return Effect.void
      const namespace = options.getNamespace()
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
        { concurrency: "unbounded", discard: true }
      )
    })

  // Runs one request under the entry permit up to forking its handler fiber,
  // then returns a continuation that awaits the handler output. Callers run
  // the continuation after the entry permit is released so handlers governed
  // by the concurrency semaphore can interleave with later storage entries.
  const run = Effect.fnUntraced(function*(
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    envelope: Envelope.Request.Any,
    lastSentChunkText: string | undefined,
    discard: boolean,
    persisted: boolean,
    runOptions?: RunOptions
  ) {
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
    let lastSentChunk = Option.none<Reply.Chunk<any>>()
    if (lastSentChunkText !== undefined) {
      const reply = yield* decodeReplyFor(rpc, registration.context, lastSentChunkText)
      if (reply._tag === "Chunk") lastSentChunk = Option.some(reply)
    }
    const requestId = String(envelope.requestId)
    if (!discard) {
      const active = sessions.get(requestId)
      if (active !== undefined) {
        const nextReply = persisted ? loadNextReply(sql, requestId) : undefined
        return Effect.succeed(nextReply === undefined ? [] : [nextReply.reply])
      }
    }

    const scheduled = runOptions?.scheduled === true
    if (discard || scheduled) {
      if (persisted) {
        if (pendingRuns.has(requestId)) return Effect.succeed([])
        pendingRuns.add(requestId)
      }
      // No stream acks on this path, so a plain permit is enough.
      const execute = entityRuntime.run(envelope, lastSentChunk, discard, (reply) =>
        Effect.gen(function*() {
          const encoded = yield* encodeReplyFor(registration, rpc, reply)
          if (persisted) {
            storage.transactionSync(() => saveReply(sql, encoded))
          }
          if (scheduled && reply._tag === "WithExit") {
            yield* deliverScheduledReply(requestId, encoded, runOptions?.replyTos)
          }
        }))
      const fiber = yield* Effect.forkDetach(
        (entityRuntime.handlerSemaphore === undefined
          ? execute
          : Semaphore.withPermit(entityRuntime.handlerSemaphore, execute)).pipe(
            Effect.onExit((exit) =>
              Effect.sync(() => {
                if (!persisted) return
                if (discard && Exit.isSuccess(exit)) completeTell(sql, requestId)
                pendingRuns.delete(requestId)
              })
            )
          )
      )
      options.waitUntil(Fiber.await(fiber))
      return Effect.as(Fiber.join(fiber), [])
    }

    const queue = yield* Queue.make<SessionReply, Cause.Done>()
    const completeInterrupt = persisted
      ? Effect.flatMap(
        encodeReplyFor(
          registration,
          rpc,
          new Reply.WithExit({
            requestId: envelope.requestId,
            id: crypto.randomUUID() as any,
            exit: Exit.interrupt()
          })
        ),
        (reply) =>
          Effect.sync(() =>
            storage.transactionSync(() => {
              clearReplies(sql, requestId)
              saveReply(sql, reply)
            })
          )
      )
      : Effect.void
    const session: Session = { queue, completeInterrupt, ack: undefined, fiber: undefined }
    sessions.set(requestId, session)
    const permit = makeHandlerPermit(entityRuntime.handlerSemaphore)
    const respond = (reply: Reply.Reply<any>) =>
      Effect.gen(function*() {
        const encoded = yield* encodeReplyFor(registration, rpc, reply)
        if (persisted) {
          storage.transactionSync(() => saveReply(sql, encoded))
        }
        if (reply._tag === "Chunk") {
          const acknowledged = Deferred.makeUnsafe<void>()
          session.ack = { replyId: String(reply.id), deferred: acknowledged }
          // A false offer means the session was interrupted and the queue
          // ended; awaiting the acknowledgement would then never resume.
          const offered = yield* Queue.offer(queue, { text: encoded, terminal: false })
          if (offered) yield* permit.pause(Deferred.await(acknowledged))
          else session.ack = undefined
        } else {
          yield* Queue.offer(queue, { text: encoded, terminal: true })
        }
      })
    session.fiber = yield* Effect.forkDetach(
      permit.acquire(entityRuntime.run(envelope, lastSentChunk, discard, respond)).pipe(
        Effect.onExit((exit) =>
          Effect.sync(() => {
            if (Exit.isSuccess(exit)) Queue.endUnsafe(queue)
            else Queue.failCauseUnsafe(queue, exit.cause)
            if (Queue.sizeUnsafe(queue) === 0 && session.ack === undefined) {
              sessions.delete(requestId)
            }
          })
        )
      )
    )
    options.waitUntil(Fiber.await(session.fiber))
    return takeReply(requestId, session)
  })

  const runStored = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    envelopeText: string,
    lastSentChunk: string | undefined,
    discard: boolean,
    runOptions?: RunOptions
  ) =>
    Effect.flatMap(
      decodeRequest(registration, envelopeText),
      (envelope) => run(registration, entityRuntime, envelope, lastSentChunk, discard, true, runOptions)
    )

  const completeReplayFailure = (
    registration: EntityRegistration,
    row: StoredMessage,
    cause: Cause.Cause<unknown>
  ): Effect.Effect<void> =>
    Effect.suspend(() => peekEnvelopeTag(row.envelope)).pipe(
      Effect.flatMap((tag) => {
        if (row.discard || tag === undefined) {
          completeTell(sql, row.requestId)
          return Effect.void
        }
        const rpc = registration.entity.protocol.requests.get(tag) as Rpc.AnyWithProps | undefined
        if (rpc === undefined) {
          completeTell(sql, row.requestId)
          return Effect.void
        }
        return Effect.flatMap(
          encodeReplyFor(
            registration,
            rpc,
            new Reply.WithExit({
              requestId: row.requestId as any,
              id: crypto.randomUUID() as any,
              exit: Exit.failCause(cause)
            })
          ),
          (reply) =>
            Effect.sync(() => storage.transactionSync(() => saveReply(sql, reply))).pipe(
              Effect.andThen(deliverScheduledReply(row.requestId, reply, row.replyTos))
            )
        ).pipe(
          Effect.catchCause(() =>
            Effect.sync(() => {
              completeTell(sql, row.requestId)
            })
          )
        )
      })
    )

  // Phase one runs each row up to forking its handler under the entry
  // permit; the returned fibers observe the handler output and route
  // failures through `completeReplayFailure`.
  const replayRows = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    rows: ReadonlyArray<StoredMessage>
  ): Effect.Effect<Array<Fiber.Fiber<void>>> =>
    rows.length === 0 ? Effect.succeed([]) : Effect.forEach(
      rows,
      (row) =>
        // An active session or in-flight run already owns this request;
        // replaying it would start a second execution in the same wake.
        sessions.has(row.requestId) || pendingRuns.has(row.requestId) ? Effect.succeed(undefined) : runStored(
          registration,
          entityRuntime,
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
          Effect.flatMap((continuation) =>
            Effect.forkDetach(
              Effect.catchCause(
                Effect.asVoid(continuation),
                (cause) => completeReplayFailure(registration, row, cause)
              )
            )
          ),
          Effect.catchCause((cause) => Effect.as(completeReplayFailure(registration, row, cause), undefined))
        )
    ).pipe(
      Effect.map((fibers) => fibers.filter((fiber) => fiber !== undefined)),
      Effect.tap((fibers) =>
        Effect.sync(() => {
          if (fibers.length > 0) options.waitUntil(Fiber.awaitAll(fibers))
        })
      )
    )

  // Registers the waiter eagerly (under the entry permit) and returns the
  // await for the caller to run once the permit is released.
  const delayedOutcome = (
    requestId: string,
    discard: boolean,
    replyTo: string | undefined,
    clientRequestId = requestId
  ): Effect.Effect<InvokeResult> => {
    if (discard || replyTo !== undefined) return Effect.succeed(success(requestId, []))
    const deferred = Deferred.makeUnsafe<InvokeResult>()
    const waiters = workerWaiters.get(requestId) ?? []
    waiters.push({ clientRequestId, deferred })
    workerWaiters.set(requestId, waiters)
    return Deferred.await(deferred)
  }

  // Runs the storage entry under the caller-held permit and returns the
  // effect that produces the invoke result after the permit is released.
  const invokeEntry = (
    envelopeText: string,
    discard: boolean,
    delivery: DeliveryOptions | undefined
  ): Effect.Effect<Effect.Effect<InvokeResult>> => {
    const registration = getEntityRegistration(options.address.entityType)
    if (registration === undefined) {
      return Effect.die(`No handlers registered for entity type: ${options.address.entityType}`)
    }
    return Effect.gen(function*() {
      const entityRuntime = yield* getRuntime(registration)
      const replayFibers = yield* replayRows(registration, entityRuntime, loadUnprocessed(sql))
      // Preserves the pre-split ordering: the invoke result is delivered
      // only after the replayed rows this entry kicked off have finished.
      const finish = (
        requestId: string,
        continuation: Effect.Effect<ReadonlyArray<string>>
      ): Effect.Effect<InvokeResult> =>
        Effect.andThen(Fiber.awaitAll(replayFibers), continuation).pipe(
          Effect.map((replies) => success(requestId, replies))
        )

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (!isPersisted) {
        const continuation = yield* run(registration, entityRuntime, envelope, undefined, discard, false)
        return finish(String(envelope.requestId), continuation)
      }

      const persistedResult = yield* Effect.result(
        // Preserve unknown thrown values so the fallback defect is unchanged.
        // @effect-diagnostics-next-line unknownInEffectCatch:off
        Effect.try({
          try: () =>
            storage.transactionSync(() =>
              persistRequest(
                sql,
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
              entityId: String(options.address.entityId),
              rpc: envelope.tag
            }
          }, { captureStackTrace: false }),
          Effect.provideContext(registration.context)
        )
      )
      if (Result.isFailure(persistedResult)) {
        const error = persistedResult.failure
        if (error instanceof MailboxFullError) {
          return Effect.succeed<InvokeResult>({ _tag: "MailboxFull" })
        } else if (error instanceof EncodedMessageTooLargeError) {
          return Effect.succeed<InvokeResult>({ _tag: "EncodedMessageTooLarge" })
        }
        return yield* Effect.die(error)
      }
      const persisted: PersistResult = persistedResult.success
      if (persisted._tag === "Duplicate") {
        const original = loadMessage(sql, persisted.originalId)
        if (original === undefined) return yield* Effect.die("Duplicate mailbox row disappeared")
        if (original.discard && !discard) {
          return Effect.succeed<InvokeResult>({ _tag: "AskDeduplicatedToTell" })
        }
        const nextReply = loadNextReply(sql, persisted.originalId)
        if (nextReply !== undefined) {
          if (nextReply.kind === "WithExit") sessions.delete(persisted.originalId)
          return Effect.succeed(success(persisted.originalId, [nextReply.reply]))
        }
        if (persisted.processed) {
          return Effect.succeed(success(persisted.originalId, []))
        }
        if (
          delivery?.deliverAt !== undefined ||
          (original.deliverAt !== undefined && original.deliverAt > Date.now())
        ) {
          yield* armEarliestAlarm
          return delayedOutcome(
            persisted.originalId,
            discard,
            delivery?.replyTo,
            String(envelope.requestId)
          )
        }
        const continuation = yield* runStored(
          registration,
          entityRuntime,
          original.envelope,
          original.lastSentChunk,
          original.discard
        )
        return finish(persisted.originalId, continuation)
      }
      if (delivery?.deliverAt !== undefined) {
        yield* armEarliestAlarm
        return delayedOutcome(String(envelope.requestId), discard, delivery.replyTo)
      }
      const continuation = yield* run(registration, entityRuntime, envelope, undefined, discard, true)
      return finish(String(envelope.requestId), continuation)
    })
  }

  const invoke = (
    envelopeText: string,
    discard: boolean,
    delivery?: DeliveryOptions | undefined
  ): Effect.Effect<InvokeResult> =>
    Effect.flatten(Semaphore.withPermit(semaphore, invokeEntry(envelopeText, discard, delivery)))

  const acknowledge = (requestId: string, replyId: string): Effect.Effect<ReadonlyArray<string>> =>
    Effect.suspend(() => {
      storage.transactionSync(() => ackChunk(sql, requestId, replyId))
      const session = sessions.get(requestId)
      if (session?.ack?.replyId === replyId) {
        const acknowledged = session.ack.deferred
        session.ack = undefined
        Deferred.doneUnsafe(acknowledged, Effect.void)
        return takeReply(requestId, session)
      }
      const nextReply = loadNextReply(sql, requestId)
      return Effect.succeed(nextReply === undefined ? [] : [nextReply.reply])
    })

  const interrupt = (storageRequestId: string, clientRequestId = storageRequestId): Effect.Effect<void> =>
    Effect.suspend(() => {
      const waiters = workerWaiters.get(storageRequestId)
      if (waiters !== undefined) {
        const remaining = waiters.filter((waiter) => {
          if (waiter.clientRequestId !== clientRequestId) return true
          Deferred.doneUnsafe(waiter.deferred, Effect.die(new Error("Delayed entity request interrupted")))
          return false
        })
        if (remaining.length === 0) workerWaiters.delete(storageRequestId)
        else workerWaiters.set(storageRequestId, remaining)
      }
      const session = sessions.get(storageRequestId)
      if (session === undefined) return Effect.void
      sessions.delete(storageRequestId)
      if (session.ack !== undefined) {
        Deferred.doneUnsafe(session.ack.deferred, Effect.void)
        session.ack = undefined
      }
      Queue.endUnsafe(session.queue)
      const stop = session.fiber === undefined ? Effect.void : Effect.asVoid(Fiber.interrupt(session.fiber))
      return Effect.andThen(stop, session.completeInterrupt)
    })

  const reset = (requestId: string): Effect.Effect<void> =>
    Effect.sync(() => {
      storage.transactionSync(() => clearReplies(sql, requestId))
    })

  const alarm = Effect.suspend(() => {
    const registration = getEntityRegistration(options.address.entityType)
    if (registration === undefined) {
      return Effect.die(`No handlers registered for entity type: ${options.address.entityType}`)
    }
    // The entry permit covers replay setup and alarm arming; awaiting the
    // due handlers happens between the two so they can draw handler permits
    // while later invokes still enter storage.
    return Semaphore.withPermit(
      semaphore,
      Effect.flatMap(
        getRuntime(registration),
        (entityRuntime) => replayRows(registration, entityRuntime, loadDue(sql))
      )
    ).pipe(
      Effect.flatMap((fibers) => Effect.asVoid(Fiber.awaitAll(fibers))),
      Effect.andThen(Semaphore.withPermit(semaphore, armEarliestAlarm)),
      Effect.withSpan("CloudflareCluster.alarm", {
        attributes: {
          entityType: registration.entity.type,
          entityId: String(options.address.entityId)
        }
      }, { captureStackTrace: false }),
      Effect.provideContext(registration.context)
    )
  })

  const deliverReply = (requestId: string, reply: string): Effect.Effect<boolean> =>
    Effect.sync(() => replyRegistry.deliver(requestId, reply))

  return { invoke, acknowledge, interrupt, reset, alarm, deliverReply }
}
