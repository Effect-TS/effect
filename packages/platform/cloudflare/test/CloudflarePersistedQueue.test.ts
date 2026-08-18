import type { SqlStorage } from "@cloudflare/workers-types"
import * as CloudflarePersistedQueue from "@effect/platform-cloudflare/CloudflarePersistedQueue"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import { armAlarm, type EntityAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { makeQueueRuntime, type QueueRuntime } from "@effect/platform-cloudflare/internal/queueRuntime"
import { earliestLeaseExpiry, ensureQueueStorage } from "@effect/platform-cloudflare/internal/queueStorage"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Schema } from "effect"
import * as PersistedQueueTest from "effect-test/unstable/persistence/PersistedQueueTest"
import { PersistedQueue } from "effect/unstable/persistence"

interface ItemRow {
  readonly id: string
  readonly element: string
  position: number
  attempts: number
  completed: number
  lease_until: number | null
  last_failure: string | null
}

class FakeSql {
  readonly items = new Map<string, ItemRow>()

  #nextPosition() {
    return Math.max(0, ...Array.from(this.items.values(), (item) => item.position)) + 1
  }

  exec(query: string, ...bindings: Array<unknown>) {
    if (query.startsWith("CREATE")) return this.rows([])
    if (query.includes("INSERT OR IGNORE INTO queue_items")) {
      const [id, element] = bindings as [string, string]
      if (!this.items.has(id)) {
        this.items.set(id, {
          id,
          element,
          position: this.#nextPosition(),
          attempts: 0,
          completed: 0,
          lease_until: null,
          last_failure: null
        })
      }
      return this.rows([])
    }
    if (query.includes("SELECT id, element, attempts")) {
      const [maxAttempts, now] = bindings as [number, number]
      const row = Array.from(this.items.values())
        .filter((item) =>
          item.completed === 0 && item.attempts < maxAttempts &&
          (item.lease_until === null || item.lease_until <= now)
        )
        .sort((left, right) => left.position - right.position)[0]
      return this.rows(row === undefined ? [] : [{ id: row.id, element: row.element, attempts: row.attempts }])
    }
    if (query.includes("SET completed = 1")) {
      const item = this.items.get(String(bindings[0]))
      if (item !== undefined) {
        item.completed = 1
        item.lease_until = null
      }
      return this.rows([])
    }
    if (query.includes("SET lease_until = NULL WHERE lease_until")) {
      const now = Number(bindings[0])
      for (const item of this.items.values()) {
        if (item.lease_until !== null && item.lease_until <= now) item.lease_until = null
      }
      return this.rows([])
    }
    if (query.includes("SET lease_until = NULL WHERE id")) {
      const item = this.items.get(String(bindings[0]))
      if (item !== undefined) item.lease_until = null
      return this.rows([])
    }
    if (query.includes("AND lease_until IS NOT NULL")) {
      const item = this.items.get(String(bindings[1]))
      if (item !== undefined && item.lease_until !== null) item.lease_until = Number(bindings[0])
      return this.rows([])
    }
    if (query.includes("SET lease_until = ? WHERE id = ?")) {
      const item = this.items.get(String(bindings[1]))
      if (item !== undefined) item.lease_until = Number(bindings[0])
      return this.rows([])
    }
    if (query.includes("SET attempts = attempts + 1")) {
      const item = this.items.get(String(bindings[1]))
      if (item !== undefined) {
        item.attempts++
        item.lease_until = null
        item.last_failure = String(bindings[0])
        item.position = this.#nextPosition()
      }
      return this.rows([])
    }
    if (query.includes("min(lease_until)")) {
      const pending = Array.from(this.items.values())
        .filter((item) => item.lease_until !== null)
        .map((item) => item.lease_until!)
      return this.rows([{ lease_until: pending.length === 0 ? null : Math.min(...pending) }])
    }
    throw new Error(`Unexpected SQL: ${query}`)
  }

  private rows(rows: Array<Record<string, unknown>>) {
    return { toArray: () => rows }
  }

  get sql(): SqlStorage {
    return this as unknown as SqlStorage
  }
}

class FakeAlarm {
  current: number | null = null

  getAlarm() {
    return Promise.resolve(this.current)
  }
  setAlarm(scheduledTime: number) {
    this.current = scheduledTime
    return Promise.resolve()
  }

  get alarm(): EntityAlarm {
    return this as unknown as EntityAlarm
  }
}

class FakeQueueNamespace {
  readonly stores = new Map<string, { readonly sql: FakeSql; readonly alarm: FakeAlarm }>()
  readonly runtimes = new Map<string, QueueRuntime>()
  now = 0

