// One `Test.provide`, lifetime = where it is attached (like `Effect.provide`):
// - on the root suite (Database, Schema): once for this file
// - on a suite (Seeds): once per suite, shared by its tests
// - on a test (Tx): fresh for every test (and every retry attempt)
// Database is also listed as shared in etest.config.ts, so with the config both
// fixtures-a and fixtures-b reuse one lazily built instance. The file doesn't depend on
// that: it passes with and without the config. fixtures-a and fixtures-b are identical on purpose.
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Assert from "../src/Assert.ts"
import * as Test from "../src/Test.ts"
import { Database, Schema_, Seeds, Tx } from "./shared.ts"

const seen: { db?: number; schema?: number; seeds: Record<string, number>; tx: Set<number> } = {
  seeds: {},
  tx: new Set()
}

const checks = (suite: string) =>
  function*() {
    const db = yield* Database
    const schema = yield* Schema_
    const seeds = yield* Seeds
    const tx = yield* Tx
    seen.db ??= db.instance // root suite (or the shared one from the config): one Database
    Assert.equal(db.instance, seen.db)
    Assert.equal(schema.dbInstance, db.instance)
    seen.schema ??= schema.instance // root suite: one Schema for the whole file
    Assert.equal(schema.instance, seen.schema)
    seen.seeds[suite] ??= seeds.instance // suite: one Seeds per suite
    Assert.equal(seeds.instance, seen.seeds[suite])
    Assert.isTrue(!seen.tx.has(tx.instance), "Tx must be fresh per test")
    seen.tx.add(tx.instance)
    tx.writes.push("insert")
    Assert.equal(tx.writes, ["insert"])
  }

// provided on a test: built for every test
const test = (name: string, suite: string) => Test.test(name, Effect.gen(checks(suite))).pipe(Test.provide(Tx.layer))

// Suite<Database | Schema_ | Seeds>  ->  Suite<Database | Schema_>
const suite = (name: string) =>
  Test.suite(name, [test("first", name), test("second", name), test("third", name)]).pipe(
    Test.provide(Seeds.layer)
  )

// One provide per node, layers composed first: Database feeds Schema and stays available to the tests.
export default Test.suite("fixtures", [suite("users"), suite("orders")]).pipe(
  Test.provide(Schema_.layer.pipe(Layer.provideMerge(Database.layer))),
  Test.tags("fixtures")
)
