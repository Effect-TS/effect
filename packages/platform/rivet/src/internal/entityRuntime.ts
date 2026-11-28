/**
 * The entity runtime behind one `clusterEntity` actor, ported from
 * `@effect/platform-cloudflare`'s `internal/entityRuntime.ts`.
 *
 * Kept from the Cloudflare runtime: handler builds per wake, the RpcServer
 * request path, defect retry and rebuild, the handler concurrency permit, the
 * storage entry permit, sessions for running asks, replay of unprocessed rows
 * and deduplication on the primary key.
 *
 * Not ported in this prototype: `DeliverAt`, `Entity.keepAlive`, stream
 * replies and their acknowledgements, scheduled reply push, and the entity
 * `SqlClient`. Stream RPCs are rejected at invoke.
 *
 * @internal
 */
import * as Cause from "effect/Cause"
import * as ClusterMetrics from "effect/cluster/ClusterMetrics"
import { isUninterruptibleForServer, Persisted, WithTransaction } from "effect/cluster/ClusterSchema"
import { CurrentAddress, CurrentRunnerAddress, Request } from "effect/cluster/Entity"
import * as EntityAddress from "effect/cluster/EntityAddress"
import * as EntityId from "effect/cluster/EntityId"
import * as EntityType from "effect/cluster/EntityType"
import * as Envelope from "effect/cluster/Envelope"
import * as Reply from "effect/cluster/Reply"
import * as RunnerAddress from "effect/cluster/RunnerAddress"
import * as ShardId from "effect/cluster/ShardId"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcMessage from "effect/rpc/RpcMessage"
import * as RpcSchema from "effect/rpc/RpcSchema"
import * as RpcServer from "effect/rpc/RpcServer"
import type * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import {
  clearReplies,
  completeTell,
  countUnprocessed,
  isProcessed,
  loadMessage,
  loadReply,
  loadUnprocessed,
  loadUnprocessedIds,
  persistRequest,
  type PersistResult,
  saveReply,
  type StoredMessage
} from "./entityMailbox.ts"
import { type EntityRegistration, getEntityRegistration } from "./entityRegistry.ts"
import { CurrentEntityDatabase, type EntityDatabase, type SqlExecutor } from "./entityStorage.ts"
import { decodeRequest, encodeReplyFor, type EntityInvokeResult, peekEnvelopeTag } from "./entityWire.ts"

interface CachedHandlers {
  readonly handlers: Record<string, (request: any) => any>
  readonly context: Context.Context<never>
  readonly scope: Scope.Closeable
  readonly server: ServerHandle
}

// A build's `RpcServer`. It outlives a defect rebuild so requests already
// running on it finish there; once retired, it closes when the last request
// holding a lease on it ends.
interface ServerHandle {
  readonly server: RpcServer.RpcServer<any>
  readonly scope: Scope.Closeable
  leases: number
  retired: boolean
  closed: boolean
}

// One request written to the wake's `RpcServer`. A defect retry writes a new
// server request, so ids are never reused while a previous fiber unwinds.
interface ServerRequest {
  readonly envelope: Envelope.Request.Any
  readonly discard: boolean
  readonly exit: Deferred.Deferred<Exit.Exit<unknown, unknown>>
  // Completes once the server's request effect, including its request scope,
  // has finished.
  readonly finished: Deferred.Deferred<void>
  // Set for a persisted `WithTransaction` request, whose server request
  // effect runs inside one actor SQLite transaction.
  readonly transaction: HandlerTransaction | undefined
  started: boolean
  interrupted: boolean
  fork: boolean
  // The handler exit as the server reported it, read inside the transaction.
  reported: Exit.Exit<unknown, unknown> | undefined
  // The encoded reply the handler transaction saved, valid once it commits.
  committedReply: string | undefined
  // Set when the handler transaction failed in storage, so its commit is
  // unknown: only the durable rows say whether the reply and writes landed.
  commitFailure: Cause.Cause<unknown> | undefined
}

interface HandlerTransaction {
  readonly rpc: Rpc.AnyWithProps
  readonly replyId: string
}

class TransactionRollback {
  readonly _tag = "TransactionRollback"
}

/**
 * The defect a persisted `WithTransaction` request dies with when its handler
 * transaction did not commit. The request stays unprocessed for a retry or the
 * next drain.
 *
 * @internal
 */
