import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Assert from "../src/Assert.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"
import { fails } from "./utils.ts"

const mismatches = (actual: unknown, expected: unknown) => fails(() => Assert.equal(actual, expected)).mismatches

export default Test.suite("Matcher", [
  Test.test("any and defined", () => {
    Assert.equal({ a: 1, b: undefined }, { a: Matcher.any, b: Matcher.any })
    Assert.equal({ a: 1 }, { a: Matcher.defined })
    Assert.equal(mismatches({ a: null }, { a: Matcher.defined }), [
      { path: ["a"], reason: "expected a defined value, got null" }
    ])
  }),
  Test.test("make and where", () => {
    const even = Matcher.make("an even number", (n: number) => n % 2 === 0 ? undefined : `${n} is odd`)
    Assert.equal([2, 4], [even, even])
    Assert.equal(mismatches([3], [even]), [{ path: [0], reason: "3 is odd" }])
  }),
  Test.suite("partial", [
    Test.test("ignores keys the expected value doesn't mention, at every depth", () => {
      const user = { id: 1, name: "ann", address: { city: "x", zip: "1" } }
      Assert.equal(user, Matcher.partial({ name: "ann", address: { zip: "1" } }))
      Assert.equal(mismatches(user, Matcher.partial({ address: { zip: "2" } })), [
        { path: ["address", "zip"], expected: "\"2\"", actual: "\"1\"" }
      ])
    }),
    Test.test("arrays keep their length; their elements match partially", () => {
      Assert.equal([{ a: 1, b: 2 }], Matcher.partial([{ a: 1 }]))
      Assert.equal(mismatches([{ a: 1 }, { a: 2 }], Matcher.partial([{ a: 1 }])), [
        { path: [1], reason: "unexpected element {\"a\":2}" }
      ])
    }),
    Test.test("a missing key is still missing", () => {
      Assert.equal(mismatches({ a: 1 }, Matcher.partial({ b: 1 })), [{ path: ["b"], reason: "missing, expected 1" }])
    })
  ]),
  Test.suite("unordered", [
    Test.test("same elements in any order, reporting what is missing and unexpected", () => {
      Assert.equal([3, 1, 2], Matcher.unordered([1, 2, 3]))
      Assert.equal(new Set(["a", "b"]), Matcher.unordered(["b", "a"]))
      Assert.equal(mismatches([1, 1, 2], Matcher.unordered([1, 2, 2])), [
        { path: [], reason: "missing element 2" },
        { path: [], reason: "unexpected element 1" }
      ])
    }),
    Test.test("overlapping matchers are paired so that everything can match", () => {
      // a greedy pairing would give 2 to `any` and leave `2` unmatched
      Assert.equal([2, 5], Matcher.unordered([Matcher.any, 2]))
    })
  ]),
  Test.test("schema", () => {
    const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
    Assert.equal([{ id: 1, name: "a" }], [Matcher.schema(User)])
    Assert.equal(mismatches({ user: { id: "1", name: "a" } }, { user: Matcher.schema(User) }), [
      { path: ["user", "id"], reason: "Expected number" }
    ])
  }),
  Test.test("includes and match", () => {
    Assert.equal({ tags: ["a", "b"], text: "hello world" }, {
      tags: Matcher.includes("b"),
      text: Matcher.and(Matcher.includes("world"), Matcher.match(/^hello/))
    })
    Assert.equal(mismatches(["a"], Matcher.includes("b")), [{ path: [], reason: "no element equals \"b\": [\"a\"]" }])
  }),
  Test.test("closeTo", () => {
    Assert.equal({ total: 0.1 + 0.2 }, { total: Matcher.closeTo(0.3) })
    Assert.equal(mismatches(1.5, Matcher.closeTo(1, { abs: 0.1 })), [
      { path: [], reason: "expected a number within ±0.1 of 1, got 1.5" }
    ])
  }),
  Test.test("not, and, or", () => {
    Assert.equal(1, Matcher.not(2))
    Assert.equal(mismatches(2, Matcher.not(2)), [{ path: [], reason: "expected not 2, got 2" }])
    Assert.equal(3, Matcher.or(1, 2, 3))
    Assert.equal(mismatches(4, Matcher.or(1, 2)), [{ path: [], reason: "expected 1 or 2, got 4" }])
    Assert.equal(
      fails(() => Assert.equal(5, Matcher.and(Matcher.closeTo(4, { abs: 2 }), 6))).headline,
      "expected 6, got 5"
    )
  }),
  Test.test("instanceOf, and matchers inside data types via partial", () => {
    Assert.equal({ at: new Date(0) }, { at: Matcher.instanceOf(Date) })
    // inside a data type the types can't follow: say what is matched
    Assert.equal(Option.some({ id: 1, name: "a" }), Matcher.partial<unknown>(Option.some({ id: 1 })))
  })
])
