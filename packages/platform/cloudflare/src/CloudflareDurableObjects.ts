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
  readonly #program: Promise<ClusterEntityProgram>

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#program = ctx.blockConcurrencyWhile(() => Effect.runPromise(makeClusterEntityProgram(ctx)))
  }

  override alarm(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.alarm()))
  }

  /** @internal Keeps this object non-hibernateable while entity resources have holders. */
  hold(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.hold()))
  }

  /** @internal Same-Worker RPC transport used by `CloudflareCluster.layer`. */
  invoke(envelopeText: string, discard: boolean, delivery?: EntityDeliveryOptions): Promise<EntityInvokeResult> {
    return this.#program.then((program) => Effect.runPromise(program.invoke(envelopeText, discard, delivery)))
  }

  /** @internal Acknowledges a streamed chunk. */
  acknowledge(requestId: string, replyId: string): Promise<ReadonlyArray<string>> {
    return this.#program.then((program) => Effect.runPromise(program.acknowledge(requestId, replyId)))
  }

  /** @internal Interrupts a handler execution and completes its persisted ask, if any. */
  interrupt(storageRequestId: string, clientRequestId = storageRequestId): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.interrupt(storageRequestId, clientRequestId)))
  }

  /** @internal Clears stored replies so a reset request replays from scratch. */
  reset(requestId: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.reset(requestId)))
  }

  /** @internal Completes an in-memory delayed ask owned by this entity object. */
  deliverReply(requestId: string, reply: string): Promise<boolean> {
    return this.#program.then((program) => Effect.runPromise(program.deliverReply(requestId, reply)))
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
  readonly #program: Promise<ClusterWorkflowProgram>

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#program = ctx.blockConcurrencyWhile(() => Effect.runPromise(makeClusterWorkflowProgram(ctx)))
  }

  /** @internal Same-Worker RPC transport used by `CloudflareWorkflowEngine`. */
  run(payload: string, options: ClusterWorkflowRunOptions): Promise<string> {
    return this.#program.then((program) => Effect.runPromise(program.run(payload, options)))
  }

  /** @internal */
  poll(): Promise<string | undefined> {
    return this.#program.then((program) => Effect.runPromise(program.poll()))
  }

  /** @internal */
  resume(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.resume()))
  }

  /** @internal */
  interrupt(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.interrupt()))
  }

  /** @internal */
  interruptUnsafe(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.interruptUnsafe()))
  }

  /** @internal Records a durable deferred exit and resumes the execution. */
  deferredDone(name: string, exit: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.deferredDone(name, exit)))
  }

  /** @internal Persists a durable clock and arms the single alarm. */
  scheduleClock(name: string, deferredName: string, wakeUp: number): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.scheduleClock(name, deferredName, wakeUp)))
  }

  override alarm(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.alarm()))
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
  readonly #program: Promise<ClusterDurableQueueProgram>

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#program = ctx.blockConcurrencyWhile(() => Effect.runPromise(makeClusterDurableQueueProgram(ctx)))
  }

  /** @internal Same-Worker RPC transport used by `CloudflarePersistedQueue.layer`. */
  offer(id: string, element: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.offer(id, element)))
  }

  /** @internal Waits until an item is available, then leases it to the caller. */
  take(takerId: string, maxAttempts: number, leaseMillis: number): Promise<DurableQueueItem> {
    return this.#program.then((program) => Effect.runPromise(program.take(takerId, maxAttempts, leaseMillis)))
  }

  /** @internal Cancels a waiting take, releasing an item already leased to it. */
  cancelTake(takerId: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.cancelTake(takerId)))
  }

  /** @internal */
  complete(id: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.complete(id)))
  }

  /** @internal Records a failed attempt and requeues the item. */
  fail(id: string, lastFailure: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.fail(id, lastFailure)))
  }

  /** @internal Requeues the item without counting an attempt. */
  release(id: string): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.release(id)))
  }

  /** @internal Extends the lease of an item still being processed. */
  extend(id: string, leaseMillis: number): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.extend(id, leaseMillis)))
  }

  override alarm(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.alarm()))
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
  readonly #program: Promise<ClusterSingletonProgram>

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    this.#program = ctx.blockConcurrencyWhile(() => Effect.runPromise(makeClusterSingletonProgram(ctx)))
  }

  /** @internal Runs one Cron Trigger fire, coalescing a concurrent duplicate. */
  wake(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.wake()))
  }

  override alarm(): Promise<void> {
    return this.#program.then((program) => Effect.runPromise(program.alarm()))
  }

  override fetch: () => never = notExposed("ClusterSingleton")
}
