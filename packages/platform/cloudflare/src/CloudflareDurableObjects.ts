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
import * as Effect from "effect/Effect"
import * as ClusterMetrics from "effect/unstable/cluster/ClusterMetrics"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as ShardId from "effect/unstable/cluster/ShardId"
import { decodeName, encodeName } from "./internal/clusterName.ts"
import { makeEntityKeepAlive } from "./internal/entityKeepAlive.ts"
import { makeEntityManager } from "./internal/entityRuntime.ts"
import { armAlarm, earliestDeliverAt, ensureEntityStorage } from "./internal/entityStorage.ts"
import { makeQueueRuntime } from "./internal/queueRuntime.ts"
import { earliestLeaseExpiry, type QueueItem } from "./internal/queueStorage.ts"
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

const exportedNamespace = <Stub>(
  state: DurableObjectState,
  className: string
): { readonly getByName: (name: string) => Stub } | undefined =>
  (state.exports as Record<string, unknown>)[className] as
    | { readonly getByName: (name: string) => Stub }
    | undefined

type EntityManager = ReturnType<typeof makeEntityManager>

type WorkflowRuntime = ReturnType<typeof makeWorkflowRuntime>

type QueueRuntime = ReturnType<typeof makeQueueRuntime>

type SingletonRuntime = ReturnType<typeof makeSingletonRuntime>

/**
 * Initializes the Worker application before a Cloudflare cluster Durable
 * Object handles requests or alarms. The initializer is shared by all four
 * Durable Object classes and runs at most once per Worker isolate.
 *
 * @category models
 * @since 4.0.0
 */
export type Initializer<Env = unknown, A = unknown> = (env: Env) => PromiseLike<A>

let initializer: Initializer | undefined
let initialization: {
  readonly _tag: "Pending"
} | {
  readonly _tag: "Success"
  readonly value: unknown
} | {
  readonly _tag: "Failure"
  readonly error: unknown
} | undefined

/**
 * Registers the Worker application initializer used by the Cloudflare cluster
 * Durable Object classes.
 *
 * **Details**
 *
 * Call this once from the Worker entry module with the same lazy application
 * build used by its request handlers. Every entity, workflow, queue, and
 * singleton object blocks requests and alarms until that build completes. A
 * failure is cached and propagated to every waiter in the isolate. The
 * returned function joins the same readiness state from Worker handlers.
 *
 * @category initialization
 * @since 4.0.0
 */
export const setInitializer = <Env, A>(handler: Initializer<Env, A>): (env: Env) => Promise<A> => {
  if (initializer !== undefined) {
    throw new Error("@effect/platform-cloudflare: the Durable Object initializer is already set")
  }
  initializer = handler as Initializer
  return (env) => waitForInitialization(env) as Promise<A>
}

const waitForInitialization = async (env: unknown): Promise<unknown> => {
  if (initializer === undefined) return
  if (initialization === undefined) {
    initialization = { _tag: "Pending" }
    try {
      const value = await initializer(env)
      initialization = { _tag: "Success", value }
      return value
    } catch (error) {
      initialization = { _tag: "Failure", error }
      throw error
    }
  }
  // Cloudflare promises belong to the request context that created them. A
  // fresh wait in this context observes the shared plain-JavaScript state
  // without awaiting the first Durable Object's promise from another event.
  while (initialization._tag === "Pending") {
    await scheduler.wait(1)
  }
  if (initialization._tag === "Failure") throw initialization.error
  return initialization.value
}

const blockOnInitialization = (
  ctx: DurableObjectState,
  env: unknown,
  after?: (() => Promise<unknown>) | undefined
): void => {
  void ctx.blockConcurrencyWhile(async () => {
    await waitForInitialization(env)
    if (after !== undefined) await after()
  })
}

// Mirrors entityWire's InvokeResult and entityRuntime's DeliveryOptions: the
// exported class cannot reference an @internal type in its method signatures.
type InvokeResult = {
  readonly _tag: "Success"
  readonly requestId: string
  readonly replies: ReadonlyArray<string>
} | {
  readonly _tag: "MailboxFull"
} | {
  readonly _tag: "EncodedMessageTooLarge"
} | {
  readonly _tag: "AskDeduplicatedToTell"
}

interface DeliveryOptions {
  readonly deliverAt?: number | undefined
  readonly primaryKey?: string | null | undefined
  readonly replyTo?: string | undefined
}

