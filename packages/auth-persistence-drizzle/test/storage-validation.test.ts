import { LifecycleHooks } from "@effect/auth/Hooks"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import { makeWithDefaults } from "drizzle-orm/effect-sqlite-node"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { SqlClient } from "effect/sql/SqlClient"

import * as SqliteNode from "@effect/auth-persistence-drizzle/SqliteNode"
import { mapping, migrate } from "./fixtures/totp-sqlite-consumer.ts"

// Human-requested regression: explicit Drizzle acquisition must reject migration
// drift before a workflow can run; the previous matching-DDL fixture cannot prove it.
it.effect(
  "rejects a declared key missing from the captured database before acquisition or coordination",
  () =>
    Effect.gen(function*() {
      const client = yield* SqlClient

      yield* migrate
      yield* client`drop table totp_example_factors`
      yield* client`create table totp_example_factors (scope text, state text not null, version text not null)`
      const database = yield* makeWithDefaults({})

      const acquire = SqliteNode.makeTotpPersistenceServices(mapping).pipe(
        Effect.provideService(SqliteNode.Database, database)
      )

      let entered = false

      const coordinate = SqliteNode.coordinateTotpPersistence(
        Effect.succeed(database),
        { mapping },
        Effect.sync(() => {
          entered = true
        })
      )

      const rejected = yield* acquire.pipe(
        Effect.as("accepted"),
        Effect.catchTag("TotpConfigurationError", () => Effect.succeed("rejected"))
      )

      const rejectedOwner = yield* coordinate.pipe(
        Effect.as("accepted"),
        Effect.catchTag("TotpConfigurationError", () => Effect.succeed("rejected"))
      )

      assert.strictEqual(rejected, "rejected")
      assert.strictEqual(rejectedOwner, "rejected")
      assert.isFalse(entered)
      yield* client`create unique index totp_factor_scope on totp_example_factors (scope)`
      yield* acquire.pipe(Effect.provide(SqliteClient.layer({ filename: ":memory:" })))
      yield* coordinate
      assert.isTrue(entered)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeCrypto.layer,
          SqliteClient.layer({ filename: ":memory:" }),
          Layer.succeed(LifecycleHooks, {
            before: () => Effect.void,
            after: () => Effect.succeed([])
          })
        )
      )
    )
)