export class UncommittedTransaction extends Error {
  constructor(cause: Cause.Cause<unknown>) {
    super("RivetCluster: the handler transaction did not commit", { cause: Cause.squash(cause) })
  }
}

const isUncommitted = (cause: Cause.Cause<unknown>) =>
  cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect instanceof UncommittedTransaction)

// How a run answers an ask: `reply` saves a reply and answers with it;
// `stored` answers with a reply that is already durable. A tell has none.
interface Responder {
  readonly reply: (reply: Reply.WithExit<any>) => Effect.Effect<void>
  readonly stored: (encoded: string) => Effect.Effect<void>
}

/** @internal */
export const makeEntityRuntime = Effect.fnUntraced(function*(
  registration: EntityRegistration,
  address: EntityAddress.EntityAddress,
  database: EntityDatabase
) {
  let cached: CachedHandlers | undefined
  let building: Deferred.Deferred<CachedHandlers> | undefined
  const metricContext = Context.merge(
    registration.context,
    Metric.CurrentMetricAttributes.context({ type: registration.entity.type })
  )
  const concurrency = registration.options?.concurrency ?? 1
  const handlerSemaphore = concurrency === "unbounded" ? undefined : Semaphore.makeUnsafe(concurrency)

  const serverRequests = new Map<number, ServerRequest>()
  let nextServerRequestId = 0
  let writing: ServerRequest | undefined

  const onFromServer = (response: RpcMessage.FromServer<any>): Effect.Effect<void> => {
    switch (response._tag) {
      case "Exit": {
        const request = serverRequests.get(Number(response.requestId))
        if (request !== undefined) {
          request.reported = response.exit
          Deferred.doneUnsafe(request.exit, Effect.succeed(response.exit))
        }
        return Effect.void
      }
      case "Defect": {
        if (writing !== undefined) Deferred.doneUnsafe(writing.exit, Effect.succeed(Exit.die(response.defect)))
        return Effect.void
      }
      default:
        return Effect.void
    }
  }

  const closeIfDrained = (handle: ServerHandle): Effect.Effect<void> =>
    Effect.suspend(() => {
      if (!handle.retired || handle.leases > 0 || handle.closed) return Effect.void
      handle.closed = true
      return Scope.close(handle.scope, Exit.void)
    })

  const invalidate = Effect.fnUntraced(function*() {
    if (cached === undefined) return
    const scope = cached.scope
    const server = cached.server
    cached = undefined
    server.retired = true
    yield* closeIfDrained(server)
    yield* Scope.close(scope, Exit.void).pipe(
      Effect.ensuring(Effect.sync(() => {
        ClusterMetrics.entities.modifyUnsafe(BigInt(-1), metricContext)
      }))
    )
  })

  const buildHandlers = Effect.fnUntraced(function*() {
    const scope = yield* Scope.make()
    const context = registration.context.pipe(
      Context.add(CurrentAddress, address),
      Context.add(CurrentRunnerAddress, RunnerAddress.make(`${address.entityType}/${address.entityId}`, 0)),
      Context.add(CurrentEntityDatabase, database),
      Context.add(Scope.Scope, scope)
    )
    const { handlers, server } = yield* Effect.gen(function*() {
      const handlers = yield* Effect.provideContext(registration.build, context)
      const serverHandlers: Record<string, (payload: any, options: { readonly requestId: any }) => any> = {}
      for (const tag of Object.keys(handlers)) {
        const handler = handlers[tag]
        const rpc = registration.entity.protocol.requests.get(tag) as Rpc.AnyWithProps | undefined
        const transactional = rpc !== undefined && Context.get(rpc.annotations, Persisted) &&
          Context.get(rpc.annotations, WithTransaction)
        serverHandlers[tag] = (request, { requestId }) => {
          // RpcServer sends a `Deferred` reply after the effect wrapped by
          // `onRequest` ends, which is after the handler transaction. Settle it
          // inside, so the reply commits with the handler's writes.
          const result = transactional ? Rpc.wrapMap(handler(request), settleDeferred) : handler(request)
          if (Rpc.isWrapper(result as object) && (result as Rpc.Wrapper<unknown>).fork) {
            const pending = serverRequests.get(Number(requestId))
            if (pending !== undefined) pending.fork = true
          }
          return result
        }
      }
      const handlersContext: Context.Context<never> = yield* Effect.provideContext(
        registration.entity.protocol.toHandlers(serverHandlers),
        context as Context.Context<any>
      )
      const serverScope = yield* Scope.make()
      const server = yield* (RpcServer.makeNoSerialization(registration.entity.protocol, {
        onFromServer,
        concurrency: "unbounded",
        disableTracing: true,
        disableClientAcks: true,
        disableFatalDefects: true
      }) as Effect.Effect<RpcServer.RpcServer<any>, never, Scope.Scope>).pipe(
        Effect.provideContext(Context.add(Context.merge(context, handlersContext), Scope.Scope, serverScope))
      )
      const handle: ServerHandle = { server, scope: serverScope, leases: 0, retired: false, closed: false }
      return { handlers, server: handle }
    }).pipe(
      Effect.tapCause((cause) => Scope.close(scope, Exit.failCause(cause)))
    )
    ClusterMetrics.entities.modifyUnsafe(BigInt(1), metricContext)
    return { handlers, context, scope, server } satisfies CachedHandlers
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

  const leaseHandlers = (
    restore: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  ): Effect.Effect<CachedHandlers> =>
    Effect.flatMap(restore(getHandlers()), (entry) =>
      Effect.suspend(() => {
        if (entry.server.closed) return leaseHandlers(restore)
        entry.server.leases++
        return Effect.succeed(entry)
      }))

  const releaseLease = (entry: CachedHandlers): Effect.Effect<void> =>
    Effect.suspend(() => {
      entry.server.leases--
      return closeIfDrained(entry.server)
    })

  const rebuildAfterDefect = invalidate().pipe(
    Effect.andThen(Effect.catchCause(getHandlers(), () => Effect.void))
  )

  // Saves a success reply, or marks a tell processed, in the handler's own
  // transaction. Any other outcome rolls the transaction back, and the reply
  // is saved afterwards in its own.
  const runInTransaction = (
    request: ServerRequest,
    transaction: HandlerTransaction,
    effect: Effect.Effect<any, any, any>
  ): Effect.Effect<any, any, any> =>
    database.transaction("cluster_handler", (tx: SqlExecutor) =>
      Effect.gen(function*() {
        // The server reports the handler exit before the request effect ends,
        // and the effect fails with the handler's own failure. That is a
        // rollback, not a storage failure, so only `reported` decides.
        yield* Effect.exit(Effect.provideService(effect, CurrentEntityDatabase, tx) as Effect.Effect<unknown, unknown>)
        const exit = request.reported
        if (exit === undefined || Exit.isFailure(exit)) {
          return yield* Effect.fail(new TransactionRollback())
        }
        if (request.discard) {
          return yield* completeTell(tx, String(request.envelope.requestId))
        }
        const encoded = yield* encodeReplyFor(
          registration,
          transaction.rpc,
          new Reply.WithExit({
            requestId: request.envelope.requestId,
            id: transaction.replyId as any,
            exit: exit as any
          })
        )
        yield* Effect.orDie(saveReply(tx, encoded))
        request.committedReply = encoded
      })).pipe(
        Effect.catchIf((error) => error instanceof TransactionRollback, () => Effect.void),
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause) ? Effect.failCause(cause) : Effect.sync(() => {
            request.commitFailure = cause
            // A transaction that failed to begin never ran the handler, so the
            // server reports no exit for it.
            Deferred.doneUnsafe(request.exit, Effect.succeed(Exit.die(new UncommittedTransaction(cause))))
          })
        )
      )

  const runOnServer = (
    server: RpcServer.RpcServer<any>,
    request: ServerRequest,
    permit: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  ): Effect.Effect<unknown, unknown> => {
    const id = nextServerRequestId++
    const settled = Effect.flatMap(
      Deferred.await(request.exit),
      (exit) => request.started ? Effect.as(Deferred.await(request.finished), exit) : Effect.succeed(exit)
    )
    const onRequest = <X, E, R>(effect: Effect.Effect<X, E, R>): Effect.Effect<X, E, R> =>
      Effect.ensuring(
        Effect.suspend(() => {
          request.started = true
          if (request.interrupted) return Effect.interrupt
          const body = request.transaction === undefined
            ? effect
            : runInTransaction(request, request.transaction, effect)
          return request.fork ? body : permit(body)
        }),
        Effect.sync(() => Deferred.doneUnsafe(request.finished, Effect.void))
      )
    const write = Effect.suspend(() => {
      serverRequests.set(id, request)
      writing = request
      return server.write(0, {
        _tag: "Request",
        id: RpcMessage.RequestId(id),
        tag: request.envelope.tag,
        payload: new Request({ ...request.envelope, lastSentChunk: Option.none<Reply.Chunk<any>>() }),
        headers: request.envelope.headers
      }, { onRequest }).pipe(
        Effect.ensuring(Effect.sync(() => {
          writing = undefined
        }))
      )
    })
    return Effect.uninterruptibleMask((restore) =>
      Effect.andThen(
        write,
        Effect.onInterrupt(restore(settled), () =>
          Effect.suspend(() => {
            request.interrupted = true
            const stop = request.started
              ? server.write(0, { _tag: "Interrupt", requestId: RpcMessage.RequestId(id), interruptors: [] })
              : Effect.void
            return Effect.andThen(stop, settled)
          }))
      )
    ).pipe(
      Effect.flatten,
      Effect.ensuring(Effect.sync(() => serverRequests.delete(id)))
    )
  }

  const run = (
    envelope: Envelope.Request.Any,
    responder: Responder | undefined,
    persisted: boolean
  ): Effect.Effect<void> =>
    Effect.uninterruptibleMask((restore) =>
      Effect.flatMap(leaseHandlers(restore), (entry) =>
        Effect.ensuring(
          restore(runLeased(entry, envelope, responder, persisted)),
          releaseLease(entry)
        ))
    )

  const runLeased = Effect.fnUntraced(function*(
    entry: CachedHandlers,
    envelope: Envelope.Request.Any,
    responder: Responder | undefined,
    persisted: boolean
  ) {
    const discard = responder === undefined
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps | undefined
    const handler = entry.handlers[envelope.tag]
    if (rpc === undefined || handler === undefined) {
      if (responder !== undefined) {
        yield* responder.reply(
          new Reply.WithExit({
            requestId: envelope.requestId,
            id: crypto.randomUUID() as any,
            exit: Exit.die(`Unknown entity RPC tag: ${envelope.tag}`)
          })
        )
      }
      return
    }
    // A `WithTransaction` success reply is saved in the handler transaction;
    // after a rollback, `responder.reply` saves the failure in its own.
    const replyId = crypto.randomUUID()
    const transactional = persisted && Context.get(rpc.annotations, WithTransaction)
    const permit = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      handlerSemaphore === undefined ? effect : Semaphore.withPermit(handlerSemaphore, effect)

    let current: ServerRequest | undefined
    const execute = Effect.suspend(() => {
      const request: ServerRequest = {
        envelope,
        discard,
        exit: Deferred.makeUnsafe(),
        finished: Deferred.makeUnsafe(),
        transaction: transactional ? { rpc, replyId } : undefined,
        started: false,
        interrupted: false,
        fork: false,
        reported: undefined,
        committedReply: undefined,
        commitFailure: undefined
      }
      current = request
      return runOnServer(entry.server.server, request, permit)
    }).pipe(
      Effect.withSpan("RivetCluster.handler", {
        attributes: {
          entityType: registration.entity.type,
          entityId: String(address.entityId),
          rpc: envelope.tag
        }
      }, { captureStackTrace: false })
    )
    const exit = yield* Effect.provideContext(runWithDefectRetry(execute), entry.context)
    const commitFailure = current?.commitFailure
    if (commitFailure !== undefined) {
      // The commit may have landed with a lost acknowledgement. Answer only
      // from durable state; anything else leaves the row for a retry.
      const requestId = String(envelope.requestId)
      const durable = yield* Effect.catchCause(
        discard
          ? Effect.map(isProcessed(database, requestId), (processed) => processed ? "" : undefined)
          : loadReply(database, requestId),
        () => Effect.succeed(undefined)
      )
      if (durable === undefined) return yield* Effect.die(new UncommittedTransaction(commitFailure))
      if (responder !== undefined) yield* responder.stored(durable)
      return
    }
    const committedReply = current?.committedReply
    if (committedReply !== undefined) {
      if (responder !== undefined) yield* responder.stored(committedReply)
      return
    }
    if (responder !== undefined) {
      yield* responder.reply(
        new Reply.WithExit({
          requestId: envelope.requestId,
          id: replyId as any,
          exit: exit as any
        })
      )
    }
    if (Exit.isFailure(exit) && Cause.hasDies(exit.cause)) {
      yield* rebuildAfterDefect
    }
  })

  return { run, warm: Effect.asVoid(getHandlers()) } as const
})

