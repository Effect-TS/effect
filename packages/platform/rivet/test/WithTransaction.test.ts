import * as RivetCluster from "@effect/platform-rivet/RivetCluster"
import { EntityDatabase } from "@effect/platform-rivet/RivetEntityDatabase"
import { assert, describe, layer } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber, Layer, Option, Schedule, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { makeActors } from "./fixtures/inProcess.ts"

class Greeting extends Context.Service<Greeting, { readonly text: string }>()("Greeting") {}

const Op = { op: Schema.String }

class Rejected extends Schema.TaggedError<Rejected>()("Rejected", { op: Schema.String }) {}

// Every RPC is persisted and runs in a handler transaction.
const Tx = Entity.make("Tx", [
  Rpc.make("Write", { payload: Op, primaryKey: ({ op }) => op, success: Schema.Number }),
  Rpc.make("WriteWithServices", {
    payload: Op,
    primaryKey: ({ op }) => op,
    success: Schema.Struct({ greeting: Schema.String, writes: Schema.Number })
  }),
  Rpc.make("WriteDeferred", { payload: Op, primaryKey: ({ op }) => op, success: Schema.Number }),
  Rpc.make("WriteAndBlock", { payload: Op, primaryKey: ({ op }) => op }),
  Rpc.make("WriteThenFail", { payload: Op, primaryKey: ({ op }) => op, error: Rejected })
]).annotateRpcs(ClusterSchema.Persisted, true).annotateRpcs(ClusterSchema.WithTransaction, true)

// Signals from WriteAndBlock, by op.
const blocked = new Map<
  string,
  { readonly wrote: Deferred.Deferred<void>; readonly stopped: Deferred.Deferred<void> }
>()

// Executions of WriteThenFail, by op.
const failRuns = new Map<string, number>()

const insert = Effect.fnUntraced(function*(op: string) {
  const db = yield* EntityDatabase.orDie
  yield* db.execute("INSERT INTO writes (op) VALUES (?)", op)
  const rows = yield* db.execute<{ readonly n: number }>("SELECT COUNT(*) AS n FROM writes WHERE op = ?", op)
  return Number(rows[0].n)
})

const TxLayer = Tx.toLayer(Effect.gen(function*() {
  const db = yield* EntityDatabase.orDie
  yield* db.execute("CREATE TABLE IF NOT EXISTS writes (op TEXT NOT NULL)")
  return Tx.of({
    Write: ({ payload: { op } }) => insert(op),
    WriteWithServices: Effect.fnUntraced(function*({ payload: { op } }) {
      const writes = yield* insert(op)
      const greeting = yield* Greeting
      return { greeting: greeting.text, writes }
    }),
    WriteDeferred: Effect.fnUntraced(function*({ payload: { op } }) {
      const writes = yield* insert(op)
      const reply = yield* Deferred.make<number>()
      yield* Effect.forkDetach(Effect.andThen(Effect.sleep(20), Deferred.succeed(reply, writes)))
      return reply
    }),
    WriteAndBlock: Effect.fnUntraced(function*({ payload: { op } }) {
      const signals = blocked.get(op)!
      yield* insert(op)
      yield* Deferred.succeed(signals.wrote, undefined)
      return yield* Effect.never.pipe(Effect.onInterrupt(() => Deferred.succeed(signals.stopped, undefined)))
    }),
    WriteThenFail: Effect.fnUntraced(function*({ payload: { op } }) {
      failRuns.set(op, (failRuns.get(op) ?? 0) + 1)
      yield* insert(op)
      return yield* new Rejected({ op })
    })
  })
}))

const actors = makeActors()

const ClusterLayer = TxLayer.pipe(
  Layer.provide(Layer.succeed(Greeting, { text: "hello" })),
  Layer.provideMerge(RivetCluster.layer({ entities: [Tx], client: actors.client }))
)

const actor = (entityId: string) => Effect.promise(() => actors.actor(["Tx", entityId]))

