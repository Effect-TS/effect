import { Array, Either, hole, Option, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const string$string: Either.Either<string, string>
declare const number$string: Either.Either<number, string>
declare const boolean$string: Either.Either<boolean, string>
declare const boolean$Error: Either.Either<boolean, Error>
declare const literal$Error: Either.Either<"a", Error>

describe("Either", () => {
  it("flip", () => {
    expect(Either.flip(number$string)).type.toBe<Either.Either<string, number>>()
    expect(pipe(number$string, Either.flip)).type.toBe<Either.Either<string, number>>()
  })

  it("try", () => {
    expect(Either.try(() => 1)).type.toBe<Either.Either<number, unknown>>()
    expect(Either.try({ try: () => 1, catch: () => new Error() })).type.toBe<Either.Either<number, Error>>()
  })

  describe("all", () => {
    it("tuple", () => {
      expect(Either.all([])).type.toBe<Either.Either<[], never>>()
      expect(Either.all([number$string])).type.toBe<Either.Either<[number], string>>()
      expect(Either.all([number$string, boolean$string])).type.toBe<Either.Either<[number, boolean], string>>()
      expect(Either.all([number$string, boolean$Error])).type.toBe<Either.Either<[number, boolean], string | Error>>()
      expect(pipe([number$string, boolean$string] as const, Either.all)).type.toBe<
        Either.Either<[number, boolean], string>
      >()
      expect(pipe([number$string, boolean$Error] as const, Either.all)).type.toBe<
        Either.Either<[number, boolean], string | Error>
      >()
    })

    it("struct", () => {
      expect(Either.all({})).type.toBe<Either.Either<{}, never>>()
      expect(Either.all({ a: number$string })).type.toBe<Either.Either<{ a: number }, string>>()
      expect(Either.all({ a: number$string, b: boolean$string })).type.toBe<
        Either.Either<{ a: number; b: boolean }, string>
      >()
      expect(Either.all({ a: number$string, b: boolean$Error })).type.toBe<
        Either.Either<{ a: number; b: boolean }, string | Error>
      >()
      expect(pipe({ a: number$string, b: boolean$string }, Either.all)).type.toBe<
        Either.Either<{ a: number; b: boolean }, string>
      >()
      expect(pipe({ a: number$string, b: boolean$Error }, Either.all)).type.toBe<
        Either.Either<{ a: number; b: boolean }, string | Error>
      >()
    })

    it("array", () => {
      const eitherArray = hole<Array<Either.Either<number, string>>>()
      expect(Either.all(eitherArray)).type.toBe<Either.Either<Array<number>, string>>()
      expect(pipe(eitherArray, Either.all)).type.toBe<Either.Either<Array<number>, string>>()
    })

    it("record", () => {
      const eitherRecord = hole<Record<string, Either.Either<number, string>>>()
      expect(Either.all(eitherRecord)).type.toBe<Either.Either<{ [x: string]: number }, string>>()
      expect(pipe(eitherRecord, Either.all)).type.toBe<Either.Either<{ [x: string]: number }, string>>()
    })
  })

  it("andThen", () => {
    expect(Either.andThen(string$string, number$string)).type.toBe<Either.Either<number, string>>()
    expect(string$string.pipe(Either.andThen(number$string))).type.toBe<Either.Either<number, string>>()

    expect(Either.andThen(string$string, () => number$string)).type.toBe<Either.Either<number, string>>()
    expect(string$string.pipe(Either.andThen(() => number$string))).type.toBe<Either.Either<number, string>>()
  })

  it("liftPredicate", () => {
    const primitiveNumber = hole<number>()
    const stringOrNumber = hole<string | number>()
    const predicateNumberOrString = hole<Predicate.Predicate<number | string>>()
    const refinementNumberOrStringToNumber = hole<Predicate.Refinement<number | string, number>>()

    expect(
      Either.liftPredicate(predicateNumberOrString, (sn) => {
        expect(sn).type.toBe<string | number>()
        return "b" as const
      })
    ).type.toBe<(a: string | number) => Either.Either<string | number, "b">>()
    expect(
      Either.liftPredicate(refinementNumberOrStringToNumber, (sn) => {
        expect(sn).type.toBe<string | number>()
        return "b" as const
      })
    ).type.toBe<(a: string | number) => Either.Either<number, "b">>()

    expect(
      Either.liftPredicate(
        stringOrNumber,
        (sn): sn is number => {
          expect(sn).type.toBe<string | number>()
          return typeof sn === "number"
        },
        (sn) => {
          expect(sn).type.toBe<string | number>()
          return "b" as const
        }
      )
    ).type.toBe<Either.Either<number, "b">>()
    expect(
      pipe(
        stringOrNumber,
        Either.liftPredicate(
          (sn): sn is number => {
            expect(sn).type.toBe<string | number>()
            return typeof sn === "number"
          },
          (sn) => {
            expect(sn).type.toBe<string | number>()
            return "b" as const
          }
        )
      )
    ).type.toBe<Either.Either<number, "b">>()

    expect(
      Either.liftPredicate(stringOrNumber, predicateNumberOrString, (sn) => {
        expect(sn).type.toBe<string | number>()
        return "b" as const
      })
    ).type.toBe<Either.Either<string | number, "b">>()
    expect(
      pipe(
        stringOrNumber,
        Either.liftPredicate(predicateNumberOrString, (sn) => {
          expect(sn).type.toBe<string | number>()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<string | number, "b">>()

    expect(
      Either.liftPredicate(primitiveNumber, predicateNumberOrString, (sn) => {
        expect(sn).type.toBe<string | number>()
        return "b" as const
      })
    ).type.toBe<Either.Either<number, "b">>()
    expect(
      pipe(
        primitiveNumber,
        Either.liftPredicate(predicateNumberOrString, (sn) => {
          expect(sn).type.toBe<string | number>()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<number, "b">>()
  })

  it("fromNullable", () => {
    const nullableString = hole<string | null>()
    const nullableObject = hole<{ a: string } | undefined>()

    expect(
      Either.fromNullable(
        nullableString,
        () => new Error()
      )
    ).type.toBe<Either.Either<string, Error>>()

    expect(
      pipe(
        nullableString,
        Either.fromNullable(() => new Error())
      )
    ).type.toBe<Either.Either<string, Error>>()

    expect(
      Either.fromNullable(nullableObject, () => new Error())
    ).type.toBe<Either.Either<{ a: string }, Error>>()

    expect(
      pipe(
        nullableObject,
        Either.fromNullable(() => new Error())
      )
    ).type.toBe<
      Either.Either<{ a: string }, Error>
    >()
  })

  it("filterOrLeft", () => {
    const predicateUnknown = hole<Predicate.Predicate<unknown>>()

    const arrayOfStrings$Error = hole<Either.Either<Array<string>, Error>>()
    expect(
      Either.filterOrLeft(arrayOfStrings$Error, Array.isNonEmptyArray, (ss) => {
        expect(ss).type.toBe<Array<string>>()
        return "b" as const
      })
    ).type.toBe<Either.Either<[string, ...Array<string>], "b" | Error>>()
    expect(
      pipe(
        arrayOfStrings$Error,
        Either.filterOrLeft(Array.isNonEmptyArray, (ss) => {
          expect(ss).type.toBe<Array<string>>()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<[string, ...Array<string>], "b" | Error>>()

    const readonlyArrayOfStrings$Error = hole<Either.Either<ReadonlyArray<string>, Error>>()
    expect(
      Either.filterOrLeft(readonlyArrayOfStrings$Error, Array.isNonEmptyReadonlyArray, (ss) => {
        expect(ss).type.toBe<ReadonlyArray<string>>()
        return "b" as const
      })
    ).type.toBe<Either.Either<readonly [string, ...Array<string>], "b" | Error>>()
    expect(
      pipe(
        readonlyArrayOfStrings$Error,
        Either.filterOrLeft(Array.isNonEmptyReadonlyArray, (ss) => {
          expect(ss).type.toBe<ReadonlyArray<string>>()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<readonly [string, ...Array<string>], "b" | Error>>()

    // @tstyche fixme -- This doesn't work but it should
    expect(
      Either.filterOrLeft(literal$Error, Predicate.isString, (a) => {
        // @tstyche fixme -- This doesn't work but it should
        expect(a).type.toBe<"a">()
        return "b" as const
      })
    ).type.toBe<Either.Either<"a", "b" | Error>>()
    expect(
      pipe(
        literal$Error,
        Either.filterOrLeft(Predicate.isString, (a) => {
          expect(a).type.toBe<"a">()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<"a", "b" | Error>>()

    // @tstyche fixme -- This doesn't work but it should
    expect(
      Either.filterOrLeft(literal$Error, Predicate.isString, (_s: string) => "b" as const)
    ).type.toBe<Either.Either<"a", "b" | Error>>()
    expect(
      pipe(
        literal$Error,
        Either.filterOrLeft(Predicate.isString, (_s: string) => "b" as const)
      )
    ).type.toBe<Either.Either<"a", "b" | Error>>()

    expect(
      Either.filterOrLeft(literal$Error, predicateUnknown, (a) => {
        expect(a).type.toBe<"a">()
        return "b" as const
      })
    ).type.toBe<Either.Either<"a", "b" | Error>>()
    expect(
      pipe(
        literal$Error,
        Either.filterOrLeft(predicateUnknown, (a) => {
          expect(a).type.toBe<"a">()
          return "b" as const
        })
      )
    ).type.toBe<Either.Either<"a", "b" | Error>>()

    expect(
      Either.filterOrLeft(literal$Error, predicateUnknown, (_s: string) => "b" as const)
    ).type.toBe<Either.Either<"a", "b" | Error>>()
    expect(
      pipe(
        literal$Error,
        Either.filterOrLeft(predicateUnknown, (_s: string) => "b" as const)
      )
    ).type.toBe<Either.Either<"a", "b" | Error>>()
  })

  it("type level helpers", () => {
    type R = Either.Either.Right<typeof number$string>
    type L = Either.Either.Left<typeof number$string>
    expect<R>().type.toBe<number>()
    expect<L>().type.toBe<string>()
  })

  it("do notation", () => {
    expect(
      pipe(
        Either.Do,
        Either.bind("a", (scope) => {
          expect(scope).type.toBe<{}>()
          return Either.right(1)
        }),
        Either.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Either.right("b")
        }),
        Either.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Either.Either<{ a: number; b: string; c: boolean }, never>>()

    expect(
      pipe(
        Either.right(1),
        Either.bindTo("a"),
        Either.bind("b", (scope) => {
          expect(scope).type.toBe<{ a: number }>()
          return Either.right("b")
        }),
        Either.let("c", (scope) => {
          expect(scope).type.toBe<{ a: number; b: string }>()
          return true
        })
      )
    ).type.toBe<Either.Either<{ a: number; b: string; c: boolean }, never>>()
  })
})

it("transposeMapOption", () => {
  expect(Either.transposeMapOption(Option.none(), (value) => {
    expect(value).type.toBe<never>()
    return string$string
  })).type.toBe<
    Either.Either<Option.Option<string>, string>
  >()
  expect(pipe(
    Option.none(),
    Either.transposeMapOption((value) => {
      expect(value).type.toBe<never>()
      return string$string
    })
  )).type.toBe<
    Either.Either<Option.Option<string>, string>
  >()
  expect(Either.transposeMapOption(Option.some(42), (value) => {
    expect(value).type.toBe<number>()
    return string$string
  })).type.toBe<
    Either.Either<Option.Option<string>, string>
  >()
  expect(pipe(
    Option.some(42),
    Either.transposeMapOption((value) => {
      expect(value).type.toBe<number>()
      return string$string
    })
  )).type.toBe<
    Either.Either<Option.Option<string>, string>
  >()
})
