import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > allErrors option", () => {
  describe("decoding", () => {
    describe("tuple", () => {
      it("e r e", async () => {
        const schema = S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean))
        await Util.expectParseFailure(
          schema,
          [true],
          `readonly [string, ...number[], boolean]
├─ [1]
│  └─ is missing
└─ [0]
   └─ Expected a string, actual true`,
          Util.allErrors
        )
      })

      it("missing element", async () => {
        const schema = S.tuple(S.string, S.number)
        await Util.expectParseFailure(
          schema,
          [],
          `readonly [string, number]
├─ [0]
│  └─ is missing
└─ [1]
   └─ is missing`,
          Util.allErrors
        )
      })

      it("unexpected indexes", async () => {
        const schema = S.tuple()
        await Util.expectParseFailure(
          schema,
          ["a", "b"],
          `readonly []
├─ [0]
│  └─ is unexpected, expected never
└─ [1]
   └─ is unexpected, expected never`,
          Util.allErrors
        )
      })

      it("wrong type for elements", async () => {
        const schema = S.tuple(S.string, S.number)
        await Util.expectParseFailure(
          schema,
          [1, "b"],
          `readonly [string, number]
├─ [0]
│  └─ Expected a string, actual 1
└─ [1]
   └─ Expected a number, actual "b"`,
          Util.allErrors
        )
      })

      it("wrong type for rest", async () => {
        const schema = S.tuple(S.string).pipe(S.rest(S.number))
        await Util.expectParseFailure(
          schema,
          ["a", "b", "c"],
          `readonly [string, ...number[]]
├─ [1]
│  └─ Expected a number, actual "b"
└─ [2]
   └─ Expected a number, actual "c"`,
          Util.allErrors
        )
      })

      it("wrong type for post rest elements", async () => {
        const schema = S.array(S.boolean).pipe(S.element(S.number), S.element(S.number))
        await Util.expectParseFailure(
          schema,
          ["a", "b"],
          `readonly [...boolean[], number, number]
├─ [0]
│  └─ Expected a number, actual "a"
└─ [1]
   └─ Expected a number, actual "b"`,
          Util.allErrors
        )
      })
    })

    describe("struct", () => {
      it("missing keys", async () => {
        const schema = S.struct({ a: S.string, b: S.number })
        await Util.expectParseFailure(
          schema,
          {},
          `{ a: string; b: number }
├─ ["a"]
│  └─ is missing
└─ ["b"]
   └─ is missing`,
          Util.allErrors
        )
      })

      it("wrong type for values", async () => {
        const schema = S.struct({ a: S.string, b: S.number })
        await Util.expectParseFailure(
          schema,
          { a: 1, b: "b" },
          `{ a: string; b: number }
├─ ["a"]
│  └─ Expected a string, actual 1
└─ ["b"]
   └─ Expected a number, actual "b"`,
          Util.allErrors
        )
      })

      it("unexpected keys", async () => {
        const schema = S.struct({ a: S.number })
        await Util.expectParseFailure(
          schema,
          { a: 1, b: "b", c: "c" },
          `{ a: number }
├─ ["b"]
│  └─ is unexpected, expected "a"
└─ ["c"]
   └─ is unexpected, expected "a"`,
          { ...Util.allErrors, ...Util.onExcessPropertyError }
        )
      })
    })

    describe("record", () => {
      it("all key errors", async () => {
        const schema = S.record(S.string.pipe(S.minLength(2)), S.number)
        await Util.expectParseFailure(
          schema,
          { a: 1, b: 2 },
          `{ [x: string]: number }
├─ ["a"]
│  └─ is unexpected, expected a string at least 2 character(s) long
└─ ["b"]
   └─ is unexpected, expected a string at least 2 character(s) long`,
          { ...Util.allErrors, ...Util.onExcessPropertyError }
        )
      })

      it("all value errors", async () => {
        const schema = S.record(S.string, S.number)
        await Util.expectParseFailure(
          schema,
          { a: "a", b: "b" },
          `{ [x: string]: number }
├─ ["a"]
│  └─ Expected a number, actual "a"
└─ ["b"]
   └─ Expected a number, actual "b"`,
          Util.allErrors
        )
      })
    })
  })

  describe("encoding", () => {
    describe("tuple", () => {
      it("unexpected indexes", async () => {
        const schema = S.tuple()
        await Util.expectEncodeFailure(
          schema,
          [1, 1] as any,
          `readonly []
├─ [0]
│  └─ is unexpected, expected never
└─ [1]
   └─ is unexpected, expected never`,
          Util.allErrors
        )
      })

      it("wrong type for elements", async () => {
        const schema = S.tuple(Util.NumberFromChar, Util.NumberFromChar)
        await Util.expectEncodeFailure(
          schema,
          [10, 10],
          `readonly [NumberFromChar, NumberFromChar]
├─ [0]
│  └─ NumberFromChar
│     └─ From side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a character, actual "10"`,
          Util.allErrors
        )
      })

      it("wrong type for rest", async () => {
        const schema = S.array(Util.NumberFromChar)
        await Util.expectEncodeFailure(
          schema,
          [10, 10],
          `ReadonlyArray<NumberFromChar>
├─ [0]
│  └─ NumberFromChar
│     └─ From side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a character, actual "10"`,
          Util.allErrors
        )
      })

      it("wrong type for values post rest elements", async () => {
        const schema = S.array(S.string).pipe(
          S.element(Util.NumberFromChar),
          S.element(Util.NumberFromChar)
        )
        await Util.expectEncodeFailure(
          schema,
          [10, 10],
          `readonly [...string[], NumberFromChar, NumberFromChar]
├─ [0]
│  └─ NumberFromChar
│     └─ From side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a character, actual "10"
└─ [1]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a character, actual "10"`,
          Util.allErrors
        )
      })
    })

    describe("struct", () => {
      it("wrong type for values", async () => {
        const schema = S.struct({ a: Util.NumberFromChar, b: Util.NumberFromChar })
        await Util.expectEncodeFailure(
          schema,
          { a: 10, b: 10 },
          `{ a: NumberFromChar; b: NumberFromChar }
├─ ["a"]
│  └─ NumberFromChar
│     └─ From side transformation failure
│        └─ Char
│           └─ Predicate refinement failure
│              └─ Expected a character, actual "10"
└─ ["b"]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a character, actual "10"`,
          Util.allErrors
        )
      })
    })

    describe("record", () => {
      it("all key errors", async () => {
        const schema = S.record(Util.Char, S.string)
        await Util.expectEncodeFailure(
          schema,
          { aa: "a", bb: "bb" },
          `{ [x: string]: string }
├─ ["aa"]
│  └─ is unexpected, expected a character
└─ ["bb"]
   └─ is unexpected, expected a character`,
          { ...Util.allErrors, ...Util.onExcessPropertyError }
        )
      })

      it("all value errors", async () => {
        const schema = S.record(S.string, Util.Char)
        await Util.expectEncodeFailure(
          schema,
          { a: "aa", b: "bb" },
          `{ [x: string]: Char }
├─ ["a"]
│  └─ Char
│     └─ Predicate refinement failure
│        └─ Expected a character, actual "aa"
└─ ["b"]
   └─ Char
      └─ Predicate refinement failure
         └─ Expected a character, actual "bb"`,
          Util.allErrors
        )
      })
    })
  })
})
