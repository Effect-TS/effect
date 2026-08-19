import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { completeTell, loadDue, persistRequest } from "@effect/platform-cloudflare/internal/entityMailbox"
import { getEntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityRuntime } from "@effect/platform-cloudflare/internal/entityRuntime"
import { armAlarm, earliestDeliverAt } from "@effect/platform-cloudflare/internal/entityStorage"
import { decodeRequest } from "@effect/platform-cloudflare/internal/entityWire"
import { getSingletonRegistration } from "@effect/platform-cloudflare/internal/singletonRegistry"
import { assert, describe, it } from "@effect/vitest"
import { Cron, Effect, Layer, Option } from "effect"
import { TestClock } from "effect/testing"
import { ClusterCron } from "effect/unstable/cluster"

interface MessageRow {
  readonly requestId: string
  readonly primaryKey: string | null
  readonly envelope: string
  readonly discard: boolean
  readonly deliverAt: number | null
  processed: boolean
}

class FakeSql {
  readonly messages = new Map<string, MessageRow>()

  exec(query: string, ...bindings: Array<unknown>) {
    if (query.includes("FROM cluster_messages m") && query.includes("m.request_id = ?")) {
      const requestId = String(bindings[0])
      const primaryKey = bindings[1]
      const row = this.messages.get(requestId) ?? Array.from(this.messages.values()).find(
        (row) => primaryKey !== null && row.primaryKey === primaryKey
      )
      return this.rows(
        row === undefined ? [] : [{
          request_id: row.requestId,
          discard: row.discard ? 1 : 0,
          processed: row.processed ? 1 : 0,
          reply_to: null,
          last_reply: null
        }]
      )
    }
    if (query.includes("COUNT(*) AS count")) {
      return this.rows([{
        count: Array.from(this.messages.values()).filter((row) => !row.processed).length
      }])
    }
    if (query.includes("COUNT(DISTINCT")) {
      return this.rows([{ count: 0 }])
    }
    if (query.includes("INSERT INTO cluster_messages")) {
      const [requestId, primaryKey, envelope, discard, deliverAt] = bindings
      this.messages.set(String(requestId), {
        requestId: String(requestId),
        primaryKey: primaryKey === null ? null : String(primaryKey),
        envelope: String(envelope),
        discard: Number(discard) === 1,
        deliverAt: deliverAt === null ? null : Number(deliverAt),
        processed: false
      })
      return this.rows([])
    }
    if (query.includes("m.deliver_at IS NOT NULL") && query.includes("m.deliver_at <= ?")) {
      const now = Number(bindings[0])
      return this.rows(
        Array.from(this.messages.values())
          .filter((row) => !row.processed && row.deliverAt !== null && row.deliverAt <= now)
          .map((row) => ({
            envelope: row.envelope,
            discard: row.discard ? 1 : 0,
            deliver_at: row.deliverAt,
            reply_to: null,
            last_reply: null
          }))
      )
    }
    if (query.includes("SET processed = 1") && query.includes("last_reply_id = NULL")) {
      const row = this.messages.get(String(bindings[0]))
      if (row !== undefined) row.processed = true
      return this.rows([])
    }
    if (query.includes("SELECT min(deliver_at)")) {
      const pending = Array.from(this.messages.values())
        .filter((row) => !row.processed && row.deliverAt !== null)
        .map((row) => row.deliverAt!)
      return this.rows([{ deliver_at: pending.length === 0 ? null : Math.min(...pending) }])
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

  deleteAlarm() {
    this.current = null
    return Promise.resolve()
  }

  get storage(): Pick<DurableObjectStorage, "deleteAlarm" | "getAlarm" | "setAlarm"> {
    return this
  }
}

class FakeCronDestination {
  readonly sql = new FakeSql()
  readonly alarm = new FakeAlarm()
  #nextReplyId = 0

  constructor(readonly name: string) {}

  invoke(
    envelope: string,
    discard: boolean,
    delivery?: { readonly deliverAt?: number; readonly primaryKey?: string | null }
  ) {
    const requestId = String(JSON.parse(envelope).requestId)
    const persist = persistRequest(
      this.sql.sql,
      envelope,
      delivery?.primaryKey ?? null,
      discard,
      delivery?.deliverAt ?? null
    )
    const effect = delivery?.deliverAt === undefined
      ? persist
      : Effect.andThen(persist, armAlarm(this.alarm.storage, delivery.deliverAt))
    return Effect.runPromise(
      Effect.as(effect, { _tag: "Success" as const, requestId, replies: [] as ReadonlyArray<string> })
    )
  }

  acknowledge() {
    return Promise.resolve([] as ReadonlyArray<string>)
  }

  fire(now: number) {
    const { alarm, sql } = this
    const nextReplyId = () => `reply-${this.#nextReplyId++}`
    return Effect.gen(function*() {
      alarm.current = null
      for (const row of yield* loadDue(sql.sql, now)) {
        const encoded = JSON.parse(row.envelope)
        const registration = getEntityRegistration(encoded.address.entityType)
        if (registration === undefined) return yield* Effect.die("Missing cron entity registration")
        const request = yield* decodeRequest(registration, row.envelope)
        const runtime = yield* makeEntityRuntime(registration, request.address, nextReplyId)
        yield* runtime.run(request, Option.none(), row.discard, () => Effect.void)
        yield* completeTell(sql.sql, String(request.requestId))
      }
      const next = earliestDeliverAt(sql.sql)
      if (next !== undefined) yield* armAlarm(alarm.storage, next)
    })
  }
}

class FakeEntityNamespace {
  readonly destinations = new Map<string, FakeCronDestination>()

  getByName(name: string) {
    let destination = this.destinations.get(name)
    if (destination === undefined) {
      destination = new FakeCronDestination(name)
      this.destinations.set(name, destination)
    }
    return destination
  }
}

class FakeSingletonNamespace {
  readonly names: Array<string> = []

  getByName(name: string) {
    this.names.push(name)
    return {}
  }
}

describe("ClusterCron", () => {
  it.effect("seeds through Singleton and runs each fire on a delayed destination entity", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0)
      const entityNamespace = new FakeEntityNamespace()
      const singletonNamespace = new FakeSingletonNamespace()
      let runs = 0
      const cron = ClusterCron.make({
        name: "hourly",
        cron: Cron.parseUnsafe("* * * * * *", "UTC"),
        execute: Effect.sync(() => runs++)
      })
      const cluster = CloudflareCluster.layer({
        entities: [],
        entityNamespace: entityNamespace as any,
        workflowNamespace: { getByName: () => ({}) } as any,
        queueNamespace: { getByName: () => ({}) } as any,
        singletonNamespace: singletonNamespace as any
      })
      yield* Layer.build(cron.pipe(Layer.provide(cluster)))

      const seed = getSingletonRegistration("ClusterCron/hourly")
      assert.isDefined(seed)
      yield* seed!.run.pipe(Effect.provideContext(seed!.context))

      assert.deepStrictEqual(singletonNamespace.names, ["Singleton/ClusterCron/hourly"])
      const firstName = "18:ClusterCron/hourly1970-01-01T00:00:01.000Z"
      const first = entityNamespace.destinations.get(firstName)
      assert.isDefined(first)
      const [persisted] = Array.from(first!.sql.messages.values())
      assert.strictEqual(persisted.deliverAt, 1_000)
      assert.strictEqual(persisted.primaryKey, "ClusterCron/hourly/1970-01-01T00:00:01.000Z/run/")
      assert.strictEqual(first!.alarm.current, 1_000)
      assert.strictEqual(runs, 0)

      yield* TestClock.setTime(1_000)
      yield* first!.fire(1_000)

      assert.strictEqual(runs, 1)
      assert.isTrue(persisted.processed)
      assert.strictEqual(first!.alarm.current, null)
      assert.isTrue(entityNamespace.destinations.has("18:ClusterCron/hourly1970-01-01T00:00:02.000Z"))
    }))
})
