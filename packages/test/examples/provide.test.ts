// `Effect.provide` inside a test body behaves exactly like a nested `Effect.provide` in any
// Effect program: a layer value already built by an enclosing fixture is reused, and
// `Layer.fresh` opts out. Shadowing works as usual: the innermost provide wins.
// The same holds between fixtures: `Test.provide(X)` below another `Test.provide(X)` reuses
// the outer instance, and `Test.provide(Layer.fresh(X))` builds its own. A shared layer from
// the test config (Database) is reused the same way, and `Layer.fresh` opts out of it too.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as assert from "node:assert"
import * as Test from "../src/Test.ts"
import { Database, Seeds, Tx } from "./shared.ts"

const instances = Effect.gen(function*() {
  return { seeds: (yield* Seeds).instance, tx: (yield* Tx).instance, db: (yield* Database).instance }
})

// The root's Seeds and Database under other tags, so inner nodes can compare against them.
class OuterSeeds extends Context.Service<OuterSeeds, Seeds["Service"]>()("OuterSeeds") {
  static layer = Layer.effect(OuterSeeds)(Seeds)
}
class OuterDatabase extends Context.Service<OuterDatabase, Database["Service"]>()("OuterDatabase") {
  static layer = Layer.effect(OuterDatabase)(Database)
}

// Each check is order-independent: the tests in a suite run concurrently.
const seen = { fresh: [] as Array<number>, once: [] as Array<number> }
const composition = Test.suite("composition with Layer.fresh", [
  Test.test(
    "provide(X) below provide(X) reuses the outer instance",
    Effect.gen(function*() {
      assert.deepStrictEqual((yield* Seeds).instance, (yield* OuterSeeds).instance)
    })
  ).pipe(Test.provide(Seeds.layer)),
  ...[1, 2].map((n) =>
    Test.test(
      `provide(Layer.fresh(X)) on a test is fresh (${n})`,
      Effect.gen(function*() {
        const own = (yield* Seeds).instance
        assert.ok(own !== (yield* OuterSeeds).instance && !seen.fresh.includes(own), "a new instance per test")
        seen.fresh.push(own)
      })
    ).pipe(Test.provide(Layer.fresh(Seeds.layer)))
  ),
  Test.suite(
    "provide(Layer.fresh(X)) on a suite",
    [1, 2].map((n) =>
      Test.test(
        `is built once for the suite (${n})`,
        Effect.gen(function*() {
          const own = (yield* Seeds).instance
          assert.ok(own !== (yield* OuterSeeds).instance, "not the outer instance")
          if (seen.once.length > 0) assert.deepStrictEqual(own, seen.once[0])
          seen.once.push(own)
        })
      )
    )
  ).pipe(Test.provide(Layer.fresh(Seeds.layer))),
  Test.suite("Layer.fresh opts out of the shared Database", [
    Test.test(
      "has its own Database",
      Effect.gen(function*() {
        assert.ok((yield* Database).instance !== (yield* OuterDatabase).instance)
      })
    )
  ]).pipe(Test.provide(Layer.fresh(Database.layer)))
])

export default Test.suite("Effect.provide in a body", [
  Test.test(
    "reuses fixtures built above",
    Effect.gen(function*() {
      const fixtures = yield* instances
      const provided = yield* instances.pipe(Effect.provide([Seeds.layer, Tx.layer, Database.layer]))
      assert.deepStrictEqual(provided, fixtures)
    })
  ),
  Test.test(
    "Layer.fresh builds a new instance",
    Effect.gen(function*() {
      const fixture = yield* Seeds
      const fresh = yield* Seeds.pipe(Effect.provide(Layer.fresh(Seeds.layer)))
      assert.ok(fresh.instance !== fixture.instance)
    })
  ),
  Test.test(
    "the innermost provide wins",
    Effect.gen(function*() {
      const db = yield* Database.pipe(Effect.provide(Layer.succeed(Database)({ instance: -1, url: "sqlite://memory" })))
      assert.deepStrictEqual(db.url, "sqlite://memory")
    })
  ),
  composition
]).pipe(
  Test.provide(OuterSeeds.layer),
  Test.provide(OuterDatabase.layer),
  Test.provide(Tx.layer),
  Test.provide(Seeds.layer),
  Test.provide(Database.layer) // shared via etest.config.ts, when the config is used
)
