// Fixture layers shared by several test files. Module state lives once per
// executor (worker), which is what lets config-shared layers match by Layer identity.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export const acquisitions = { database: 0, schema: 0, seeds: 0, tx: 0 }
export const releases = { schema: 0, seeds: 0, tx: 0 }

const counted = (name: "schema" | "seeds" | "tx") =>
  Effect.acquireRelease(
    Effect.sync(() => ({ instance: ++acquisitions[name] })),
    () => Effect.sync(() => void releases[name]++)
  )

/** Expensive: e.g. a database container. Listed as shared in effect-test.config.ts. */
export class Database
  extends Context.Service<Database, { readonly instance: number; readonly url: string }>()("Database")
{
  static layer = Layer.effect(Database)(
    Effect.sync(() => ({ instance: ++acquisitions.database, url: "postgres://test" }))
  )
}

/** E.g. a schema migrated once per file. Depends on Database. */
export class Schema_
  extends Context.Service<Schema_, { readonly instance: number; readonly dbInstance: number }>()("Schema")
{
  static layer = Layer.effect(Schema_)(Effect.gen(function*() {
    const db = yield* Database
    const { instance } = yield* counted("schema")
    return { instance, dbInstance: db.instance }
  }))
}

/** E.g. seeded rows for one group of tests. */
export class Seeds extends Context.Service<Seeds, { readonly instance: number }>()("Seeds") {
  static layer = Layer.effect(Seeds)(counted("seeds"))
}

/** E.g. a transaction rolled back after each test. */
export class Tx extends Context.Service<Tx, { readonly instance: number; readonly writes: Array<string> }>()("Tx") {
  static layer = Layer.effect(Tx)(Effect.map(counted("tx"), ({ instance }) => ({ instance, writes: [] })))
}
