/**
 * The durable queue Durable Object runtime. One object holds one named queue:
 * items live in SQLite, and every lease arms the single alarm at its expiry so
 * an item whose worker died is redelivered once the watchdog fires. Takers
 * with no available item wait in memory until an offer, a retry, or a lease
 * expiry wakes them; a crash or hibernation drops those waiters, whose broken
 * RPCs are retried from the Worker side. An interrupted taker cancels its wait
 * by taker id, releasing an item that was already leased to it.
 *
 * @internal
 */
import type { SqlStorage } from "@cloudflare/workers-types"
import * as Effect from "effect/Effect"
import { armAlarm, type EntityAlarm } from "./entityStorage.ts"
import {
  completeItem,
  earliestLeaseExpiry,
  ensureQueueStorage,
  expireLeases,
  extendLease,
  failItem,
  leaseNextItem,
  offerItem,
  type QueueItem,
  releaseItem
} from "./queueStorage.ts"

/** @internal */
export interface QueueRuntimeOptions {
  readonly sql: SqlStorage
  readonly alarm: EntityAlarm
  readonly now: () => number
}

/** @internal */
export interface QueueRuntime {
  readonly offer: (id: string, element: string) => Promise<void>
  readonly take: (takerId: string, maxAttempts: number, leaseMillis: number) => Promise<QueueItem>
  readonly cancelTake: (takerId: string) => Promise<void>
  readonly complete: (id: string) => Promise<void>
  readonly fail: (id: string, lastFailure: string) => Promise<void>
  readonly release: (id: string) => Promise<void>
  readonly extend: (id: string, leaseMillis: number) => Promise<void>
  readonly runAlarm: () => Promise<void>
}

interface Waiter {
  readonly takerId: string
  readonly maxAttempts: number
  readonly leaseMillis: number
  readonly resolve: (item: QueueItem) => void
}

const deliveredCapacity = 4096

/** @internal */
export const makeQueueRuntime = (options: QueueRuntimeOptions): QueueRuntime => {
  const sql = options.sql
  ensureQueueStorage(sql)

  const waiters: Array<Waiter> = []
  // Which item each taker holds, so a cancel that races the delivery can
  // release the already-leased item instead of stranding it.
  const delivered = new Map<string, string>()

  const rememberDelivered = (takerId: string, itemId: string): void => {
    delivered.set(takerId, itemId)
    if (delivered.size <= deliveredCapacity) return
    const oldest = delivered.keys().next().value
    if (oldest !== undefined) delivered.delete(oldest)
  }

  // Waiters differ in maxAttempts, so one waiter finding nothing does not mean
  // a later one will; every waiter gets its own lease attempt. Leasing stays
  // fully synchronous so concurrent wake-ups cannot interleave on the waiter
  // list; only the final alarm arm is asynchronous.
  const wakeWaiters = Effect.suspend(() => {
    const now = options.now()
    let earliest: number | undefined
    let index = 0
    while (index < waiters.length) {
      const waiter = waiters[index]
      const item = leaseNextItem(sql, now, now + waiter.leaseMillis, waiter.maxAttempts)
      if (item === undefined) {
        index++
        continue
      }
      waiters.splice(index, 1)
      rememberDelivered(waiter.takerId, item.id)
      const expiry = now + waiter.leaseMillis
      if (earliest === undefined || expiry < earliest) earliest = expiry
      waiter.resolve(item)
    }
    return earliest === undefined ? Effect.void : armAlarm(options.alarm, earliest)
  })

  const mutateAndWake = (mutate: () => void): Promise<void> =>
    Effect.runPromise(Effect.andThen(Effect.sync(mutate), wakeWaiters))

  return {
    offer: (id, element) =>
      mutateAndWake(() => {
        offerItem(sql, id, element)
      }),

    // The taker joins the waiter list and the shared wake pass leases to it,
    // so an immediate take and a woken one follow the same code path.
    take: (takerId, maxAttempts, leaseMillis) => {
      const item = new Promise<QueueItem>((resolve) => {
        waiters.push({ takerId, maxAttempts, leaseMillis, resolve })
      })
      return Effect.runPromise(wakeWaiters).then(() => item)
    },

    cancelTake: (takerId) => {
      const index = waiters.findIndex((waiter) => waiter.takerId === takerId)
      if (index >= 0) {
        waiters.splice(index, 1)
        return Promise.resolve()
      }
      const itemId = delivered.get(takerId)
      if (itemId === undefined) return Promise.resolve()
      delivered.delete(takerId)
      return mutateAndWake(() => {
        releaseItem(sql, itemId)
      })
    },

    complete: (id) => Promise.resolve(completeItem(sql, id)),

    fail: (id, lastFailure) =>
      mutateAndWake(() => {
        failItem(sql, id, lastFailure)
      }),

    release: (id) =>
      mutateAndWake(() => {
        releaseItem(sql, id)
      }),

    extend: (id, leaseMillis) => Promise.resolve(extendLease(sql, id, options.now() + leaseMillis)),

    runAlarm: () =>
      Effect.runPromise(
        Effect.gen(function*() {
          expireLeases(sql, options.now())
          yield* wakeWaiters
          const next = earliestLeaseExpiry(sql)
          if (next !== undefined) yield* armAlarm(options.alarm, next)
        })
      )
  }
}
