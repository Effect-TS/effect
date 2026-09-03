import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Option, PubSub, Schema } from "effect"
import * as EventJournal from "effect/unstable/eventlog/EventJournal"
import * as SqlEventJournal from "effect/unstable/eventlog/SqlEventJournal"
import { Reactivity } from "effect/unstable/reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError"

const makeSqlFixture = Effect.gen(function*() {
  const sql = yield* SqliteClient.make({ filename: ":memory:" })
  const journal = yield* SqlEventJournal.make().pipe(Effect.provideService(SqlClient.SqlClient, sql))
  return { journal, sql }
}).pipe(Effect.provide(Reactivity.layer))

const input = {
  event: "UserChanged",
  primaryKey: "user-1",
  payload: new Uint8Array([1])
}

class Rejected extends Schema.TaggedError<Rejected>()("Rejected", {}) {}

const rejected = new Rejected()
const callerSqlError = new SqlError({
  reason: new UnknownError({ cause: "caller-owned", message: "callback SQL failure" })
})
const callerJournalError = new EventJournal.EventJournalError({ method: "caller", cause: "caller-owned" })
const failures = [
  ["domain", rejected],
  ["primitive", "callback rejected"],
  ["caller SqlError", callerSqlError],
  ["caller EventJournalError", callerJournalError]
] as const

for (
  const { make, name } of [
    { name: "SQLite", make: makeSqlFixture.pipe(Effect.map(({ journal }) => journal)) },
    { name: "memory", make: EventJournal.makeMemory }
  ]
) {
  describe(`${name} callback error ownership`, () => {
    for (const [label, failure] of failures) {
      it.effect(`write preserves ${label} identity`, () =>
        Effect.gen(function*() {
          const journal = yield* make
          let calls = 0
          const actual = yield* Effect.flip(journal.write({
            ...input,
            effect: () => {
              calls++
              return Effect.fail(failure)
            }
          }))
          assert.strictEqual(calls, 1)
          assert.strictEqual(actual, failure)
        }))

      it.effect(`nonempty remote preserves ${label} identity`, () =>
        Effect.gen(function*() {
          const journal = yield* make
          yield* journal.write({ ...input, effect: () => Effect.void })
          let calls = 0
          const actual = yield* Effect.flip(
            journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), (entries) => {
              calls++
              assert.strictEqual(entries.length, 1)
              assert.strictEqual(entries[0].event, input.event)
              return Effect.fail(failure)
            })
          )
          assert.strictEqual(calls, 1)
          assert.strictEqual(actual, failure)
        }))
    }

    for (const failure of [rejected, callerSqlError]) {
      it.effect(`write supports catchTag recovery for ${failure._tag}`, () =>
        Effect.gen(function*() {
          const journal = yield* make
          const actual = yield* journal.write({ ...input, effect: () => Effect.fail(failure) }).pipe(
            Effect.catchTag(failure._tag, (error) => Effect.succeed(error))
          )
          assert.strictEqual(actual, failure)
        }))

      it.effect(`nonempty remote supports catchTag recovery for ${failure._tag}`, () =>
        Effect.gen(function*() {
          const journal = yield* make
          yield* journal.write({ ...input, effect: () => Effect.void })
          const actual = yield* journal.withRemoteUncommited(
            EventJournal.makeRemoteIdUnsafe(),
            () => Effect.fail(failure)
          ).pipe(Effect.catchTag(failure._tag, (error) => Effect.succeed(error)))
          assert.strictEqual(actual, failure)
        }))
    }

    it.effect("write preserves success identity and publishes only after callback", () =>
      Effect.gen(function*() {
        const journal = yield* make
        const changes = yield* journal.changes
        const token = { accepted: true }
        let calls = 0
        const actual = yield* journal.write({
          ...input,
          effect: () =>
            Effect.gen(function*() {
              calls++
              assert.deepStrictEqual(yield* journal.entries, [])
              assert.deepStrictEqual(yield* PubSub.takeUpTo(changes, 10), [])
              return token
            })
        })
        assert.strictEqual(calls, 1)
        assert.strictEqual(actual, token)
        const entries = yield* journal.entries
        assert.strictEqual(entries.length, 1)
        const published = yield* PubSub.takeUpTo(changes, 10)
        assert.deepStrictEqual(published.map((entry) => entry.idString), entries.map((entry) => entry.idString))
      }))

    it.effect("nonempty remote preserves success value identity", () =>
      Effect.gen(function*() {
        const journal = yield* make
        yield* journal.write({ ...input, effect: () => Effect.void })
        const token = { accepted: true }
        let calls = 0
        const actual = yield* journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), (entries) => {
          calls++
          assert.strictEqual(entries.length, 1)
          return Effect.succeed(token)
        })
        if (Option.isNone(actual)) assert.fail("Expected Some(callback result)")
        assert.strictEqual(actual.value, token)
        assert.strictEqual(calls, 1)
      }))

    it.effect("empty remote skips callback and returns None", () =>
      Effect.gen(function*() {
        const journal = yield* make
        let calls = 0
        const actual = yield* journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), () => {
          calls++
          return Effect.fail(rejected)
        })
        assert.deepStrictEqual(actual, Option.none())
        assert.strictEqual(calls, 0)
      }))

    it.effect("callback failures never commit or publish a local write", () =>
      Effect.gen(function*() {
        const journal = yield* make
        const changes = yield* journal.changes
        for (const [, failure] of failures) {
          yield* Effect.flip(journal.write({ ...input, effect: () => Effect.fail(failure) }))
          assert.deepStrictEqual(yield* journal.entries, [])
          assert.deepStrictEqual(yield* PubSub.takeUpTo(changes, 10), [])
        }
        yield* journal.write({ ...input, effect: () => Effect.void })
        assert.strictEqual((yield* journal.entries).length, 1)
        assert.strictEqual((yield* PubSub.takeUpTo(changes, 10)).length, 1)
      }))

    it.effect("callback failures leave remote entries uncommitted and publish nothing", () =>
      Effect.gen(function*() {
        const journal = yield* make
        yield* journal.write({ ...input, effect: () => Effect.void })
        const before = yield* journal.entries
        const changes = yield* journal.changes
        const remoteId = EventJournal.makeRemoteIdUnsafe()
        let calls = 0
        for (const [, failure] of failures) {
          yield* Effect.flip(journal.withRemoteUncommited(remoteId, (entries) => {
            calls++
            assert.deepStrictEqual(entries.map((entry) => entry.idString), before.map((entry) => entry.idString))
            return Effect.fail(failure)
          }))
          assert.deepStrictEqual(yield* journal.entries, before)
          assert.deepStrictEqual(yield* PubSub.takeUpTo(changes, 10), [])
          assert.strictEqual(yield* journal.nextRemoteSequence(remoteId), 0)
        }
        assert.strictEqual(calls, failures.length)
        const remaining = yield* journal.withRemoteUncommited(remoteId, (entries) => Effect.succeed(entries))
        if (Option.isNone(remaining)) assert.fail("Failed callbacks must not acknowledge entries")
        assert.deepStrictEqual(remaining.value.map((entry) => entry.idString), before.map((entry) => entry.idString))
      }))

    for (const method of ["write", "withRemoteUncommited"] as const) {
      it.effect(`${method} preserves callback defects`, () =>
        Effect.gen(function*() {
          const journal = yield* make
          if (method === "withRemoteUncommited") {
            yield* journal.write({ ...input, effect: () => Effect.void })
          }
          const defect = new Error("callback defect")
          const exit = yield* Effect.exit(
            method === "write"
              ? journal.write({ ...input, effect: () => Effect.die(defect) })
              : journal.withRemoteUncommited(EventJournal.makeRemoteIdUnsafe(), () => Effect.die(defect))
          )
          if (Exit.isSuccess(exit)) assert.fail("Expected a callback defect")
          assert.strictEqual(Cause.squash(exit.cause), defect)
          assert.deepStrictEqual(Cause.findErrorOption(exit.cause), Option.none())
        }))
    }
  })
}

