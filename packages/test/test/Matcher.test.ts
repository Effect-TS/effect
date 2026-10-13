import * as Data from "effect/Data"
import * as Exit from "effect/Exit"
import * as Optic from "effect/Optic"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Assert from "../src/Assert.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"
import { fails } from "./utils.ts"

const mismatches = (actual: unknown, expected: unknown) => fails(() => Assert.equal(actual, expected)).mismatches

class NotFound extends Data.TaggedError("NotFound")<{ readonly id: number; readonly table: string }> {}
class Forbidden extends Data.TaggedError("Forbidden")<{}> {}

type Shape = { readonly _tag: "Circle"; readonly radius: number } | { readonly _tag: "Square"; readonly side: number }

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
  Test.suite("focus", [
    Test.test("matches through an optic, where shapes can't look (a tagged union's case)", () => {
      const radius = Optic.id<Shape>().tag("Circle").key("radius")
      Assert.equal<{ readonly shape: Shape }>({ shape: { _tag: "Circle", radius: 5 } }, {
        shape: Matcher.focus(radius, Matcher.closeTo(5))
      })
      // mismatches are reported at the matcher's place: an optic doesn't record where it looks
      Assert.equal(
        mismatches({ shape: { _tag: "Circle", radius: 4 } }, { shape: Matcher.focus(radius, 5, "radius") }),
        [
          { path: ["shape"], reason: "radius: expected 5, got 4" }
        ]
      )
    }),
    Test.test("an optic that can't focus says why", () => {
      const radius = Optic.id<Shape>().tag("Circle").key("radius")
      Assert.equal(mismatches({ _tag: "Square", side: 1 }, Matcher.focus(radius, 5)), [
        { path: [], reason: "focus: Expected \"Circle\" tag" }
      ])
    }),
    Test.test("paths inside the focus follow the label; a Traversal's focus is everything it reaches", () => {
      type Owner = { readonly pet: Option.Option<{ readonly name: string; readonly age: number }> }
      const pet = Optic.id<Owner>().key("pet").compose(Optic.some())
      Assert.equal(
        mismatches({ pet: Option.some({ name: "rex", age: 3 }) }, Matcher.focus(pet, { name: "max", age: 3 }, "pet")),
        [
          { path: [], reason: "pet[\"name\"]: expected \"max\", got \"rex\"" }
        ]
      )
      type Drawing = { readonly shapes: ReadonlyArray<Shape> }
      const radii = Optic.id<Drawing>().key("shapes").forEach((shape) => shape.tag("Circle").key("radius"))
      const drawing: Drawing = {
        shapes: [{ _tag: "Circle", radius: 5 }, { _tag: "Square", side: 2 }, { _tag: "Circle", radius: 3 }]
      }
      Assert.equal(drawing, Matcher.focus(radii, Matcher.unordered([3, 5])))
    })
  ]),
  Test.suite("Effect data types", [
    Test.test("some: inside an Option, typed", () => {
      Assert.equal({ found: Option.some({ id: 1, name: "a" }) }, { found: Matcher.some(Matcher.partial({ id: 1 })) })
      Assert.equal(mismatches(Option.some(2), Matcher.some(1)), [{ path: ["value"], expected: "1", actual: "2" }])
      Assert.equal(mismatches(Option.none(), Matcher.some(1)), [{ path: [], reason: "expected Some(1), got None" }])
    }),
    Test.test("success and failure: inside an Exit or a Result", () => {
      Assert.equal(Exit.succeed(1), Matcher.success(1))
      Assert.equal(Result.succeed({ id: 1 }), Matcher.success({ id: 1 }))
      Assert.equal(mismatches(Result.succeed(2), Matcher.success(1)), [{
        path: ["success"],
        expected: "1",
        actual: "2"
      }])
      Assert.equal(Result.fail("e"), Matcher.failure("e"))
      const exit = Exit.fail(new NotFound({ id: 1, table: "users" }))
      Assert.equal(exit, Matcher.failure(Matcher.tag("NotFound", { id: 1 })))
      // the error inside an Exit's Cause has no path of its own: it is named `failure`
      Assert.equal(mismatches(exit, Matcher.failure(Matcher.tag("NotFound", { id: 2 }))), [
        { path: [], reason: "failure[\"id\"]: expected 2, got 1" }
      ])
      Assert.equal(mismatches(Exit.die("boom"), Matcher.failure(Matcher.any)), [
        { path: [], reason: "expected exactly one typed failure, got a Cause with 1 defect" },
        { path: [], reason: "Die(\"boom\")" }
      ])
    }),
    Test.test("tag: the case, and only the fields named", () => {
      const error: NotFound | Forbidden = new NotFound({ id: 1, table: "users" })
      Assert.equal(error, Matcher.tag("NotFound"))
      Assert.equal(error, Matcher.tag("NotFound", { table: Matcher.match(/^u/) }))
      Assert.equal(mismatches(error, Matcher.tag("Forbidden")), [
        { path: ["_tag"], expected: "\"Forbidden\"", actual: "\"NotFound\"" }
      ])
      // a field the case doesn't have is a compile error (and a mismatch)
      // @ts-expect-error: NotFound has no field `nope`
      fails(() => Assert.equal(error, Matcher.tag("NotFound", { nope: 1 })))
    })
  ]),
  Test.test("every: each element matches; empty fails unless allowed", () => {
    const positive = Matcher.where((n: number) => n > 0, "a positive number")
    Assert.equal({ ids: [1, 2, 3] }, { ids: Matcher.every(positive) })
    Assert.equal(mismatches([1, -2, 3, -4], Matcher.every(positive)), [
      { path: [1], reason: "expected a positive number, got -2" },
      { path: [3], reason: "expected a positive number, got -4" }
    ])
    Assert.equal(mismatches([], Matcher.every(positive)), [
      {
        path: [],
        reason: "expected every element to be a positive number, got no elements (allowEmpty: true if that is fine)"
      }
    ])
    Assert.equal([], Matcher.every(positive, { allowEmpty: true }))
  }),
  Test.suite("strings", [
    Test.test("a long string shows where it first differs", () => {
      const expected = "The quick brown fox jumps over the lazy dog, and then it runs away into the forest."
      const actual = expected.replace("lazy", "lucky")
      Assert.equal(mismatches(actual, expected), [{
        path: [],
        reason: [
          "strings differ at index 36 (expected 83 characters, got 84):",
          "expected \"…ick brown fox jumps over the lazy dog, and then it runs away…\"",
          "actual   \"…ick brown fox jumps over the lucky dog, and then it runs awa…\"",
          "                                         ^"
        ].join("\n")
      }])
    }),
    Test.test("a string that spans lines shows which lines differ, with context", () => {
      const expected = ["a", "b", "c", "d", "e", "f", "g"].join("\n")
      const actual = ["a", "b", "c", "D", "e", "f", "g", "h"].join("\n")
      Assert.equal(mismatches({ text: actual }, { text: expected }), [{
        path: ["text"],
        reason: [
          "strings differ: 1 line(s) expected, 2 line(s) instead (- expected, + actual):",
          "  …",
          "  c",
          "- d",
          "+ D",
          "  e",
          "  f",
          "  g",
          "+ h"
        ].join("\n")
      }])
    }),
    Test.test("short strings are shown whole", () => {
      Assert.equal(mismatches({ s: "a" }, { s: "b" }), [{ path: ["s"], expected: "\"b\"", actual: "\"a\"" }])
    })
  ]),
  Test.test("instanceOf, and matchers inside data types via partial", () => {
    Assert.equal({ at: new Date(0) }, { at: Matcher.instanceOf(Date) })
    // inside a data type the types can't follow: say what is matched
    Assert.equal(Option.some({ id: 1, name: "a" }), Matcher.partial<unknown>(Option.some({ id: 1 })))
  })
])