  store(name: string) {
    let store = this.stores.get(name)
    if (store === undefined) {
      store = { sql: new FakeSql(), alarm: new FakeAlarm() }
      this.stores.set(name, store)
    }
    return store
  }

  getByName(name: string): QueueRuntime {
    let runtime = this.runtimes.get(name)
    if (runtime === undefined) {
      const store = this.store(name)
      // Mirrors the ClusterDurableQueue constructor: ensure the table and
      // re-arm the single alarm from the earliest pending lease expiry.
      ensureQueueStorage(store.sql.sql)
      const expiry = earliestLeaseExpiry(store.sql.sql)
      if (expiry !== undefined) {
        void Effect.runPromise(armAlarm(store.alarm.alarm, expiry))
      }
      runtime = makeQueueRuntime({
        sql: store.sql.sql,
        alarm: store.alarm.alarm,
        now: () => this.now
      })
      this.runtimes.set(name, runtime)
    }
    return runtime
  }

  /** Drops every in-memory runtime, as a crashed or hibernated isolate would. */
  crash() {
    this.runtimes.clear()
  }

  fireDueAlarms(): Promise<void> {
    const fired: Array<Promise<void>> = []
    for (const [name, store] of this.stores) {
      if (store.alarm.current !== null && store.alarm.current <= this.now) {
        store.alarm.current = null
        fired.push(this.getByName(name).runAlarm())
      }
    }
    return Promise.all(fired).then(() => undefined)
  }

  get layer() {
    return CloudflarePersistedQueue.layer({ queueNamespace: this as never })
  }
}

const settle = () => Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 1)))

const objectName = (queueName: string) => encodeName("PersistedQueue", queueName)

