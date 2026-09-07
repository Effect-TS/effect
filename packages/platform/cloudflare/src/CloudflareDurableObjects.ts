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
import {
  type ClusterDurableQueueProgram,
  type ClusterEntityProgram,
  type ClusterSingletonProgram,
  type ClusterWorkflowProgram,
  type ClusterWorkflowRunOptions,
  type DurableQueueItem,
  type EntityDeliveryOptions,
  type EntityInvokeResult,
  makeClusterDurableQueueProgram,
  makeClusterEntityProgram,
  makeClusterSingletonProgram,
  makeClusterWorkflowProgram
} from "./CloudflareDurableObjectPrograms.ts"

const notExposed = (className: string) => () => {
  throw new Error(
    `@effect/platform-cloudflare: ${className} is not exposed over fetch, use the same-Worker namespace binding`
  )
}

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
  // blockConcurrencyWhile completes this assignment before any RPC or alarm.
  #program!: ClusterEntityProgram

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    blockOnInitialization(ctx, env, async () => {
      this.#program = await Effect.runPromise(makeClusterEntityProgram(ctx))
    })
  }

  override alarm(): Promise<void> {
    return Effect.runPromise(this.#program.alarm())
  }

  /** @internal Keeps this object non-hibernateable while entity resources have holders. */
  hold(): Promise<void> {
    return Effect.runPromise(this.#program.hold())
  }

  /** @internal Same-Worker RPC transport used by `CloudflareCluster.layer`. */
  invoke(envelopeText: string, discard: boolean, delivery?: EntityDeliveryOptions): Promise<EntityInvokeResult> {
    return Effect.runPromise(this.#program.invoke(envelopeText, discard, delivery))
  }

  /** @internal Acknowledges a streamed chunk. */
  acknowledge(requestId: string, replyId: string): Promise<ReadonlyArray<string>> {
    return Effect.runPromise(this.#program.acknowledge(requestId, replyId))
  }

  /** @internal Interrupts a handler execution and completes its persisted ask, if any. */
  interrupt(storageRequestId: string, clientRequestId = storageRequestId): Promise<void> {
    return Effect.runPromise(this.#program.interrupt(storageRequestId, clientRequestId))
  }

  /** @internal Clears stored replies so a reset request replays from scratch. */
  reset(requestId: string): Promise<void> {
    return Effect.runPromise(this.#program.reset(requestId))
  }

  /** @internal Completes an in-memory delayed ask owned by this entity object. */
  deliverReply(requestId: string, reply: string): Promise<boolean> {
    return Effect.runPromise(this.#program.deliverReply(requestId, reply))
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
  // blockConcurrencyWhile completes this assignment before any RPC or alarm.
  #program!: ClusterWorkflowProgram

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    blockOnInitialization(ctx, env, async () => {
      this.#program = await Effect.runPromise(makeClusterWorkflowProgram(ctx))
    })
  }

  /** @internal Same-Worker RPC transport used by `CloudflareWorkflowEngine`. */
  run(payload: string, options: ClusterWorkflowRunOptions): Promise<string> {
    return Effect.runPromise(this.#program.run(payload, options))
  }

  /** @internal */
  poll(): Promise<string | undefined> {
    return Effect.runPromise(this.#program.poll())
  }

  /** @internal */
  resume(): Promise<void> {
    return Effect.runPromise(this.#program.resume())
  }

  /** @internal */
  interrupt(): Promise<void> {
    return Effect.runPromise(this.#program.interrupt())
  }

  /** @internal */
  interruptUnsafe(): Promise<void> {
    return Effect.runPromise(this.#program.interruptUnsafe())
  }

  /** @internal Records a durable deferred exit and resumes the execution. */
  deferredDone(name: string, exit: string): Promise<void> {
    return Effect.runPromise(this.#program.deferredDone(name, exit))
  }

  /** @internal Persists a durable clock and arms the single alarm. */
  scheduleClock(name: string, deferredName: string, wakeUp: number): Promise<void> {
    return Effect.runPromise(this.#program.scheduleClock(name, deferredName, wakeUp))
  }

  override alarm(): Promise<void> {
    return Effect.runPromise(this.#program.alarm())
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
  // blockConcurrencyWhile completes this assignment before any RPC or alarm.
  #program!: ClusterDurableQueueProgram

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    blockOnInitialization(ctx, env, async () => {
      this.#program = await Effect.runPromise(makeClusterDurableQueueProgram(ctx))
    })
  }

  /** @internal Same-Worker RPC transport used by `CloudflarePersistedQueue.layer`. */
  offer(id: string, element: string): Promise<void> {
    return Effect.runPromise(this.#program.offer(id, element))
  }

  /** @internal Waits until an item is available, then leases it to the caller. */
  take(takerId: string, maxAttempts: number, leaseMillis: number): Promise<DurableQueueItem> {
    return Effect.runPromise(this.#program.take(takerId, maxAttempts, leaseMillis))
  }

  /** @internal Cancels a waiting take, releasing an item already leased to it. */
  cancelTake(takerId: string): Promise<void> {
    return Effect.runPromise(this.#program.cancelTake(takerId))
  }

  /** @internal */
  complete(id: string): Promise<void> {
    return Effect.runPromise(this.#program.complete(id))
  }

  /** @internal Records a failed attempt and requeues the item. */
  fail(id: string, lastFailure: string): Promise<void> {
    return Effect.runPromise(this.#program.fail(id, lastFailure))
  }

  /** @internal Requeues the item without counting an attempt. */
  release(id: string): Promise<void> {
    return Effect.runPromise(this.#program.release(id))
  }

  /** @internal Extends the lease of an item still being processed. */
  extend(id: string, leaseMillis: number): Promise<void> {
    return Effect.runPromise(this.#program.extend(id, leaseMillis))
  }

  override alarm(): Promise<void> {
    return Effect.runPromise(this.#program.alarm())
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
  // blockConcurrencyWhile completes this assignment before any RPC or alarm.
  #program!: ClusterSingletonProgram

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    blockOnInitialization(ctx, env, async () => {
      this.#program = await Effect.runPromise(makeClusterSingletonProgram(ctx))
    })
  }

  /** @internal Runs one Cron Trigger fire, coalescing a concurrent duplicate. */
  wake(): Promise<void> {
    return Effect.runPromise(this.#program.wake())
  }

  override alarm(): Promise<void> {
    return Effect.runPromise(this.#program.alarm())
  }

  override fetch: () => never = notExposed("ClusterSingleton")
}
