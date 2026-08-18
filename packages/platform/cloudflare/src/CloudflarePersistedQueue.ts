/**
 * Runs persisted queues on the dedicated queue Durable Object class.
 *
 * On this path one queue name is one Durable Object: the Worker encodes the
 * queue name into a Durable Object name with the same length-prefix scheme as
 * entities and resolves the object through the queue namespace binding. Items,
 * their attempt counts, and their in-flight leases live on the object's SQLite
 * storage behind its single alarm; a take with no available item waits inside
 * the object until an offer, a retry, or an expired lease produces one.
 *
 * Delivery is at-least-once: a taken item is leased for a bounded time and the
 * lease is refreshed while the handler runs, so an item whose worker died is
 * redelivered once the alarm watchdog expires the lease.
 *
 * This backs the `DurableQueue` user API; `CloudflareCluster.layer` already
 * includes this layer.
 *
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as PersistedQueue from "effect/unstable/persistence/PersistedQueue"
import { encodeName } from "./internal/clusterName.ts"
import type { QueueItem } from "./internal/queueStorage.ts"

/**
 * The queue Durable Object namespace binding the store is built from.
 *
 * @category layers
 * @since 4.0.0
 */
export interface LayerOptions {
  readonly queueNamespace: DurableObjectNamespace
}

interface QueueStub {
  readonly offer: (id: string, element: string) => Promise<void>
  readonly take: (takerId: string, maxAttempts: number, leaseMillis: number) => Promise<QueueItem>
  readonly cancelTake: (takerId: string) => Promise<void>
  readonly complete: (id: string) => Promise<void>
  readonly fail: (id: string, lastFailure: string) => Promise<void>
  readonly release: (id: string) => Promise<void>
  readonly extend: (id: string, leaseMillis: number) => Promise<void>
}

const leaseMillis = 120_000
const leaseRefreshMillis = 30_000

const finalize = (run: () => Promise<void>): Effect.Effect<void> =>
  Effect.promise(run).pipe(
    Effect.sandbox,
    Effect.retry({ times: 5, schedule: Schedule.exponential(100, 1.5) }),
    Effect.orDie
  )

/**
 * Creates the `PersistedQueueStore` backed by the queue Durable Object
 * namespace binding.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: LayerOptions): PersistedQueue.PersistedQueueStore["Service"] => {
  const stubFor = (name: string): QueueStub =>
    options.queueNamespace.getByName(encodeName("PersistedQueue", name)) as unknown as QueueStub

  return PersistedQueue.PersistedQueueStore.of({
    offer: ({ element, id, name }) =>
      Effect.tryPromise({
        try: () => stubFor(name).offer(id, JSON.stringify(element)),
        catch: (cause) =>
          new PersistedQueue.PersistedQueueError({
            message: "Failed to offer element to persisted queue",
            cause
          })
      }),
    take: ({ maxAttempts, name }) =>
      // Uninterruptible outside `restore` so the release finalizer is always
      // registered once an item is leased; an interrupt while still waiting
      // cancels the take by taker id, releasing an item that was already
      // leased to it on the object.
      Effect.uninterruptibleMask((restore) =>
        Effect.gen(function*() {
          const takerId = crypto.randomUUID()
          // A broken take RPC means the object was evicted while this taker
          // waited; retrying re-enters the queue with nothing lost.
          const item = yield* restore(
            Effect.promise(() => stubFor(name).take(takerId, maxAttempts, leaseMillis)).pipe(
              Effect.sandbox,
              Effect.tapCause((cause) => Effect.logWarning("PersistedQueue take failed, retrying", cause)),
              Effect.retry(Schedule.spaced(500)),
              Effect.orDie
            )
          ).pipe(
            Effect.onInterrupt(() =>
              Effect.promise(() => stubFor(name).cancelTake(takerId)).pipe(
                Effect.sandbox,
                Effect.retry({ times: 5, schedule: Schedule.exponential(100, 1.5) }),
                Effect.ignore
              )
            )
          )
          yield* Effect.addFinalizer(Exit.match({
            onFailure: (cause) =>
              Cause.hasInterruptsOnly(cause)
                ? finalize(() => stubFor(name).release(item.id))
                : finalize(() => stubFor(name).fail(item.id, Cause.pretty(cause))),
            onSuccess: () => finalize(() => stubFor(name).complete(item.id))
          }))
          yield* Effect.promise(() => stubFor(name).extend(item.id, leaseMillis)).pipe(
            Effect.sandbox,
            Effect.ignore,
            Effect.schedule(Schedule.spaced(leaseRefreshMillis)),
            Effect.forkScoped,
            Effect.interruptible
          )
          return {
            id: item.id,
            attempts: item.attempts,
            element: JSON.parse(item.element)
          }
        })
      )
  })
}

/**
 * Layer that provides the `PersistedQueueFactory` backed by the queue Durable
 * Object namespace binding.
 *
 * **Details**
 *
 * `CloudflareCluster.layer` already includes this layer; use it directly only
 * when persisted queues are needed without the rest of the cluster.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: LayerOptions): Layer.Layer<PersistedQueue.PersistedQueueFactory> =>
  PersistedQueue.layer.pipe(
    Layer.provide(Layer.succeed(PersistedQueue.PersistedQueueStore)(make(options)))
  )