type EntityRuntime = Effect.Success<ReturnType<typeof makeEntityRuntime>>

interface Session {
  readonly reply: Deferred.Deferred<string | undefined>
  readonly completeInterrupt: Effect.Effect<void>
  readonly uninterruptible: boolean
  cancelling: boolean
  fiber: Fiber.Fiber<void> | undefined
}

/** @internal */
export interface EntityManagerOptions {
  readonly database: EntityDatabase
  readonly address: EntityAddress.EntityAddress
  /**
   * Keeps the actor awake until the effect completes. Rivet does not wait for
   * in-flight actions at shutdown, so every handler run is registered here.
   */
  readonly keepAwake: (effect: Effect.Effect<unknown>) => void
  /**
   * Arms or removes the recurring schedule that wakes the actor to drain
   * unprocessed rows.
   */
  readonly setDrainSchedule: (armed: boolean) => Effect.Effect<void>
}

/** @internal */
export interface EntityManager {
  readonly invoke: (
    envelopeText: string,
    discard: boolean,
    primaryKey: string | null
  ) => Effect.Effect<EntityInvokeResult>
  readonly interrupt: (requestId: string) => Effect.Effect<void>
  /** Replays unprocessed rows and returns how many are still unprocessed. */
  readonly drain: Effect.Effect<number>
}

