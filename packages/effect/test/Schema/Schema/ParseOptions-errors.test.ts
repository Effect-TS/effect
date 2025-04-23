import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("`errors` option", () => {
  describe("decoding", () => {
    describe("tuple", () => {
      it("e r e", async () => {
        const schema = S.Tuple([S.String], S.Number, S.Boolean)
        await Util.assertions.decoding.fail(
          schema,
          [true],
          `readonly [string, ...number[], boolean]
├─ [1]
│  └─ is missing
└─ [0]
   └─ Expected string, actual true`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("missing element", async () => {
        const schema = S.Tuple(S.String, S.Number)
        await Util.assertions.decoding.fail(
          schema,
          [],
          `readonly [string, number]
├─ [0]
│  └─ is missing
└─ [1]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("unexpected indexes", async () => {
        const schema = S.Tuple()
        await Util.assertions.decoding.fail(
          schema,
          ["a", "b"],
          `readonly []
├─ [0]
│  └─ is unexpected, expected: never
└─ [1]
   └─ is unexpected, expected: never`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for elements", async () => {
        const schema = S.Tuple(S.String, S.Number)
        await Util.assertions.decoding.fail(
          schema,
          [1, "b"],
          `readonly [string, number]
├─ [0]
│  └─ Expected string, actual 1
└─ [1]
   └─ Expected number, actual "b"`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for rest", async () => {
        const schema = S.Tuple([S.String], S.Number)
        await Util.assertions.decoding.fail(
          schema,
          ["a", "b", "c"],
          `readonly [string, ...number[]]
├─ [1]
│  └─ Expected number, actual "b"
└─ [2]
   └─ Expected number, actual "c"`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for post rest elements", async () => {
        const schema = S.Tuple([], S.Boolean, S.Number, S.Number)
        await Util.assertions.decoding.fail(
          schema,
          ["a", "b"],
          `readonly [...boolean[], number, number]
├─ [0]
│  └─ Expected number, actual "a"
└─ [1]
   └─ Expected number, actual "b"`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })

    describe("struct", () => {
      it("missing keys", async () => {
        const schema = S.Struct({ a: S.String, b: S.Number })
        await Util.assertions.decoding.fail(
          schema,
          {},
          `{ readonly a: string; readonly b: number }
├─ ["a"]
│  └─ is missing
└─ ["b"]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for values", async () => {
        const schema = S.Struct({ a: S.String, b: S.Number })
        await Util.assertions.decoding.fail(
          schema,
          { a: 1, b: "b" },
          `{ readonly a: string; readonly b: number }
├─ ["a"]
│  └─ Expected string, actual 1
└─ ["b"]
   └─ Expected number, actual "b"`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("unexpected keys", async () => {
        const schema = S.Struct({ a: S.Number })
        await Util.assertions.decoding.fail(
          schema,
          { a: 1, b: "b", c: "c" },
          `{ readonly a: number }
├─ ["b"]
│  └─ is unexpected, expected: "a"
└─ ["c"]
   └─ is unexpected, expected: "a"`,
          { parseOptions: { ...Util.ErrorsAll, ...Util.onExcessPropertyError } }
        )
      })
    })

    describe("record", () => {
      it("all key errors", async () => {
        const schema = S.Record({ key: S.String.pipe(S.minLength(2)), value: S.Number })
        await Util.assertions.decoding.fail(
          schema,
          { a: 1, b: 2 },
          `{ readonly [x: minLength(2)]: number }
├─ ["a"]
│  └─ is unexpected, expected: minLength(2)
└─ ["b"]
   └─ is unexpected, expected: minLength(2)`,
          { parseOptions: { ...Util.ErrorsAll, ...Util.onExcessPropertyError } }
        )
      })

      it("all value errors", async () => {
        const schema = S.Record({ key: S.String, value: S.Number })
        await Util.assertions.decoding.fail(
          schema,
          { a: "a", b: "b" },
          `{ readonly [x: string]: number }
├─ ["a"]
│  └─ Expected number, actual "a"
└─ ["b"]
   └─ Expected number, actual "b"`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })
  })

  describe("encoding", () => {
    describe("tuple", () => {
      it("unexpected indexes", async () => {
        const schema = S.Tuple()
        await Util.assertions.encoding.fail(
          schema,
          [1, 1] as any,
          `readonly []
├─ [0]
│  └─ is unexpected, expected: never
└─ [1]
   └─ is unexpected, expected: never`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for elements", async () => {
        const schema = S.Tuple(Util.NumberFromChar, Util.NumberFromChar)
        await Util.assertions.encoding.fail(
          schema,
          [10, 10],
          `readonly [NumberFromChar, NumberFromChar]
├─ [0]
│  └─ NumberFromChar
│     └─ Encoded side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a single character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for rest", async () => {
        const schema = S.Array(Util.NumberFromChar)
        await Util.assertions.encoding.fail(
          schema,
          [10, 10],
          `ReadonlyArray<NumberFromChar>
├─ [0]
│  └─ NumberFromChar
│     └─ Encoded side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a single character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`,
          { parseOptions: Util.ErrorsAll }
        )
      })

      it("wrong type for values post rest elements", async () => {
        const schema = S.Tuple([], S.String, Util.NumberFromChar, Util.NumberFromChar)
        await Util.assertions.encoding.fail(
          schema,
          [10, 10],
          `readonly [...string[], NumberFromChar, NumberFromChar]
├─ [0]
│  └─ NumberFromChar
│     └─ Encoded side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a single character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })

    describe("struct", () => {
      it("wrong type for values", async () => {
        const schema = S.Struct({ a: Util.NumberFromChar, b: Util.NumberFromChar })
        await Util.assertions.encoding.fail(
          schema,
          { a: 10, b: 10 },
          `{ readonly a: NumberFromChar; readonly b: NumberFromChar }
├─ ["a"]
│  └─ NumberFromChar
│     └─ Encoded side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a single character, actual "10"
└─ ["b"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })

    describe("record", () => {
      it("all key errors", async () => {
        const schema = S.Record({ key: S.Char, value: S.String })
        await Util.assertions.encoding.fail(
          schema,
          { aa: "a", bb: "bb" },
          `{ readonly [x: Char]: string }
├─ ["aa"]
│  └─ is unexpected, expected: Char
└─ ["bb"]
   └─ is unexpected, expected: Char`,
          { parseOptions: { ...Util.ErrorsAll, ...Util.onExcessPropertyError } }
        )
      })

      it("all value errors", async () => {
        const schema = S.Record({ key: S.String, value: S.Char })
        await Util.assertions.encoding.fail(
          schema,
          { a: "aa", b: "bb" },
          `{ readonly [x: string]: Char }
├─ ["a"]
│  └─ Char
│     └─ Predicate refinement failure
│        └─ Expected a single character, actual "aa"
└─ ["b"]
   └─ Char
      └─ Predicate refinement failure
         └─ Expected a single character, actual "bb"`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })
  })
})
