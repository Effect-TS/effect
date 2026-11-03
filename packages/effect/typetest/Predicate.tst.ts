import { Array, Effect, hole, Option, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const u: unknown
declare const anys: ReadonlyArray<any>
declare const unknowns: ReadonlyArray<unknown>
declare const numberOrNull: ReadonlyArray<number | null>
declare const numberOrUndefined: ReadonlyArray<number | undefined>
declare const numberOrNullOrUndefined: ReadonlyArray<number | null | undefined>

type Auto = { readonly _tag: "Auto" }
type Px = { readonly _tag: "Px"; readonly value: number }
type Percent = { readonly _tag: "Percent"; readonly value: number }
type Size = Auto | Px | Percent
declare const size: Size
declare const sizes: ReadonlyArray<Size>

describe("Predicate", () => {
  it("isString", () => {
    expect(unknowns.filter(Predicate.isString)).type.toBe<Array<string>>()
  })

  it("isNumber", () => {
    expect(unknowns.filter(Predicate.isNumber)).type.toBe<Array<number>>()
  })

  it("isBoolean", () => {
    expect(unknowns.filter(Predicate.isBoolean)).type.toBe<Array<boolean>>()
  })

  it("isBigInt", () => {
    expect(unknowns.filter(Predicate.isBigInt)).type.toBe<Array<bigint>>()
  })

  it("isSymbol", () => {
    expect(unknowns.filter(Predicate.isSymbol)).type.toBe<Array<symbol>>()
  })

  it("isUndefined", () => {
    expect(unknowns.filter(Predicate.isUndefined)).type.toBe<Array<undefined>>()
  })

  it("isNotUndefined", () => {
    expect(numberOrUndefined.filter(Predicate.isNotUndefined)).type.toBe<Array<number>>()
    expect(numberOrNullOrUndefined.filter(Predicate.isNotUndefined)).type.toBe<Array<number | null>>()
  })

  it("isNull", () => {
    expect(unknowns.filter(Predicate.isNull)).type.toBe<Array<null>>()
  })

  it("isNotNull", () => {
    expect(numberOrNull.filter(Predicate.isNotNull)).type.toBe<Array<number>>()
    expect(numberOrNullOrUndefined.filter(Predicate.isNotNull)).type.toBe<Array<number | undefined>>()
  })

  it("isNever", () => {
    expect(unknowns.filter(Predicate.isNever)).type.toBe<Array<never>>()
  })

  it("isUnknown", () => {
    expect(anys.filter(Predicate.isUnknown)).type.toBe<Array<unknown>>()
  })

  describe("isTagged", () => {
    it("keeps the current types for untyped inputs", () => {
      expect(anys.filter(Predicate.isTagged("a"))).type.toBe<Array<{ _tag: "a" }>>()
      expect(Predicate.isTagged("a")).type.toBe<(self: unknown) => self is { _tag: "a" }>()
      if (Predicate.isTagged(u, "a")) {
        expect(u).type.toBe<{ _tag: "a" }>()
      }
      const error = hole<Error>()
      if (Predicate.isTagged(error, "a")) {
        expect(error).type.toBe<Error & { _tag: "a" }>()
      }
      const errorOrPx = hole<Error | Px>()
      if (Predicate.isTagged(errorOrPx, "a")) {
        expect(errorOrPx).type.toBe<Error & { _tag: "a" }>()
      }
    })

    it("narrows both branches of a data-first call", () => {
      if (Predicate.isTagged(size, "Auto")) {
        expect(size).type.toBe<Auto>()
      } else {
        expect(size).type.toBe<Px | Percent>()
      }
      const mixed = hole<{ readonly _tag: "Concat"; readonly parts: ReadonlyArray<string> } | string | null>()
      if (Predicate.isTagged(mixed, "Concat")) {
        expect(mixed).type.toBe<{ readonly _tag: "Concat"; readonly parts: ReadonlyArray<string> }>()
      } else {
        expect(mixed).type.toBe<string | null>()
      }
    })

    it("keeps the full member when used as a callback", () => {
      expect(sizes.filter(Predicate.isTagged("Px"))).type.toBe<Array<Px>>()
      expect(Array.filter(sizes, Predicate.isTagged("Px"))).type.toBe<Array<Px>>()
      expect(pipe(sizes, Array.filter(Predicate.isTagged("Px")))).type.toBe<Array<Px>>()
      expect(sizes.filter(Predicate.or(Predicate.isTagged("Px"), Predicate.isTagged("Percent"))))
        .type.toBe<Array<Px | Percent>>()
      expect(Option.filter(hole<Option.Option<Size>>(), Predicate.isTagged("Px"))).type.toBe<Option.Option<Px>>()
      expect(Effect.filterOrFail(hole<Effect.Effect<Size>>(), Predicate.isTagged("Px"), () => "error" as const))
        .type.toBe<Effect.Effect<Px, "error">>()
      const isPx: Predicate.Refinement<Size, Px> = Predicate.isTagged("Px")
      expect(isPx).type.toBe<Predicate.Refinement<Size, Px>>()
    })

    it("accepts generic callers", () => {
      expect(<K extends string>(tag: K) => Predicate.isTagged(size, tag)).type.not.toRaiseError()
      expect(<E>(e: E) => Predicate.isTagged(e, "Foo") && e._tag).type.not.toRaiseError()
      expect(<E extends { readonly _tag: string }>(e: E, tag: E["_tag"]) => Predicate.isTagged(e, tag))
        .type.not.toRaiseError()
      expect(<K extends string>(tag: K) => sizes.filter(Predicate.isTagged(tag as string))).type.not.toRaiseError()
      expect(<K extends string>(tag: K) =>
        Effect.catchIf(hole<Effect.Effect<void, Size>>(), Predicate.isTagged(tag as string), () => Effect.void)
      ).type.not.toRaiseError()
    })
  })

  it("isNullish", () => {
    expect(numberOrNull.filter(Predicate.isNullish)).type.toBe<Array<null>>()
    expect(numberOrUndefined.filter(Predicate.isNullish)).type.toBe<Array<undefined>>()
    expect(numberOrNullOrUndefined.filter(Predicate.isNullish)).type.toBe<Array<null | undefined>>()

    if (Predicate.isNullish(u)) {
      expect(u).type.toBe<null | undefined>()
    }
  })

  it("isNotNullish", () => {
    expect(numberOrNull.filter(Predicate.isNotNullish)).type.toBe<Array<number>>()
    expect(numberOrUndefined.filter(Predicate.isNotNullish)).type.toBe<Array<number>>()
    expect(numberOrNullOrUndefined.filter(Predicate.isNotNullish)).type.toBe<Array<number>>()

    if (Predicate.isNotNullish(u)) {
      expect(u).type.toBe<{}>()
    }
  })

  it("isError", () => {
    expect(unknowns.filter(Predicate.isError)).type.toBe<Array<Error>>()
  })

  it("isDate", () => {
    expect(unknowns.filter(Predicate.isDate)).type.toBe<Array<Date>>()
  })

  it("isObject", () => {
    expect(unknowns.filter(Predicate.isObject)).type.toBe<Array<{ [x: PropertyKey]: unknown }>>()
  })

  it("isReadonlyObject", () => {
    expect(unknowns.filter(Predicate.isReadonlyObject)).type.toBe<Array<{ readonly [x: PropertyKey]: unknown }>>()
  })

  it("isTupleOf", () => {
    if (Predicate.isTupleOf(unknowns, 3)) {
      expect(unknowns).type.toBe<[unknown, unknown, unknown]>()
    }
  })

  it("isTupleOfAtLeast", () => {
    if (Predicate.isTupleOfAtLeast(unknowns, 3)) {
      expect(unknowns).type.toBe<[unknown, unknown, unknown, ...Array<unknown>]>()
    }
  })

  it("isRegExp", () => {
    expect(unknowns.filter(Predicate.isRegExp)).type.toBe<Array<RegExp>>()
  })

  it("compose", () => {
    interface NonEmptyStringBrand {
      readonly NonEmptyString: unique symbol
    }
    type NonEmptyString = string & NonEmptyStringBrand
    const isNonEmptyString = hole<Predicate.Refinement<string, NonEmptyString>>()

    expect(pipe(Predicate.isString, Predicate.compose(isNonEmptyString)))
      .type.toBe<Predicate.Refinement<unknown, NonEmptyString>>()

    expect(Predicate.compose(Predicate.isString, isNonEmptyString))
      .type.toBe<Predicate.Refinement<unknown, NonEmptyString>>()

    expect(
      pipe(
        Predicate.isString,
        Predicate.compose((s): s is NonEmptyString => {
          expect(s).type.toBe<string>()
          return s.length > 0
        })
      )
    ).type.toBe<Predicate.Refinement<unknown, NonEmptyString>>()

    expect(Predicate.compose(Predicate.isString, (s): s is NonEmptyString => {
      expect(s).type.toBe<string>()
      return s.length > 0
    }))
      .type.toBe<Predicate.Refinement<unknown, NonEmptyString>>()

    expect(pipe(Predicate.isString, Predicate.compose((s) => s.startsWith("a"))))
      .type.toBe<Predicate.Refinement<unknown, string>>()
  })

  it("and", () => {
    const isPositive = hole<Predicate.Predicate<number>>()
    const isLessThan2 = hole<Predicate.Predicate<number>>()

    expect(pipe(isPositive, Predicate.and(isLessThan2)))
      .type.toBe<Predicate.Predicate<number>>()

    expect(Predicate.and(isPositive, isLessThan2))
      .type.toBe<Predicate.Predicate<number>>()

    expect(pipe(Predicate.isNumber, Predicate.and(isPositive)))
      .type.toBe<Predicate.Predicate<number>>()

    expect(Predicate.and(Predicate.isNumber, isPositive))
      .type.toBe<Predicate.Predicate<number>>()

    const hasa = hole<Predicate.Refinement<unknown, { a: unknown }>>()
    const hasb = hole<Predicate.Refinement<unknown, { b: unknown }>>()

    expect(pipe(hasa, Predicate.and(hasb)))
      .type.toBe<Predicate.Refinement<unknown, { a: unknown } & { b: unknown }>>()

    expect(Predicate.and(hasa, hasb))
      .type.toBe<Predicate.Refinement<unknown, { a: unknown } & { b: unknown }>>()
  })

  it("or", () => {
    expect(
      pipe(
        hole<Predicate.Predicate<number>>(),
        Predicate.or(hole<Predicate.Predicate<number>>())
      )
    ).type.toBe<Predicate.Predicate<number>>()

    expect(Predicate.or(hole<Predicate.Predicate<number>>(), hole<Predicate.Predicate<number>>()))
      .type.toBe<Predicate.Predicate<number>>()

    expect(pipe(Predicate.isString, Predicate.or(Predicate.isNumber)))
      .type.toBe<Predicate.Refinement<unknown, string | number>>()

    expect(Predicate.or(Predicate.isString, Predicate.isNumber))
      .type.toBe<Predicate.Refinement<unknown, string | number>>()
  })

  it("Tuple", () => {
    const isA = hole<Predicate.Refinement<string, "a">>()
    const isTrue = hole<Predicate.Refinement<boolean, true>>()
    const isOdd = hole<Predicate.Predicate<number>>()

    expect(Predicate.Tuple([isTrue, isA]))
      .type.toBe<Predicate.Refinement<readonly [boolean, string], readonly [true, "a"]>>()

    expect(Predicate.Tuple([isTrue, isOdd]))
      .type.toBe<Predicate.Refinement<readonly [boolean, number], readonly [true, number]>>()

    expect(Predicate.Tuple([isOdd, isOdd]))
      .type.toBe<Predicate.Predicate<readonly [number, number]>>()

    expect(Predicate.Tuple([...hole<Array<Predicate.Predicate<number>>>()]))
      .type.toBe<Predicate.Predicate<ReadonlyArray<number>>>()

    expect(Predicate.Tuple([...hole<Array<Predicate.Predicate<number> | Predicate.Refinement<boolean, true>>>()]))
      .type.toBe<Predicate.Refinement<ReadonlyArray<never>, ReadonlyArray<never>>>()

    expect(Predicate.Tuple([...hole<Array<Predicate.Refinement<boolean, true>>>()]))
      .type.toBe<Predicate.Refinement<ReadonlyArray<boolean>, ReadonlyArray<true>>>()
  })

  it("Struct", () => {
    expect(
      Predicate.Struct({
        a: hole<Predicate.Refinement<string, "a">>(),
        true: hole<Predicate.Refinement<boolean, true>>()
      })
    ).type.toBe<
      Predicate.Refinement<
        { readonly a: string; readonly true: boolean },
        { readonly a: "a"; readonly true: true }
      >
    >()

    expect(
      Predicate.Struct({
        odd: hole<Predicate.Predicate<number>>(),
        true: hole<Predicate.Refinement<boolean, true>>()
      })
    ).type.toBe<
      Predicate.Refinement<
        { readonly odd: number; readonly true: boolean },
        { readonly odd: number; readonly true: true }
      >
    >()

    expect(
      Predicate.Struct({
        odd: hole<Predicate.Predicate<number>>(),
        odd1: hole<Predicate.Predicate<number>>()
      })
    ).type.toBe<Predicate.Predicate<{ readonly odd: number; readonly odd1: number }>>()
  })

  it("isUint8Array", () => {
    expect(unknowns.filter(Predicate.isUint8Array)).type.toBe<Array<Uint8Array>>()
  })
})
