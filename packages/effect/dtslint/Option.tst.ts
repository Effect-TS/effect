import { hole, Option, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const number: Option.Option<number>
declare const string: Option.Option<string>
declare const numberOrString: Option.Option<string | number>

declare const primitiveNumber: number
declare const primitiveNumberOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

describe("Option", () => {
  it("liftPredicate", () => {
    expect(
      Option.liftPredicate(primitiveNumberOrString, Predicate.isString)
    ).type.toBe<Option.Option<string>>()
    expect(
      pipe(primitiveNumberOrString, Option.liftPredicate(Predicate.isString))
    ).type.toBe<Option.Option<string>>()

    expect(
      Option.liftPredicate(
        primitiveNumberOrString,
        (n): n is number => {
          expect(n).type.toBe<string | number>()
          return typeof n === "number"
        }
      )
    ).type.toBe<Option.Option<number>>()
    expect(
      pipe(
        primitiveNumberOrString,
        Option.liftPredicate(
          (n): n is number => {
            expect(n).type.toBe<string | number>()
            return typeof n === "number"
          }
        )
      )
    ).type.toBe<Option.Option<number>>()

    expect(
      Option.liftPredicate(primitiveNumber, predicateNumbersOrStrings)
    ).type.toBe<Option.Option<number>>()
    expect(
      pipe(primitiveNumber, Option.liftPredicate(predicateNumbersOrStrings))
    ).type.toBe<Option.Option<number>>()
  })

  it("getOrElse", () => {
    expect(Option.getOrElse(Option.some("a"), () => null)).type.toBe<string | null>()
    expect(pipe(Option.some("a"), Option.getOrElse(() => null))).type.toBe<string | null>()
  })

  it("filter", () => {
    expect(Option.filter(number, predicateNumbersOrStrings)).type.toBe<Option.Option<number>>()
    expect(pipe(number, Option.filter(predicateNumbersOrStrings))).type.toBe<Option.Option<number>>()

    expect(pipe(numberOrString, Option.filter(Predicate.isString))).type.toBe<Option.Option<string>>()
    expect(Option.filter(numberOrString, Predicate.isString)).type.toBe<Option.Option<string>>()

    expect(
      Option.filter(number, (value) => {
        expect(value).type.toBe<number>()
        return true
      })
    ).type.toBe<Option.Option<number>>()
    expect(
      pipe(
        number,
        Option.filter((value) => {
          expect(value).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<Option.Option<number>>()
  })

  describe("all", () => {
    it("tuple", () => {
      expect(Option.all([])).type.toBe<Option.Option<[]>>()
      expect(Option.all([Option.some(1)])).type.toBe<Option.Option<[number]>>()
      expect(Option.all([Option.some(1), Option.some("b")])).type.toBe<Option.Option<[number, string]>>()
      expect(pipe([Option.some(1), Option.some("b")] as const, Option.all)).type.toBe<Option.Option<[number, string]>>()
    })

    it("struct", () => {
      expect(Option.all({})).type.toBe<Option.Option<{}>>()
      expect(Option.all({ a: Option.some(1) })).type.toBe<Option.Option<{ a: number }>>()
      expect(Option.all({ a: Option.some(1), b: Option.some("b") }))
        .type.toBe<Option.Option<{ a: number; b: string }>>()
      expect(pipe({ a: Option.some(1), b: Option.some("b") }, Option.all))
        .type.toBe<Option.Option<{ a: number; b: string }>>()
    })

    it("array", () => {
      const optionArray = hole<Array<Option.Option<string>>>()
      expect(Option.all(optionArray)).type.toBe<Option.Option<Array<string>>>()
      expect(pipe(optionArray, Option.all)).type.toBe<Option.Option<Array<string>>>()
    })

    it("record", () => {
      const optionRecord = hole<Record<string, Option.Option<string>>>()
      expect(Option.all(optionRecord)).type.toBe<Option.Option<{ [x: string]: string }>>()
      expect(pipe(optionRecord, Option.all)).type.toBe<Option.Option<{ [x: string]: string }>>()
    })
  })

  it("exists", () => {
    if (Option.exists(Predicate.isString)(numberOrString)) {
      expect(numberOrString).type.toBe<Option.Option<string>>()
    }
    if (Option.exists(numberOrString, Predicate.isString)) {
      expect(numberOrString).type.toBe<Option.Option<string>>()
    }

    expect(
      Option.exists(number, (value) => {
        expect(value).type.toBe<number>()
        return true
      })
    ).type.toBe<boolean>()
    expect(
      pipe(
        number,
        Option.exists((value) => {
          expect(value).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<boolean>()
  })

  it("andThen", () => {
    expect(Option.andThen(numberOrString, numberOrString))
      .type.toBe<Option.Option<string | number>>()
    expect(Option.andThen(numberOrString, () => numberOrString))
      .type.toBe<Option.Option<string | number>>()
    expect(numberOrString.pipe(Option.andThen(numberOrString)))
      .type.toBe<Option.Option<string | number>>()
    expect(numberOrString.pipe(Option.andThen(() => numberOrString)))
      .type.toBe<Option.Option<string | number>>()
  })

  it("Option.Value type helper", () => {
    type V = Option.Option.Value<typeof numberOrString>
    expect<V>().type.toBe<string | number>()
  })

  it("do notation", () => {
    expect(
      pipe(
        Option.Do,
        Option.bind("a", (scope) => {
          expect(scope).type.toBe<{}>()
          return Option.some(1)
        }),
        Option.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Option.some("b")
        }),
        Option.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Option.Option<{ a: number; b: string; c: boolean }>>()

    expect(
      pipe(
        Option.some(1),
        Option.bindTo("a"),
        Option.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Option.some("b")
        }),
        Option.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Option.Option<{ a: number; b: string; c: boolean }>>()
  })

  describe("firstSomeOf", () => {
    it("should error for invalid type parameter", () => {
      expect(Option.firstSomeOf<number>).type.not.toBeCallableWith(
        [number, string]
      )
      expect(pipe).type.not.toBeCallableWith(
        [number, string],
        Option.firstSomeOf<number>
      )
    })

    it("should work for heterogeneous usage", () => {
      expect(Option.firstSomeOf([number, string])).type.toBe<Option.Option<string | number>>()
      expect(pipe([number, string], Option.firstSomeOf)).type.toBe<Option.Option<string | number>>()
    })

    it("should work for heterogeneous usage of iterable union", () => {
      expect(
        Option.firstSomeOf(
          hole<
            | Iterable<Option.Option<number>>
            | [Option.Option<string>]
          >()
        )
      ).type.toBe<Option.Option<string | number>>()
      expect(
        pipe(
          hole<
            | Iterable<Option.Option<number>>
            | [Option.Option<string>]
          >(),
          Option.firstSomeOf
        )
      ).type.toBe<Option.Option<string | number>>()
    })
  })
})
