/** @internal */
import type { DurableObjectStorage } from "@cloudflare/workers-types"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
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
  const metricContext = Context.merge(
    registration.context,
    Metric.CurrentMetricAttributes.context({ type: registration.entity.type })
  )

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

  const getHandlers = Effect.fnUntraced(function*() {
    if (cached !== undefined) return cached
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
    const handlers = yield* Effect.provideContext(registration.build, context)
    ClusterMetrics.entities.modifyUnsafe(BigInt(1), metricContext)
    return cached = { handlers, context, scope }
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

  return { run, invalidate } as const
})

type EntityRuntime = Effect.Success<ReturnType<typeof makeEntityRuntime>>

interface SessionReply {
  readonly text: string
  readonly terminal: boolean
}

interface Session {
  readonly queue: Queue.Queue<SessionReply, Cause.Done>
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

type InvokeOutcome = {
  readonly _tag: "Done"
  readonly result: InvokeResult
} | {
  readonly _tag: "Wait"
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

const done = (result: InvokeResult): InvokeOutcome => ({ _tag: "Done", result })

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
  // Serializes invoke/alarm entry, matching single-threaded mailbox order.
  const semaphore = Semaphore.makeUnsafe(1)
  const sessions = new Map<string, Session>()
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
        return nextReply === undefined ? [] : [nextReply.reply]
      }
    }

    const scheduled = runOptions?.scheduled === true
    if (discard || scheduled) {
      yield* entityRuntime.run(envelope, lastSentChunk, discard, (reply) =>
        Effect.gen(function*() {
          const encoded = yield* encodeReplyFor(registration, rpc, reply)
          if (persisted) {
            storage.transactionSync(() => saveReply(sql, encoded))
          }
          if (scheduled && reply._tag === "WithExit") {
            yield* deliverScheduledReply(requestId, encoded, runOptions?.replyTos)
          }
        }))
      if (discard && persisted) completeTell(sql, requestId)
      return []
    }

    const queue = yield* Queue.make<SessionReply, Cause.Done>()
    const session: Session = { queue, ack: undefined, fiber: undefined }
    sessions.set(requestId, session)
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
          if (offered) yield* Deferred.await(acknowledged)
          else session.ack = undefined
        } else {
          yield* Queue.offer(queue, { text: encoded, terminal: true })
        }
      })
    session.fiber = yield* Effect.forkDetach(
      entityRuntime.run(envelope, lastSentChunk, discard, respond).pipe(
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
    return yield* takeReply(requestId, session)
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

  const replayRows = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    rows: ReadonlyArray<StoredMessage>
  ): Effect.Effect<void> =>
    Effect.forEach(
      rows,
      (row) =>
        // An active session already owns this request; replaying it would only
        // decode the envelope to hit the same-session early return.
        sessions.has(row.requestId) ? Effect.void : runStored(
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
          Effect.catchCause((cause) => completeReplayFailure(registration, row, cause))
        ),
      { discard: true }
    )

  const delayedOutcome = (
    requestId: string,
    discard: boolean,
    replyTo: string | undefined,
    clientRequestId = requestId
  ): InvokeOutcome => {
    if (discard || replyTo !== undefined) return done(success(requestId, []))
    const deferred = Deferred.makeUnsafe<InvokeResult>()
    const waiters = workerWaiters.get(requestId) ?? []
    waiters.push({ clientRequestId, deferred })
    workerWaiters.set(requestId, waiters)
    return { _tag: "Wait", deferred }
  }

  const invokeEntry = (
    envelopeText: string,
    discard: boolean,
    delivery: DeliveryOptions | undefined
  ): Effect.Effect<InvokeOutcome> => {
    const registration = getEntityRegistration(options.address.entityType)
    if (registration === undefined) {
      return Effect.die(`No handlers registered for entity type: ${options.address.entityType}`)
    }
    return Effect.gen(function*() {
      const entityRuntime = yield* getRuntime(registration)
      yield* replayRows(registration, entityRuntime, loadUnprocessed(sql))

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      const isPersisted = Context.get(rpc.annotations, Persisted)
      if (!isPersisted) {
        const replies = yield* run(registration, entityRuntime, envelope, undefined, discard, false)
        return done(success(String(envelope.requestId), replies))
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
          return done({ _tag: "MailboxFull" })
        } else if (error instanceof EncodedMessageTooLargeError) {
          return done({ _tag: "EncodedMessageTooLarge" })
        }
        return yield* Effect.die(error)
      }
      const persisted: PersistResult = persistedResult.success
      if (persisted._tag === "Duplicate") {
        const original = loadMessage(sql, persisted.originalId)
        if (original === undefined) return yield* Effect.die("Duplicate mailbox row disappeared")
        if (original.discard && !discard) {
          return done({ _tag: "AskDeduplicatedToTell" })
        }
        const nextReply = loadNextReply(sql, persisted.originalId)
        if (nextReply !== undefined) {
          if (nextReply.kind === "WithExit") sessions.delete(persisted.originalId)
          return done(success(persisted.originalId, [nextReply.reply]))
        }
        if (persisted.processed) {
          return done(success(persisted.originalId, []))
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
        const replies = yield* runStored(
          registration,
          entityRuntime,
          original.envelope,
          original.lastSentChunk,
          original.discard
        )
        return done(success(persisted.originalId, replies))
      }
      if (delivery?.deliverAt !== undefined) {
        yield* armEarliestAlarm
        return delayedOutcome(String(envelope.requestId), discard, delivery.replyTo)
      }
      const replies = yield* run(registration, entityRuntime, envelope, undefined, discard, true)
      return done(success(String(envelope.requestId), replies))
    })
  }

  const invoke = (
    envelopeText: string,
    discard: boolean,
    delivery?: DeliveryOptions | undefined
  ): Effect.Effect<InvokeResult> =>
    Semaphore.withPermit(semaphore, invokeEntry(envelopeText, discard, delivery)).pipe(
      Effect.flatMap((outcome) =>
        outcome._tag === "Done" ? Effect.succeed(outcome.result) : Deferred.await(outcome.deferred)
      )
    )

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
      return session.fiber === undefined ? Effect.void : Fiber.interrupt(session.fiber)
    })

  const reset = (requestId: string): Effect.Effect<void> =>
    Effect.sync(() => {
      storage.transactionSync(() => clearReplies(sql, requestId))
    })

  const alarm = Semaphore.withPermit(
    semaphore,
    Effect.suspend(() => {
      const registration = getEntityRegistration(options.address.entityType)
      if (registration === undefined) {
        return Effect.die(`No handlers registered for entity type: ${options.address.entityType}`)
      }
      return Effect.gen(function*() {
        const entityRuntime = yield* getRuntime(registration)
        yield* replayRows(registration, entityRuntime, loadDue(sql))
        yield* armEarliestAlarm
      }).pipe(
        Effect.withSpan("CloudflareCluster.alarm", {
          attributes: {
            entityType: registration.entity.type,
            entityId: String(options.address.entityId)
          }
        }, { captureStackTrace: false }),
        Effect.provideContext(registration.context)
      )
    })
  )

  const deliverReply = (requestId: string, reply: string): Effect.Effect<boolean> =>
    Effect.sync(() => replyRegistry.deliver(requestId, reply))

  return { invoke, acknowledge, interrupt, reset, alarm, deliverReply }
}
