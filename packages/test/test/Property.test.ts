// Property tests: Test.property runs a body on generated values, shrinks a failure to a smallest
// failing value, and reports it as data. Its body (internal/property.ts `check`) is tested
// directly here; test/Runner.test.ts checks how a failing one is reported.
import * as Arbitrary from "effect/Arbitrary"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import * as Assert from "../src/Assert.ts"
import { check } from "../src/internal/property.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"
import { failsEffect } from "./utils.ts"

export default Test.suite("property", [
  Test.test(
    "a property that holds passes; its input is a Schema, an Arbitrary, or a tuple or struct of those",
    Effect.gen(function*() {
      yield* check([Schema.Int, Schema.Int], ([a, b]) => Assert.equal(a + b, b + a))
      yield* check({ name: Schema.String, age: Arbitrary.schema(Schema.Int) }, ({ age, name }) => {
        Assert.equal(typeof name, "string")
        Assert.isTrue(Number.isInteger(age))
      })
    })
  ),
  Test.test(
    "a failing assertion is shrunk to a smallest failing value, reported as data",
    Effect.gen(function*() {
      const error = yield* failsEffect(
        check(Schema.Int, (n) => Assert.isTrue(n < 10)).pipe(Random.withSeed(1))
      )
      Assert.equal(error.headline, "property falsified: expected true, got false")
      Assert.equal(
        error.counterexample,
        Matcher.partial({ input: "10", runs: Matcher.where((n: number) => n >= 1, "a run count") })
      )
    })
  ),
  Test.test(
    "returning false, failing and dying falsify a property too",
    Effect.gen(function*() {
      Assert.equal(
        (yield* failsEffect(check(Schema.Int, (n) => n < 50).pipe(Random.withSeed(1)))).headline,
        "property falsified: returned false"
      )
      const failed = yield* failsEffect(
        check(Schema.Int, (n) => n < 50 ? Effect.void : Effect.fail("too big")).pipe(Random.withSeed(1))
      )
      Assert.equal(failed.headline, "property falsified: failed with 1 typed failure")
      Assert.equal(failed.mismatches, [{ path: [], reason: "Fail(\"too big\")" }])
      Assert.equal(Assert.defined(failed.counterexample).input, "50")
      const died = yield* failsEffect(
        check(Schema.Int, (n) => n < 50 ? Effect.void : Effect.die("boom")).pipe(Random.withSeed(1))
      )
      Assert.equal(died.headline, "property falsified: failed with 1 defect")
    })
  ),
  Test.test(
    "the test's seed decides the values, so a failure reproduces; so does its replay token",
    Effect.gen(function*() {
      const nameOrAge = check(
        { name: Schema.String, age: Schema.Int },
        ({ age, name }) => name.length < 3 || age < 10
      )
      const first = Assert.defined((yield* failsEffect(nameOrAge.pipe(Random.withSeed(7)))).counterexample)
      const again = Assert.defined((yield* failsEffect(nameOrAge.pipe(Random.withSeed(7)))).counterexample)
      Assert.equal(again, first)
      const replayed = yield* failsEffect(
        check({ name: Schema.String, age: Schema.Int }, ({ age, name }) => name.length < 3 || age < 10, {
          replay: first.replay
        })
      )
      Assert.equal(Assert.defined(replayed.counterexample).input, first.input)
    })
  ),
  Test.test(
    "a filter that discards everything gives up, and says so",
    Effect.gen(function*() {
      const error = yield* failsEffect(
        check(Arbitrary.filter(Arbitrary.schema(Schema.Int), () => false), () => {})
      )
      Assert.match(error.headline, /^property gave up: \d+ generated values were discarded/)
    })
  ),
  Test.test(
    "each value gets a fresh TestClock",
    Effect.gen(function*() {
      yield* check(Schema.Int, () =>
        Effect.gen(function*() {
          Assert.equal(yield* Clock.currentTimeMillis, 0)
          yield* TestClock.adjust("1 hour")
        }), { runs: 5 })
    })
  ),
  Test.property("Test.property: a test made of one property", { a: Schema.String, b: Schema.String }, ({ a, b }) => {
    Assert.equal((a + b).length, a.length + b.length)
  }, { runs: 50 })
])