describe("SQLite journal-owned failures", () => {
  it.effect("wraps insert failure after a successful callback without publishing", () =>
    Effect.gen(function*() {
      const { journal, sql } = yield* makeSqlFixture
      const token = { accepted: true }
      assert.strictEqual(yield* journal.write({ ...input, effect: () => Effect.succeed(token) }), token)
      assert.strictEqual((yield* journal.entries).length, 1)
      const changes = yield* journal.changes
      yield* sql`DROP TABLE effect_event_journal`
      let calls = 0
      const actual = yield* Effect.flip(journal.write({
        ...input,
        effect: () => {
          calls++
          return Effect.succeed(token)
        }
      }))
      assert.strictEqual(calls, 1)
      assert.instanceOf(actual, EventJournal.EventJournalError)
      assert.strictEqual(actual.method, "write")
      if (!(actual.cause instanceof SqlError)) assert.fail("Expected an owned SqlError cause")
      assert.instanceOf(actual.cause.reason.cause, Error)
      assert.include(String(actual.cause.reason.cause), "no such table: effect_event_journal")
      assert.deepStrictEqual(yield* PubSub.takeUpTo(changes, 10), [])
    }))

  for (const method of ["entries", "withRemoteUncommited"] as const) {
    for (const fault of ["SELECT", "decode"] as const) {
      it.effect(`${method} wraps owned ${fault} failure before callback`, () =>
        Effect.gen(function*() {
          const { journal, sql } = yield* makeSqlFixture
          yield* journal.write({ ...input, effect: () => Effect.void })
          const remoteId = EventJournal.makeRemoteIdUnsafe()
          const token = { accepted: true }
          let calls = 0
          const callback = () => {
            calls++
            return Effect.succeed(token)
          }
          const healthy = yield* journal.withRemoteUncommited(remoteId, callback)
          if (Option.isNone(healthy)) assert.fail("Expected a healthy callback before the fixture fault")
          assert.strictEqual(healthy.value, token)
          assert.strictEqual(calls, 1)
          assert.strictEqual((yield* journal.entries).length, 1)
          // Mutate only this test's actual in-memory database, never a mocked decoder/client.
          if (fault === "SELECT") {
            yield* sql`DROP TABLE effect_event_journal`
          } else {
            yield* sql`UPDATE effect_event_journal SET payload = 'invalid-payload'`
          }
          const actual = yield* (method === "entries"
            ? Effect.flip(journal.entries)
            : Effect.flip(journal.withRemoteUncommited(remoteId, callback)))
          assert.instanceOf(actual, EventJournal.EventJournalError)
          assert.strictEqual(actual.method, method)
          assert.strictEqual(calls, 1)
          if (fault === "SELECT") {
            if (!(actual.cause instanceof SqlError)) assert.fail("Expected an owned SqlError cause")
            assert.instanceOf(actual.cause.reason.cause, Error)
            assert.include(String(actual.cause.reason.cause), "no such table: effect_event_journal")
          } else {
            assert.instanceOf(actual.cause, Schema.SchemaError)
            assert.include(String(actual.cause), "payload")
          }
        }))
    }
  }
})