/**
 * The shared entity class. One instance holds one entity address; the handlers
 * for every `EntityType` are registered at Worker init.
 *
 * **Details**
 *
 * The constructor stays cheap: it opens SQLite, ensures the mailbox tables,
 * and re-arms the single alarm from the earliest pending `deliver_at`. User
 * handlers are never built in the constructor; requests and alarms wait for
 * the registered {@link setInitializer} callback, then handlers are built once
 * per wake.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterEntity extends DurableObject<unknown> {
  readonly #keepAlive
  readonly #manager: EntityManager

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    const entityName = ctx.id.name ?? ""
    const name = decodeName(entityName)
    if (name === undefined) throw new Error("ClusterEntity requires a canonical entity Durable Object name")
    this.#keepAlive = makeEntityKeepAlive(() => {
      const namespace = exportedNamespace<{ readonly hold: () => Promise<void> }>(ctx, "ClusterEntity")
      if (namespace === undefined) {
        return Promise.reject(
          new Error("CloudflareCluster: ClusterEntity export is unavailable for keep-alive")
        )
      }
      return namespace.getByName(entityName).hold()
    })
    this.#manager = makeEntityManager({
      storage: ctx.storage,
      address: EntityAddress.make({
        shardId: ShardId.make("default", 1),
        entityType: EntityType.make(name.type),
        entityId: EntityId.make(name.id)
      }),
      entityName,
      keepAlive: this.#keepAlive,
      waitUntil: (effect) => ctx.waitUntil(Effect.runPromise(effect)),
      getNamespace: () =>
        exportedNamespace<{
          readonly deliverReply: (requestId: string, reply: string) => Promise<boolean>
        }>(ctx, "ClusterEntity")
    })
    const sql = ctx.storage.sql
    ensureEntityStorage(sql)
    const deliverAt = earliestDeliverAt(sql)
    blockOnInitialization(
      ctx,
      env,
      deliverAt === undefined ? undefined : () => Effect.runPromise(armAlarm(ctx.storage, deliverAt))
    )
  }

  override alarm(): Promise<void> {
    return Effect.runPromise(this.#manager.alarm)
  }

  /** @internal Keeps this object non-hibernateable while entity resources have holders. */
  hold(): Promise<void> {
    return Effect.runPromise(this.#keepAlive.await)
  }

  /** @internal Same-Worker RPC transport used by `CloudflareCluster.layer`. */
  invoke(envelopeText: string, discard: boolean, delivery?: DeliveryOptions): Promise<InvokeResult> {
    return Effect.runPromise(this.#manager.invoke(envelopeText, discard, delivery))
  }

  /** @internal Acknowledges a streamed chunk. */
  acknowledge(requestId: string, replyId: string): Promise<ReadonlyArray<string>> {
    return Effect.runPromise(this.#manager.acknowledge(requestId, replyId))
  }

  /** @internal Interrupts a handler execution and completes its persisted ask, if any. */
  interrupt(storageRequestId: string, clientRequestId = storageRequestId): Promise<void> {
    return Effect.runPromise(this.#manager.interrupt(storageRequestId, clientRequestId))
  }

  /** @internal Clears stored replies so a reset request replays from scratch. */
  reset(requestId: string): Promise<void> {
    return Effect.runPromise(this.#manager.reset(requestId))
  }

  /** @internal Completes an in-memory delayed ask owned by this entity object. */
  deliverReply(requestId: string, reply: string): Promise<boolean> {
    return Effect.runPromise(this.#manager.deliverReply(requestId, reply))
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
 * requests and alarms wait for the registered {@link setInitializer} callback
 * before handlers are looked up in the module-level registry and built once
 * per wake.
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
    blockOnInitialization(
      ctx,
      env,
      wakeUp === undefined ? undefined : () => Effect.runPromise(armAlarm(ctx.storage, wakeUp))
    )
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
          const namespace = exportedNamespace<WorkflowStub>(this.#state, "ClusterWorkflow")
          if (namespace === undefined) {
            throw new Error("CloudflareCluster: ClusterWorkflow export is unavailable for workflow delivery")
          }
          return namespace.getByName(name)
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
 * leases so an item whose worker died is redelivered. Requests and alarms wait
 * for the registered {@link setInitializer} callback first.
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
    blockOnInitialization(
      ctx,
      env,
      expiry === undefined ? undefined : () => Effect.runPromise(armAlarm(ctx.storage, expiry))
    )
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
 * `Effect.never`, so Cloudflare may hibernate the object afterward. Requests
 * and alarms wait for the registered {@link setInitializer} callback before
 * consulting the singleton registry.
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
    blockOnInitialization(
      ctx,
      env,
      stored.wakeAt === undefined ? undefined : () => Effect.runPromise(armAlarm(ctx.storage, stored.wakeAt!))
    )
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