const settleDeferred = (result: object): object =>
  Effect.isEffect(result)
    ? Effect.flatMap(result, (value) => Deferred.isDeferred(value) ? Deferred.await(value) : Effect.succeed(value))
    : result

const success = (requestId: string, replies: ReadonlyArray<string>): EntityInvokeResult => ({
  _tag: "Success",
  requestId,
  replies
})

/**
 * The Effect-land state machine behind one `clusterEntity` actor.
 *
 * @internal
 */
export const makeEntityManager = (options: EntityManagerOptions): EntityManager => {
  // Each mailbox write is its own transaction. Rivet queues it behind any open
  // handler transaction, so a handler rollback cannot take a reply with it.
  const database = options.database
  // Serializes storage entry: envelope decode, persist-before-run, dedupe and
  // replay. Rivet has no input gate, so this permit and the SQLite transaction
  // queue are the only serialization on the actor.
  const semaphore = Semaphore.makeUnsafe(1)
  const sessions = new Map<string, Session>()
  // Persisted tells with an in-flight handler, guarding against a second
  // execution from replay or duplicate delivery in the same wake.
  const pendingRuns = new Set<string>()
  let inFlightPersisted = 0
  let drainArmed = false
  let runtime: EntityRuntime | undefined

  const getRuntime = (registration: EntityRegistration): Effect.Effect<EntityRuntime> =>
    runtime !== undefined ? Effect.succeed(runtime) : Effect.map(
      makeEntityRuntime(registration, options.address, database),
      (built) => runtime = built
    )

  const isRunning = (requestId: string) => sessions.has(requestId) || pendingRuns.has(requestId)

  const armDrain = Effect.suspend(() => {
    if (drainArmed) return Effect.void
    drainArmed = true
    return options.setDrainSchedule(true)
  })

  // Called under the entry permit once the last persisted handler finished.
  const disarmDrainIfEmpty = Effect.suspend(() =>
    Effect.flatMap(countUnprocessed(database), (pending) => {
      if (pending > 0) return armDrain
      drainArmed = false
      return options.setDrainSchedule(false)
    })
  )

  const startPersisted = Effect.suspend(() => ++inFlightPersisted === 1 ? armDrain : Effect.void)
  const finishPersisted = Effect.suspend(() => --inFlightPersisted === 0 ? disarmDrainIfEmpty : Effect.void)

  const removeSession = (requestId: string, session: Session) => {
    if (!session.cancelling && sessions.get(requestId) === session) sessions.delete(requestId)
  }

  // A failed reply save, such as a commit from an instance Rivet has fenced
  // off, leaves the row unprocessed for the current owner.
  const saveReplyLogged = (encoded: string): Effect.Effect<void> =>
    database.transaction("cluster_save_reply", (tx) => saveReply(tx, encoded)).pipe(
      Effect.tapCause((cause) => Effect.logWarning("RivetCluster: entity reply save failed", cause)),
      Effect.orDie
    )

  // Runs one request under the entry permit up to forking its handler fiber,
  // then returns a continuation that awaits the handler output.
  const run = Effect.fnUntraced(function*(
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    envelope: Envelope.Request.Any,
    discard: boolean,
    persisted: boolean
  ) {
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
    const requestId = String(envelope.requestId)
    if (!discard) {
      const active = sessions.get(requestId)
      if (active !== undefined) {
        const stored = persisted ? yield* loadReply(database, requestId) : undefined
        if (stored !== undefined) return Effect.succeed([stored])
        const fiber = active.fiber
        if (!persisted || fiber === undefined) return Effect.succeed([])
        return Effect.gen(function*() {
          const exit = yield* Fiber.await(fiber)
          const reply = yield* loadReply(database, requestId)
          if (reply !== undefined) return [reply]
          if (Exit.isFailure(exit)) return yield* Effect.failCause(exit.cause)
          return yield* Effect.die("Persisted unary handler finished without a reply")
        })
      }
    }

    if (discard) {
      if (persisted) {
        if (pendingRuns.has(requestId)) return Effect.succeed([])
        pendingRuns.add(requestId)
        yield* startPersisted
      }
      const fiber = yield* Effect.forkDetach(
        entityRuntime.run(envelope, undefined, persisted).pipe(
          Effect.onExit((exit) =>
            !persisted ? Effect.void : Semaphore.withPermit(
              semaphore,
              Effect.suspend(() => {
                pendingRuns.delete(requestId)
                return Exit.isSuccess(exit)
                  ? database.transaction("cluster_complete_tell", (tx) => completeTell(tx, requestId))
                  : Effect.void
              }).pipe(Effect.ensuring(finishPersisted))
            )
          )
        )
      )
      options.keepAwake(Fiber.await(fiber))
      return Effect.as(Fiber.join(fiber), [])
    }

    const reply = Deferred.makeUnsafe<string | undefined>()
    const completeInterrupt = persisted
      ? Effect.suspend(() =>
        encodeReplyFor(
          registration,
          rpc,
          new Reply.WithExit({
            requestId: envelope.requestId,
            id: crypto.randomUUID() as any,
            exit: Exit.interrupt()
          })
        )
      ).pipe(
        Effect.flatMap((encoded) =>
          Effect.orDie(
            // A reply that committed before the interrupt arrived stays: with
            // `WithTransaction`, the handler's writes committed with it.
            database.transaction("cluster_interrupt", (tx) =>
              Effect.flatMap(
                loadReply(tx, requestId),
                (stored) =>
                  stored !== undefined
                    ? Effect.void
                    : Effect.andThen(clearReplies(tx, requestId), saveReply(tx, encoded))
              ))
          )
        )
      )
      : Effect.void
    const session: Session = {
      reply,
      completeInterrupt,
      uninterruptible: isUninterruptibleForServer(rpc.annotations),
      cancelling: false,
      fiber: undefined
    }
    sessions.set(requestId, session)
    if (persisted) yield* startPersisted
    const respond = Effect.fnUntraced(function*(next: Reply.WithExit<any>) {
      const encoded = yield* encodeReplyFor(registration, rpc, next)
      if (persisted) yield* saveReplyLogged(encoded)
      Deferred.doneUnsafe(reply, Effect.succeed(encoded))
    })
    session.fiber = yield* Effect.forkDetach(
      entityRuntime.run(envelope, {
        reply: respond,
        stored: (encoded) => Effect.sync(() => Deferred.doneUnsafe(reply, Effect.succeed(encoded)))
      }, persisted).pipe(
        Effect.onExit((exit) => {
          const cleanup = Effect.sync(() => {
            Deferred.doneUnsafe(reply, Exit.isSuccess(exit) ? Effect.succeed(undefined) : Effect.failCause(exit.cause))
            removeSession(requestId, session)
          })
          return persisted
            ? Semaphore.withPermit(semaphore, Effect.andThen(cleanup, finishPersisted))
            : cleanup
        })
      )
    )
    options.keepAwake(Fiber.await(session.fiber))
    return Effect.map(Deferred.await(reply), (text) => text === undefined ? [] : [text])
  })

  const runStored = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    envelopeText: string,
    discard: boolean
  ) =>
    Effect.flatMap(
      decodeRequest(registration, envelopeText),
      (envelope) => run(registration, entityRuntime, envelope, discard, true)
    )

  const completeReplayFailure = (
    registration: EntityRegistration,
    row: StoredMessage,
    cause: Cause.Cause<unknown>
  ): Effect.Effect<void> =>
    Effect.suspend(() => peekEnvelopeTag(row.envelope)).pipe(
      Effect.flatMap((tag) => {
        const rpc = tag === undefined
          ? undefined
          : registration.entity.protocol.requests.get(tag) as Rpc.AnyWithProps | undefined
        if (row.discard || rpc === undefined) {
          return database.transaction("cluster_complete_tell", (tx) => completeTell(tx, row.requestId))
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
          (reply) => database.transaction("cluster_save_reply", (tx) => saveReply(tx, reply))
        ).pipe(
          Effect.catchCause(() =>
            database.transaction("cluster_complete_tell", (tx) => completeTell(tx, row.requestId))
          )
        )
      })
    )

  // Runs each unprocessed row up to forking its handler under the entry
  // permit; the returned fibers observe the handler output.
  const replayRows = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    rows: ReadonlyArray<StoredMessage>
  ): Effect.Effect<Array<Fiber.Fiber<void>>> =>
    rows.length === 0 ? Effect.succeed([]) : Effect.forEach(
      rows,
      (row) =>
        isRunning(row.requestId) ? Effect.succeed(undefined) : runStored(
          registration,
          entityRuntime,
          row.envelope,
          row.discard
        ).pipe(
          Effect.flatMap((continuation) =>
            Effect.forkDetach(
              Effect.catchCause(
                Effect.asVoid(continuation),
                // An uncommitted transaction leaves the row for the next drain.
                (cause) => isUncommitted(cause) ? Effect.void : completeReplayFailure(registration, row, cause)
              )
            )
          ),
          Effect.catchCause((cause) => Effect.as(completeReplayFailure(registration, row, cause), undefined))
        )
    ).pipe(
      Effect.map((entries) => entries.filter((entry) => entry !== undefined)),
      Effect.tap((entries) =>
        Effect.sync(() => {
          if (entries.length > 0) options.keepAwake(Fiber.awaitAll(entries))
        })
      )
    )

  const lookupRegistration = Effect.suspend(() => {
    const registration = getEntityRegistration(options.address.entityType)
    return registration === undefined
      ? Effect.die(`No handlers registered for entity type: ${options.address.entityType}`)
      : Effect.succeed(registration)
  })

  // Envelopes are loaded only when an unprocessed row has no handler in this
  // wake. Most unprocessed rows are in flight, and every invoke replays.
  const replayPending = (
    registration: EntityRegistration,
    entityRuntime: EntityRuntime,
    unprocessed: ReadonlyArray<string>
  ) =>
    unprocessed.every(isRunning)
      ? Effect.succeed([])
      : Effect.flatMap(loadUnprocessed(database), (rows) => replayRows(registration, entityRuntime, rows))

  const invokeEntry = (
    envelopeText: string,
    discard: boolean,
    primaryKey: string | null
  ): Effect.Effect<Effect.Effect<EntityInvokeResult>> =>
    Effect.gen(function*() {
      const registration = yield* lookupRegistration
      const entityRuntime = yield* getRuntime(registration)
      yield* replayPending(registration, entityRuntime, yield* loadUnprocessedIds(database))
      const finish = (
        requestId: string,
        continuation: Effect.Effect<ReadonlyArray<string>>
      ): Effect.Effect<EntityInvokeResult> => Effect.map(continuation, (replies) => success(requestId, replies))
      // A persisted tell does not pin its caller: the row is durable, so the
      // result is complete once the handler is forked.
      const finishTell = (
        requestId: string,
        continuation: Effect.Effect<ReadonlyArray<string>>
      ): Effect.Effect<Effect.Effect<EntityInvokeResult>> =>
        Effect.as(
          Effect.forkDetach(Effect.catchCause(
            Effect.asVoid(continuation),
            (cause) => Effect.logError("Entity tell execution failed", cause)
          )),
          Effect.succeed(success(requestId, []))
        )

      const envelope = yield* decodeRequest(registration, envelopeText)
      const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps
      if (RpcSchema.isStreamSchema(rpc.successSchema)) {
        return yield* Effect.die(`RivetCluster: stream RPCs are not supported yet: ${envelope.tag}`)
      }
      if (!Context.get(rpc.annotations, Persisted)) {
        const continuation = yield* run(registration, entityRuntime, envelope, discard, false)
        return finish(String(envelope.requestId), continuation)
      }

      const persistedResult = yield* Effect.result(
        database.transaction("cluster_persist", (tx) =>
          persistRequest(
            tx,
            String(envelope.requestId),
            envelopeText,
            primaryKey ?? Envelope.primaryKey(envelope),
            discard
          ))
      )
      if (Result.isFailure(persistedResult)) {
        return Effect.succeed<EntityInvokeResult>(
          persistedResult.failure._tag === "MailboxFull"
            ? { _tag: "MailboxFull" }
            : { _tag: "EncodedMessageTooLarge" }
        )
      }
      const persisted: PersistResult = persistedResult.success
      if (persisted._tag === "Duplicate") {
        const original = yield* loadMessage(database, persisted.originalId)
        if (original === undefined) {
          return yield* Effect.die("Duplicate mailbox row disappeared")
        }
        if (original.discard && !discard) {
          return Effect.succeed<EntityInvokeResult>({ _tag: "AskDeduplicatedToTell" })
        }
        const stored = yield* loadReply(database, persisted.originalId)
        if (stored !== undefined) {
          const session = sessions.get(persisted.originalId)
          if (session !== undefined) {
            removeSession(persisted.originalId, session)
          }
          return Effect.succeed(success(persisted.originalId, [stored]))
        }
        if (persisted.processed) {
          return Effect.succeed(success(persisted.originalId, []))
        }
        const continuation = yield* runStored(registration, entityRuntime, original.envelope, original.discard)
        return original.discard
          ? yield* finishTell(persisted.originalId, continuation)
          : finish(persisted.originalId, continuation)
      }
      const continuation = yield* run(registration, entityRuntime, envelope, discard, true)
      return discard
        ? yield* finishTell(String(envelope.requestId), continuation)
        : finish(String(envelope.requestId), continuation)
    }).pipe(
      Effect.provideContext(getEntityRegistration(options.address.entityType)?.context ?? Context.empty())
    )

  const invoke = (
    envelopeText: string,
    discard: boolean,
    primaryKey: string | null
  ): Effect.Effect<EntityInvokeResult> =>
    Effect.flatten(Semaphore.withPermit(semaphore, invokeEntry(envelopeText, discard, primaryKey)))

  const interrupt = (requestId: string): Effect.Effect<void> =>
    Effect.suspend(() => {
      const session = sessions.get(requestId)
      if (session === undefined || session.uninterruptible) return Effect.void
      session.cancelling = true
      const stop = session.fiber === undefined ? Effect.void : Effect.asVoid(Fiber.interrupt(session.fiber))
      return Effect.andThen(
        stop,
        Semaphore.withPermit(
          semaphore,
          Effect.andThen(
            session.completeInterrupt,
            Effect.sync(() => {
              if (sessions.get(requestId) === session) sessions.delete(requestId)
            })
          )
        )
      )
    })

  const drain: Effect.Effect<number> = Semaphore.withPermit(
    semaphore,
    Effect.gen(function*() {
      const unprocessed = yield* loadUnprocessedIds(database)
      if (unprocessed.length === 0) {
        if (inFlightPersisted === 0) {
          drainArmed = false
          yield* options.setDrainSchedule(false)
        }
        return 0
      }
      yield* armDrain
      const registration = yield* lookupRegistration
      const entityRuntime = yield* getRuntime(registration)
      yield* entityRuntime.warm
      yield* replayPending(registration, entityRuntime, unprocessed)
      return unprocessed.length
    })
  ).pipe(
    Effect.withSpan("RivetCluster.drain", {
      attributes: {
        entityType: options.address.entityType,
        entityId: String(options.address.entityId)
      }
    }, { captureStackTrace: false })
  )

  return { invoke, interrupt, drain }
}

/**
 * Builds the manager for the `clusterEntity` actor with the given
 * `[entityType, entityId]` key.
 *
 * @internal
 */
export const makeEntityManagerForKey = (
  key: ReadonlyArray<string>,
  options: Omit<EntityManagerOptions, "address">
): EntityManager => {
  const [entityType, entityId] = key
  if (entityType === undefined || entityId === undefined) {
    throw new Error(`RivetCluster: invalid entity actor key: ${JSON.stringify(key)}`)
  }
  const registration = getEntityRegistration(entityType)
  if (registration === undefined) {
    throw new Error(`RivetCluster: no handlers registered for entity type: ${entityType}`)
  }
  const id = EntityId.make(entityId)
  return makeEntityManager({
    ...options,
    address: EntityAddress.make({
      shardId: ShardId.make(registration.entity.getShardGroup(id), 1),
      entityType: EntityType.make(entityType),
      entityId: id
    })
  })
}
