import { LibsqlClient } from "@effect/sql-libsql"
import { assert, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"

let transactionCalls = 0

const transaction = {
  execute: () => Promise.resolve({ rows: [] }),
  commit: () => Promise.resolve(),
  rollback: () => Promise.resolve()
}

const liveClient = {
  execute: () => Promise.resolve({ rows: [] }),
  transaction: () => {
    transactionCalls++
    return transactionCalls === 1
      ? Promise.reject(new Error("transient begin failure"))
      : Promise.resolve(transaction)
  }
}

it.effect("releases transaction serialization after begin fails", () =>
  Effect.gen(function*() {
    transactionCalls = 0
    const client = yield* LibsqlClient.make({ liveClient: liveClient as any })
    const first = yield* Effect.exit(client.withTransaction(Effect.void))
    assert.isTrue(Exit.isFailure(first))

    yield* Effect.forkChild(client.withTransaction(Effect.void))
    yield* Effect.yieldNow

    assert.strictEqual(transactionCalls, 2)
  }).pipe(
    Effect.scoped,
    Effect.provide(Reactivity.layer)
  ))
