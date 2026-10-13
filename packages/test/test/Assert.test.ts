import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import * as Assert from "../src/Assert.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"
import { fails, failsEffect } from "./utils.ts"

class Point extends Data.Class<{ readonly x: number; readonly y: number }> {}
class NotFound extends Data.TaggedError("NotFound")<{ readonly id: number }> {}
class Forbidden extends Data.TaggedError("Forbidden")<{}> {}
class User {
  readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

export default Test.suite("Assert", [
  Test.suite("equal", [
    Test.test("primitives, NaN, and the value itself", () => {
      Assert.equal(1, 1)
      Assert.equal(NaN, NaN)
      Assert.equal("a", "a")
      const error = fails(() => Assert.equal(1, 2))
      Assert.equal(error.headline, "expected 2, got 1")
      Assert.equal(error.mismatches, [])
    }),
    Test.test("objects: every differing path, missing and unexpected keys", () => {
      const error = fails(() => Assert.equal<object>({ a: 1, b: { c: [1, 2] }, x: 0 }, { a: 2, b: { c: [1] }, d: 4 }))
      Assert.equal(error.headline, "not equal: 4 differences")
      Assert.equal(error.mismatches, [
        { path: ["a"], expected: "2", actual: "1" },
        { path: ["b", "c", 1], reason: "unexpected element 2" },
        { path: ["d"], reason: "missing, expected 4" },
        { path: ["x"], reason: "unexpected key, got 0" }
      ])
    }),
    Test.test("a missing key differs from an undefined one", () => {
      fails(() => Assert.equal<object>({ a: undefined }, {}))
      fails(() => Assert.equal<object>({}, { a: undefined }))
    }),
    Test.test("objects must share a prototype", () => {
      const error = fails(() => Assert.equal<object>(new User("ann"), { name: "ann" }))
      Assert.equal(error.headline, "expected {\"name\":\"ann\"}, got User({\"name\":\"ann\"})")
      const bare = Object.assign(Object.create(null), { name: "ann" })
      Assert.equal(fails(() => Assert.equal<object>(bare, { name: "ann" })).mismatches, [
        { path: [], reason: "expected a plain object, got an object without a prototype: {\"name\":\"ann\"}" }
      ])
      Assert.equal(new User("ann"), new User("ann"))
    }),
    Test.test("Dates, RegExps, Maps, Sets and Errors", () => {
      Assert.equal(new Date(1), new Date(1))
      fails(() => Assert.equal(new Date(1), new Date(2)))
      Assert.equal(/a/g, /a/g)
      fails(() => Assert.equal(/a/g, /a/))
      Assert.equal(new Map([[1, "a"], [2, "b"]]), new Map([[2, "b"], [1, "a"]]))
      Assert.equal(
        fails(() => Assert.equal(new Map([["k", 1]]), new Map([["k", 2]]))).mismatches,
        [{ path: ["k"], expected: "2", actual: "1" }]
      )
      Assert.equal(new Set([1, 2]), new Set([2, 1]))
      fails(() => Assert.equal(new Set([1, 2]), new Set([1, 3])))
      Assert.equal(new Error("x"), new Error("x"))
      fails(() => Assert.equal(new Error("x"), new Error("y")))
    }),
    Test.test("Effect data types: Equal decides, the diff finds the field", () => {
      Assert.equal(new Point({ x: 1, y: 2 }), new Point({ x: 1, y: 2 }))
      Assert.equal(
        fails(() => Assert.equal(new Point({ x: 1, y: 2 }), new Point({ x: 1, y: 3 }))).mismatches,
        [{ path: ["y"], expected: "3", actual: "2" }]
      )
      Assert.equal(Option.some(1), Option.some(1))
      fails(() => Assert.equal(Option.some(1), Option.none()))
      Assert.equal(Chunk.make(1, 2), Chunk.make(1, 2))
      Assert.equal(fails(() => Assert.equal(Chunk.make(1, 2), Chunk.make(1, 3))).mismatches, [
        { path: [1], expected: "3", actual: "2" }
      ])
      Assert.equal(HashMap.make(["a", 1], ["b", 2]), HashMap.make(["b", 2], ["a", 1]))
      Assert.equal(fails(() => Assert.equal(HashMap.make(["a", 1]), HashMap.make(["a", 2]))).mismatches, [
        { path: ["a"], expected: "2", actual: "1" }
      ])
      Assert.equal(HashSet.make(1, 2), HashSet.make(2, 1))
    }),
    Test.test("cycles", () => {
      const a: any = { name: "a" }
      a.self = a
      const b: any = { name: "a" }
      b.self = b
      Assert.equal(a, b)
    }),
    Test.test("matchers anywhere in the expected value", () => {
      Assert.equal({ id: 7, tags: ["b", "a"], at: new Date() }, {
        id: Matcher.where((n: number) => n > 0, "a positive number"),
        tags: Matcher.unordered(["a", "b"]),
        at: Matcher.instanceOf(Date)
      })
      Assert.equal(
        fails(() => Assert.equal({ id: -1 }, { id: Matcher.where((n: number) => n > 0, "a positive number") }))
          .mismatches,
        [
          { path: ["id"], reason: "expected a positive number, got -1" }
        ]
      )
    }),
    Test.test("an Effect or a Promise as the actual value: a hint", () => {
      Assert.equal(
        fails(() => Assert.equal(Effect.sync(() => 1) as unknown, 1)).headline,
        "the actual value is an Effect, which has not run: did you forget `yield*`?"
      )
      const promise = Promise.resolve(1)
      Assert.equal(
        fails(() => Assert.equal(promise as unknown, 1)).headline,
        "the actual value is a Promise: did you forget `await`?"
      )
    }),
    Test.test("labels go above the message", () => {
      const error = fails(() => Assert.equal(1, 2, "the answer"))
      Assert.equal(error.label, "the answer")
      Assert.equal(error.message, "the answer\nexpected 2, got 1")
    })
  ]),

  Test.suite("notEqual and identical", [
    Test.test("notEqual", () => {
      Assert.notEqual({ a: 1 }, { a: 2 })
      Assert.equal(fails(() => Assert.notEqual({ a: 1 }, { a: 1 })).headline, "expected a value other than {\"a\":1}")
    }),
    Test.test("identical", () => {
      const user = new User("ann")
      Assert.identical(user, user)
      Assert.equal(
        fails(() => Assert.identical(user, new User("ann"))).headline,
        "expected the same instance, got an equal but different one: User({\"name\":\"ann\"})"
      )
    })
  ]),

  Test.suite("shapes: narrow and return", [
    Test.test("some and none", () => {
      Assert.equal(Assert.some(Option.some(1)), 1)
      Assert.equal(fails(() => Assert.some(Option.none())).headline, "expected Some, got None")
      Assert.none(Option.none())
      Assert.equal(fails(() => Assert.none(Option.some(1))).headline, "expected None, got some(1)")
    }),
    Test.test("success and failure of a Result", () => {
      Assert.equal(Assert.success(Result.succeed(1)), 1)
      Assert.equal(Assert.failure(Result.fail("e")), "e")
      Assert.equal(fails(() => Assert.success(Result.fail("e"))).headline, "expected a Success, got Failure(\"e\")")
    }),
    Test.test(
      "failure of an Exit: exactly one typed failure, annotations don't matter",
      Effect.gen(function*() {
        const find = Effect.fn("find")(function*(id: number) {
          return yield* new NotFound({ id })
        })
        const error = Assert.failure(yield* Effect.exit(find(3)))
        Assert.equal(Assert.tag(error, "NotFound").id, 3)
        const died = fails(() => Assert.failure(Exit.die(new Error("boom"))))
        Assert.equal(died.headline, "expected exactly one typed failure, got a Cause with 1 defect")
        Assert.equal(died.mismatches, [{ path: [], reason: "Die(Error: boom)" }])
        Assert.equal(fails(() => Assert.failure(Exit.succeed(1))).headline, "expected a failure, got Success(1)")
      })
    ),
    Test.test(
      "success of an Exit lists the Cause",
      Effect.gen(function*() {
        const exit = yield* Effect.exit(Effect.fail(new Forbidden()))
        const error = fails(() => Assert.success(exit))
        Assert.equal(error.headline, "expected a successful Exit, got a failure with 1 typed failure")
      })
    ),
    Test.test(
      "defect and interrupted",
      Effect.gen(function*() {
        Assert.equal(Assert.defect(Exit.die("boom")), "boom")
        const fiber = yield* Effect.forkChild(Effect.never)
        yield* Fiber.interrupt(fiber)
        Assert.interrupted(yield* Fiber.await(fiber))
        fails(() => Assert.interrupted(Exit.die("boom")))
      })
    ),
    Test.test("tag, instanceOf, defined, single", () => {
      const result = new NotFound({ id: 1 }) as NotFound | Forbidden
      Assert.equal(Assert.tag(result, "NotFound").id, 1)
      Assert.equal(
        fails(() => Assert.tag(result, "Forbidden")).headline,
        "expected _tag \"Forbidden\", got \"NotFound\": NotFound({\"id\":1})"
      )
      Assert.equal(Assert.instanceOf(new User("a") as unknown, User).name, "a")
      Assert.equal(Assert.defined(0 as number | undefined), 0)
      fails(() => Assert.defined(null))
      Assert.equal(Assert.single([1]), 1)
      Assert.equal(fails(() => Assert.single([1, 2])).headline, "expected exactly one element, got 2: [1,2]")
    }),
    Test.test("isTrue and isFalse", () => {
      const [one, two] = [1, 2]
      Assert.isTrue(one < two)
      Assert.isFalse(one > two)
      Assert.equal(fails(() => Assert.isTrue(0)).headline, "expected true, got 0")
    })
  ]),

  Test.suite("errors", [
    Test.test("throws returns what was thrown", () => {
      const error = Assert.instanceOf(Assert.throws(() => JSON.parse("{")), SyntaxError)
      Assert.match(error.message, /JSON/)
      Assert.equal(fails(() => Assert.throws(() => 1)).headline, "expected the function to throw, it returned 1")
      Assert.equal(
        fails(() => Assert.throws(() => Effect.fail("e"))).headline,
        "the function returned an Effect, which doesn't throw: use `Assert.failure(yield* Effect.exit(...))`"
      )
    }),
    Test.test("rejects returns the reason", async () => {
      Assert.equal(await Assert.rejects(Promise.reject("nope")), "nope")
      Assert.equal(
        await Assert.rejects(async () => {
          throw "later"
        }),
        "later"
      )
    }),
    Test.test("fail", () => {
      const error = fails(() => Assert.fail("unreachable", { actual: 1, expected: 2 }))
      Assert.equal(error.headline, "unreachable")
      Assert.equal(error.mismatches, [{ path: [], expected: "2", actual: "1" }])
    })
  ]),

  Test.suite("collections, strings and numbers", [
    Test.test("includes returns the element", () => {
      Assert.includes("hello world", "world")
      Assert.equal(Assert.includes([{ id: 1 }, { id: 2 }], { id: 2 }), { id: 2 })
      Assert.equal(Assert.includes([{ id: 1, name: "a" }], Matcher.partial({ id: 1 })).name, "a")
      Assert.equal(fails(() => Assert.includes([1, 2], 3)).headline, "expected an element equal to 3, got [1,2]")
    }),
    Test.test("match returns the match", () => {
      Assert.equal(Assert.match("order-42", /order-(\d+)/)[1], "42")
      fails(() => Assert.match("x", /y/))
    }),
    Test.test("length", () => {
      Assert.length("abc", 3)
      Assert.length(new Set([1, 2]), 2)
      Assert.length(Chunk.make(1), 1)
      Assert.equal(fails(() => Assert.length([1], 2)).headline, "expected length 2, got 1: [1]")
    }),
    Test.test("every: each failing element by index; empty fails", () => {
      Assert.every([1, 2, 3], Matcher.where((n: number) => n > 0, "positive"))
      const error = fails(() => Assert.every([1, -2, -3], Matcher.where((n: number) => n > 0, "positive")))
      Assert.equal(error.headline, "2 of 3 elements don't match")
      Assert.equal(error.mismatches.map((m) => m.path), [[1], [2]])
      Assert.equal(
        fails(() => Assert.every<number>([], 1)).headline,
        "expected at least one element, got none (pass `allowEmpty: true` if that is fine)"
      )
      Assert.every<number>([], 1, { allowEmpty: true })
    }),
    Test.test("closeTo and order", () => {
      Assert.closeTo(0.1 + 0.2, 0.3)
      Assert.closeTo(101, 100, { rel: 0.01 })
      Assert.equal(
        fails(() => Assert.closeTo(1.5, 1, { abs: 0.1 })).headline,
        "expected a number within ±0.1 of 1, got 1.5"
      )
      Assert.lessThan(1, 2)
      Assert.atMost(2, 2)
      Assert.greaterThan(3n, 2n)
      Assert.atLeast(2, 2)
      Assert.equal(fails(() => Assert.lessThan(2, 1)).headline, "expected 2 to be less than 1")
    })
  ]),

  Test.suite("schema", [
    Test.test("decodes returns the value, or lists the issues by path", () => {
      const User = Schema.Struct({ id: Schema.FiniteFromString, tags: Schema.Array(Schema.String) })
      Assert.equal(Assert.decodes(User, { id: "1", tags: [] }), { id: 1, tags: [] })
      const error = fails(() => Assert.decodes(User, { id: "x", tags: [1] }))
      Assert.equal(error.headline, "expected the input to decode, got 2 issues")
      Assert.equal(error.mismatches.map((m) => m.path), [["id"], ["tags", 0]])
    })
  ]),

  Test.suite("eventually and always", [
    Test.test(
      "eventually advances the TestClock until the check passes",
      Effect.gen(function*() {
        const ready = yield* Ref.make(false)
        yield* Effect.forkChild(Effect.sleep("300 millis").pipe(Effect.andThen(Ref.set(ready, true))))
        const value = yield* Assert.eventually(Effect.gen(function*() {
          Assert.isTrue(yield* Ref.get(ready))
          return "ready"
        }))
        Assert.equal(value, "ready")
      })
    ),
    Test.test(
      "eventually gives up after its timeout, with the last failure",
      Effect.gen(function*() {
        const error = yield* failsEffect(
          Assert.eventually(() => Assert.equal(1, 2), { timeout: "100 millis", interval: "50 millis" })
        )
        Assert.equal(error.headline, "still failing after 3 attempts in 100ms of TestClock time: expected 2, got 1")
      })
    ),
    Test.test(
      "eventually does not retry other failures",
      Effect.gen(function*() {
        const exit = yield* Effect.exit(Assert.eventually(Effect.fail("broken")))
        Assert.equal(Assert.failure(exit), "broken")
      })
    ),
    Test.test(
      "eventually on the live clock sleeps",
      Effect.gen(function*() {
        let calls = 0
        yield* TestClock.withLive(Assert.eventually(() => Assert.atLeast(++calls, 3), { interval: "1 millis" }))
        Assert.equal(calls, 3)
      })
    ),
    Test.test(
      "always holds for its duration, or fails at the first failure",
      Effect.gen(function*() {
        yield* Assert.always(() => Assert.isTrue(true), { during: "1 second", interval: "100 millis" })
        let calls = 0
        const error = yield* failsEffect(
          Assert.always(() => Assert.atMost(++calls, 2), { during: "1 second", interval: "100 millis" })
        )
        Assert.match(error.headline, /^stopped holding after 200ms of TestClock time \(attempt 3/)
      })
    )
  ]),

  Test.suite("soft", [
    Test.test("collects every failed check into one failure", () => {
      const error = fails(() =>
        Assert.soft(() => {
          Assert.equal(1, 2)
          Assert.equal("a", "a")
          Assert.isFalse(true)
        })
      )
      Assert.equal(error.headline, "2 assertions failed")
      Assert.equal(error.failures.map((f) => f.headline), ["expected 2, got 1", "expected false, got true"])
    }),
    Test.test("a narrowing assertion still ends the body, and is listed", () => {
      let after = false
      const error = fails(() =>
        Assert.soft(() => {
          Assert.equal(1, 2)
          Assert.some(Option.none())
          after = true
        })
      )
      Assert.isFalse(after)
      Assert.equal(error.failures.map((f) => f.assertion), ["equal", "some"])
    }),
    Test.test("passes when nothing failed", () => {
      Assert.soft(() => Assert.equal(1, 1))
    }),
    Test.test(
      "an Effect body",
      Effect.gen(function*() {
        const error = yield* failsEffect(Assert.soft(Effect.sync(() => {
          Assert.equal(1, 2)
          Assert.equal(3, 4)
        })))
        Assert.equal(error.failures.length, 2)
      })
    )
  ])
])