describe("CloudflarePersistedQueue", () => {
  it.effect("offers and takes items in order, deduplicating by id", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "orders", schema: Schema.String })
      yield* queue.offer("first", { id: "a" })
      yield* queue.offer("second", { id: "b" })
      yield* queue.offer("duplicate", { id: "a" })
      const taken: Array<string> = []
      yield* queue.take((value) => Effect.sync(() => taken.push(value)))
      yield* queue.take((value) => Effect.sync(() => taken.push(value)))
      assert.deepStrictEqual(taken, ["first", "second"])
      // Completed rows are retained so custom-id dedup survives completion.
      const store = namespace.stores.get(objectName("orders"))!
      assert.strictEqual(store.sql.items.get("a")!.completed, 1)
      assert.strictEqual(store.sql.items.get("b")!.completed, 1)
      yield* queue.offer("again", { id: "a" })
      assert.strictEqual(store.sql.items.get("a")!.element, JSON.stringify("first"))
      assert.strictEqual(store.sql.items.get("a")!.completed, 1)
    }).pipe(Effect.provide(namespace.layer))
  })

  it.effect("waits for an offer when the queue is empty", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "empty", schema: Schema.String })
      const fiber = yield* Effect.forkChild(queue.take((value) => Effect.succeed(value)))
      yield* settle()
      yield* queue.offer("wake", { id: "a" })
      assert.strictEqual(yield* Fiber.join(fiber), "wake")
    }).pipe(Effect.provide(namespace.layer))
  })

  it.effect("wakes concurrent waiting takers with distinct items", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const runtime = namespace.getByName(objectName("bulk"))
      const first = runtime.take("taker-1", 10, 500)
      const second = runtime.take("taker-2", 10, 500)
      yield* settle()
      yield* Effect.promise(() => Promise.all([runtime.offer("a", "\"1\""), runtime.offer("b", "\"2\"")]))
      const items = yield* Effect.promise(() => Promise.all([first, second]))
      assert.deepStrictEqual(items.map((item) => item.id).sort(), ["a", "b"])
    })
  })

  it.effect("cancelling a waiting take keeps the next offer for live takers", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "cancelled", schema: Schema.String })
      const fiber = yield* Effect.forkChild(queue.take((value) => Effect.succeed(value)))
      yield* settle()
      yield* Fiber.interrupt(fiber)
      yield* queue.offer("job", { id: "a" })
      // The interrupted taker's waiter is gone; the item is immediately
      // available instead of leased to a dead taker for the lease period.
      assert.strictEqual(yield* queue.take((value) => Effect.succeed(value)), "job")
    }).pipe(Effect.provide(namespace.layer))
  })

  it.effect("cancelling a taker that was already leased an item releases it", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const runtime = namespace.getByName(objectName("raced"))
      const pending = runtime.take("taker-1", 10, 500)
      yield* settle()
      yield* Effect.promise(() => runtime.offer("a", "\"first\""))
      yield* Effect.promise(() => pending)
      const store = namespace.stores.get(objectName("raced"))!
      assert.isNotNull(store.sql.items.get("a")!.lease_until)
      // The taker's fiber was interrupted after the item was leased but
      // before it could register its finalizer; the cancel releases it.
      yield* Effect.promise(() => runtime.cancelTake("taker-1"))
      assert.isNull(store.sql.items.get("a")!.lease_until)
      const replay = yield* Effect.promise(() => runtime.take("taker-2", 10, 500))
      assert.strictEqual(replay.id, "a")
    })
  })

  it.effect("retries a failed handler and counts the attempt", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "retries", schema: Schema.String })
      yield* queue.offer("job", { id: "a" })
      const failed = yield* Effect.flip(queue.take(() => Effect.fail("boom" as const)))
      assert.strictEqual(failed, "boom")
      const store = namespace.stores.get(objectName("retries"))!
      assert.strictEqual(store.sql.items.get("a")!.attempts, 1)
      assert.include(store.sql.items.get("a")!.last_failure, "boom")
      const attempts = yield* queue.take((_, metadata) => Effect.succeed(metadata.attempts))
      assert.strictEqual(attempts, 1)
      assert.strictEqual(store.sql.items.get("a")!.completed, 1)
    }).pipe(Effect.provide(namespace.layer))
  })

  it.effect("requeues a failed item behind later offers", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const runtime = namespace.getByName(objectName("ordered"))
      yield* Effect.promise(() => runtime.offer("a", "\"first\""))
      yield* Effect.promise(() => runtime.offer("b", "\"second\""))
      const item = yield* Effect.promise(() => runtime.take("taker-1", 10, 500))
      assert.strictEqual(item.id, "a")
      yield* Effect.promise(() => runtime.fail(item.id, "boom"))
      // The retry sorts after the untouched item, so "a" cannot hot-loop.
      const next = yield* Effect.promise(() => runtime.take("taker-2", 10, 500))
      assert.strictEqual(next.id, "b")
      const retried = yield* Effect.promise(() => runtime.take("taker-3", 10, 500))
      assert.strictEqual(retried.id, "a")
    })
  })

  it.effect("stops delivering an item that exhausted its attempts", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const runtime = namespace.getByName(objectName("dead"))
      yield* Effect.promise(() => runtime.offer("a", "\"poison\""))
      const item = yield* Effect.promise(() => runtime.take("taker-1", 1, 1000))
      yield* Effect.promise(() => runtime.fail(item.id, "boom"))
      const outcome = yield* Effect.promise(() =>
        Promise.race([
          runtime.take("taker-2", 1, 1000).then(() => "delivered"),
          new Promise<string>((resolve) => setTimeout(() => resolve("pending"), 20))
        ])
      )
      assert.strictEqual(outcome, "pending")
      // The exhausted item stays behind as a dead letter.
      const store = namespace.stores.get(objectName("dead"))!
      assert.strictEqual(store.sql.items.get("a")!.attempts, 1)
    })
  })

  it.effect("releases an interrupted take without counting an attempt", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "interrupts", schema: Schema.String })
      yield* queue.offer("job", { id: "a" })
      const fiber = yield* Effect.forkChild(queue.take(() => Effect.never))
      yield* settle()
      const store = namespace.stores.get(objectName("interrupts"))!
      assert.isNotNull(store.sql.items.get("a")!.lease_until)
      yield* Fiber.interrupt(fiber)
      assert.isNull(store.sql.items.get("a")!.lease_until)
      assert.strictEqual(store.sql.items.get("a")!.attempts, 0)
      const attempts = yield* queue.take((_, metadata) => Effect.succeed(metadata.attempts))
      assert.strictEqual(attempts, 0)
    }).pipe(Effect.provide(namespace.layer))
  })

  it.effect("redelivers a leased item after a crash once the lease expires", () => {
    const namespace = new FakeQueueNamespace()
    const name = objectName("jobs")
    return Effect.gen(function*() {
      namespace.now = 1000
      const runtime = namespace.getByName(name)
      yield* Effect.promise(() => runtime.offer("a", "\"first\""))
      const item = yield* Effect.promise(() => runtime.take("taker-1", 10, 500))
      assert.strictEqual(item.id, "a")
      const store = namespace.stores.get(name)!
      assert.strictEqual(store.alarm.current, 1500)

      // The worker died mid-processing and the object lost its alarm.
      namespace.crash()
      store.alarm.current = null
      namespace.getByName(name)
      yield* settle()
      assert.strictEqual(store.alarm.current, 1500)

      namespace.now = 2000
      yield* Effect.promise(() => namespace.fireDueAlarms())
      const replay = yield* Effect.promise(() => namespace.getByName(name).take("taker-2", 10, 500))
      assert.strictEqual(replay.id, "a")
      assert.strictEqual(replay.element, "\"first\"")
      // Losing a lease is not a failed attempt.
      assert.strictEqual(replay.attempts, 0)
    })
  })

  it.effect("an extended lease survives the original expiry", () => {
    const namespace = new FakeQueueNamespace()
    const name = objectName("extended")
    return Effect.gen(function*() {
      const runtime = namespace.getByName(name)
      yield* Effect.promise(() => runtime.offer("a", "\"slow\""))
      const item = yield* Effect.promise(() => runtime.take("taker-1", 10, 500))
      const store = namespace.stores.get(name)!
      assert.strictEqual(store.alarm.current, 500)
      namespace.now = 400
      yield* Effect.promise(() => runtime.extend(item.id, 500))
      assert.strictEqual(store.sql.items.get("a")!.lease_until, 900)

      // The stale alarm fires at the original expiry, finds the lease still
      // live, and re-arms the watchdog at the extended expiry.
      namespace.now = 500
      yield* Effect.promise(() => namespace.fireDueAlarms())
      assert.isNotNull(store.sql.items.get("a")!.lease_until)
      assert.strictEqual(store.alarm.current, 900)

      namespace.now = 1000
      yield* Effect.promise(() => namespace.fireDueAlarms())
      const replay = yield* Effect.promise(() => runtime.take("taker-2", 10, 500))
      assert.strictEqual(replay.id, "a")
    })
  })

  it.effect("wakes a waiting taker and re-arms the alarm for the next lease", () => {
    const namespace = new FakeQueueNamespace()
    const name = objectName("watchdog")
    return Effect.gen(function*() {
      namespace.now = 0
      const runtime = namespace.getByName(name)
      yield* Effect.promise(() => runtime.offer("a", "\"first\""))
      yield* Effect.promise(() => runtime.offer("b", "\"second\""))
      yield* Effect.promise(() => runtime.take("taker-1", 10, 500))
      yield* Effect.promise(() => runtime.take("taker-2", 10, 5000))
      const store = namespace.stores.get(name)!
      assert.strictEqual(store.alarm.current, 500)

      let woken: string | undefined
      const waiting = runtime.take("taker-3", 10, 500).then((item) => {
        woken = item.id
      })
      yield* settle()
      assert.isUndefined(woken)

      namespace.now = 600
      yield* Effect.promise(() => namespace.fireDueAlarms())
      yield* Effect.promise(() => waiting)
      assert.strictEqual(woken, "a")
      // Re-armed at the earliest remaining lease: the waiter's fresh lease.
      assert.strictEqual(store.alarm.current, 1100)
    })
  })

  it.effect("routes each queue name to its own object", () => {
    const namespace = new FakeQueueNamespace()
    return Effect.gen(function*() {
      const left = yield* PersistedQueue.make({ name: "left", schema: Schema.String })
      const right = yield* PersistedQueue.make({ name: "right", schema: Schema.String })
      yield* left.offer("from-left", { id: "a" })
      yield* right.offer("from-right", { id: "a" })
      assert.deepStrictEqual(
        Array.from(namespace.stores.keys()).sort(),
        [objectName("left"), objectName("right")].sort()
      )
      assert.strictEqual(yield* left.take((value) => Effect.succeed(value)), "from-left")
      assert.strictEqual(yield* right.take((value) => Effect.succeed(value)), "from-right")
      // The same name resolves back to the same object.
      const again = yield* PersistedQueue.make({ name: "left", schema: Schema.String })
      yield* again.offer("more", { id: "b" })
      assert.strictEqual(namespace.stores.size, 2)
      assert.strictEqual(yield* left.take((value) => Effect.succeed(value)), "more")
    }).pipe(Effect.provide(namespace.layer))
  })
})

// The store-agnostic PersistedQueueStore contract suite the memory, Redis,
// and SQL stores also run against.
const contractNamespace = new FakeQueueNamespace()
PersistedQueueTest.suite(
  "cloudflare",
  Layer.succeed(PersistedQueue.PersistedQueueStore)(
    CloudflarePersistedQueue.make({ queueNamespace: contractNamespace as never })
  )
)