const query = (entityId: string, sql: string) =>
  Effect.map(actor(entityId), ({ access }) => access.database.prepare(sql).all() as Array<Record<string, unknown>>)

const count = (entityId: string, sql: string) => Effect.map(query(entityId, sql), (rows) => Number(rows[0].n))

const eventually = <A>(effect: Effect.Effect<A>, done: (value: A) => boolean) =>
  effect.pipe(
    Effect.filterOrFail(done),
    Effect.retry({ schedule: Schedule.spaced(10), times: 200 })
  )

describe("RivetCluster WithTransaction", () => {
  layer(ClusterLayer, { excludeTestServices: true, timeout: 30_000 })((it) => {
    it.effect("keeps the request unprocessed when the handler commit is rejected", () =>
      Effect.gen(function*() {
        const { access } = yield* actor("rejected")
        let rejected = false
        access.onCommit = (name) => {
          if (name !== "cluster_handler" || rejected) return undefined
          rejected = true
          return new Error("commit rejected")
        }
        const client = (yield* Tx.client)("rejected")

        const first = yield* Effect.exit(client.Write({ op: "a" }))
        assert.isTrue(first._tag === "Failure", "the caller must not see a success that did not commit")
        assert.strictEqual(yield* count("rejected", "SELECT COUNT(*) AS n FROM writes"), 0)
        assert.strictEqual(yield* count("rejected", "SELECT COUNT(*) AS n FROM cluster_replies"), 0)
        assert.strictEqual(
          yield* count("rejected", "SELECT COUNT(*) AS n FROM cluster_messages WHERE processed = 0"),
          1
        )

        // The retry replays the stored request, which now commits.
        const second = yield* client.Write({ op: "a" })
        assert.strictEqual(second, 1)
        assert.strictEqual(yield* count("rejected", "SELECT COUNT(*) AS n FROM writes"), 1)
      }))

    it.effect("keeps a committed reply when an interrupt arrives after the commit", () =>
      Effect.gen(function*() {
        const { access, manager } = yield* actor("late-interrupt")
        let interrupting: Fiber.Fiber<void> | undefined
        access.afterCommit = (name) => {
          if (name !== "cluster_handler") return undefined
          access.afterCommit = undefined
          const [row] = access.database.prepare("SELECT request_id FROM cluster_messages").all()
          interrupting = Effect.runFork(manager.interrupt(String(row.request_id)))
          return undefined
        }
        const client = (yield* Tx.client)("late-interrupt")

        yield* Effect.exit(client.Write({ op: "a" }))
        assert.isDefined(interrupting)
        yield* Fiber.join(interrupting!)
        const retry = yield* Effect.exit(client.Write({ op: "a" }))
        assert.deepStrictEqual(retry, Exit.succeed(1))
        assert.strictEqual(yield* count("late-interrupt", "SELECT COUNT(*) AS n FROM writes"), 1)
      }))

    it.effect("runs the handler transaction with the handler's services", () =>
      Effect.gen(function*() {
        const client = (yield* Tx.client)("services")
        const result = yield* client.WriteWithServices({ op: "a" })
        assert.deepStrictEqual(result, { greeting: "hello", writes: 1 })
      }))

    it.effect("interrupting the caller stops the handler and rolls its transaction back", () =>
      Effect.gen(function*() {
        const signals = { wrote: yield* Deferred.make<void>(), stopped: yield* Deferred.make<void>() }
        blocked.set("a", signals)
        const client = (yield* Tx.client)("cancel")

        const call = yield* Effect.forkChild(client.WriteAndBlock({ op: "a" }))
        yield* Deferred.await(signals.wrote)
        yield* Fiber.interrupt(call)
        yield* Deferred.await(signals.stopped).pipe(Effect.timeout("5 seconds"))

        yield* eventually(
          count("cancel", "SELECT COUNT(*) AS n FROM cluster_messages WHERE processed = 1"),
          (n) => n === 1
        )
        assert.strictEqual(yield* count("cancel", "SELECT COUNT(*) AS n FROM writes"), 0)
        const [reply] = yield* query("cancel", "SELECT reply FROM cluster_replies")
        assert.include(String(reply.reply), "Interrupt")
      }))

    it.effect("commits a deferred reply with the handler's writes", () =>
      Effect.gen(function*() {
        const client = (yield* Tx.client)("deferred")
        const writes = yield* client.WriteDeferred({ op: "a" })
        assert.strictEqual(writes, 1)
        assert.strictEqual(yield* count("deferred", "SELECT COUNT(*) AS n FROM writes"), 1)
        assert.strictEqual(yield* count("deferred", "SELECT COUNT(*) AS n FROM cluster_replies"), 1)
      }))

    it.effect("returns the stored reply when the commit lands but its acknowledgement is lost", () =>
      Effect.gen(function*() {
        const { access } = yield* actor("lost-ack")
        access.afterCommit = (name) => {
          if (name !== "cluster_handler") return undefined
          access.afterCommit = undefined
          return new Error("commit acknowledgement lost")
        }
        // The reply is already durable, so no further reply save is needed.
        access.onCommit = (name) => name === "cluster_save_reply" ? new Error("reply save rejected") : undefined
        const client = (yield* Tx.client)("lost-ack")

        const first = yield* Effect.exit(client.Write({ op: "a" }))
        const retry = yield* Effect.exit(client.Write({ op: "a" }))
        access.onCommit = undefined
        assert.deepStrictEqual(first, Exit.succeed(1))
        assert.deepStrictEqual(retry, Exit.succeed(1))
        assert.strictEqual(yield* count("lost-ack", "SELECT COUNT(*) AS n FROM writes"), 1)
        assert.strictEqual(yield* count("lost-ack", "SELECT COUNT(*) AS n FROM cluster_replies"), 1)
      }))

    it.effect("stores a typed handler failure once and rolls back its writes", () =>
      Effect.gen(function*() {
        const client = (yield* Tx.client)("typed-failure")

        const first = yield* Effect.exit(client.WriteThenFail({ op: "a" }))
        assert.deepStrictEqual(first, Exit.fail(new Rejected({ op: "a" })))
        assert.strictEqual(yield* count("typed-failure", "SELECT COUNT(*) AS n FROM writes"), 0)
        assert.strictEqual(
          yield* count("typed-failure", "SELECT COUNT(*) AS n FROM cluster_messages WHERE processed = 1"),
          1
        )

        const retry = yield* Effect.exit(client.WriteThenFail({ op: "a" }))
        assert.deepStrictEqual(retry, Exit.fail(new Rejected({ op: "a" })))
        assert.strictEqual(failRuns.get("a"), 1, "the retry must not run the handler again")
      }))

    it.effect("fails promptly and keeps the request when the handler transaction cannot begin", () =>
      Effect.gen(function*() {
        const { access } = yield* actor("rejected-begin")
        access.onBegin = (name) => {
          if (name !== "cluster_handler") return undefined
          access.onBegin = undefined
          return new Error("BEGIN rejected")
        }
        const client = (yield* Tx.client)("rejected-begin")

        const first = yield* Effect.timeoutOption(Effect.exit(client.Write({ op: "a" })), "5 seconds")
        assert.isTrue(Option.isSome(first), "the call hung after a rejected BEGIN")
        assert.isTrue(Exit.isFailure(first.pipe(Option.getOrThrow)))
        assert.strictEqual(yield* count("rejected-begin", "SELECT COUNT(*) AS n FROM writes"), 0)
        assert.strictEqual(
          yield* count("rejected-begin", "SELECT COUNT(*) AS n FROM cluster_messages WHERE processed = 0"),
          1
        )

        const retry = yield* Effect.exit(client.Write({ op: "a" }))
        assert.deepStrictEqual(retry, Exit.succeed(1))
        assert.strictEqual(yield* count("rejected-begin", "SELECT COUNT(*) AS n FROM writes"), 1)
      }))
  })
})
