import { pipe } from "effect/Function"
import type { Order } from "effect/Order"
import type * as Predicate from "effect/Predicate"
import * as SortedSet from "effect/SortedSet"
import { describe, expect, it } from "tstyche"

declare const numbers: SortedSet.SortedSet<number>
declare const numbersOrStrings: SortedSet.SortedSet<number | string>
declare const stringIterable: Iterable<string>
declare const stringOrUndefinedOrder: Order<string | undefined>
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

describe("SortedSet", () => {
  it("every", () => {
    pipe(
      numbersOrStrings,
      SortedSet.every((_item) => {
        expect(_item).type.toBe<string | number>()
        return true
      })
    )
  })

  it("some", () => {
    pipe(
      numbersOrStrings,
      SortedSet.some((_item) => {
        expect(_item).type.toBe<string | number>()
        return true
      })
    )
  })

  it("partition", () => {
    SortedSet.partition(numbersOrStrings, (_item) => {
      expect(_item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      SortedSet.partition((_item) => {
        expect(_item).type.toBe<string | number>()
        return true
      })
    )
    expect(SortedSet.partition(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      [excluded: SortedSet.SortedSet<string | number>, satisfying: SortedSet.SortedSet<string | number>]
    >()

    expect(pipe(numbersOrStrings, SortedSet.partition(predicateNumbersOrStrings))).type.toBe<
      [excluded: SortedSet.SortedSet<string | number>, satisfying: SortedSet.SortedSet<string | number>]
    >()
  })

  it("fromIterable", () => {
    expect(SortedSet.fromIterable(stringIterable, stringOrUndefinedOrder)).type.toBe<
      SortedSet.SortedSet<string>
    >()

    expect(pipe(stringIterable, SortedSet.fromIterable(stringOrUndefinedOrder))).type.toBe<
      SortedSet.SortedSet<string>
    >()
  })

  it("filter", () => {
    SortedSet.filter(numbersOrStrings, (_item) => {
      expect(_item).type.toBe<string | number>()
      return true
    })

    pipe(
      numbersOrStrings,
      SortedSet.filter((_item) => {
        expect(_item).type.toBe<string | number>()
        return true
      })
    )

    expect(SortedSet.filter(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      SortedSet.SortedSet<string | number>
    >()

    expect(SortedSet.filter(numbers, predicateNumbersOrStrings)).type.toBe<
      SortedSet.SortedSet<number>
    >()

    expect(pipe(numbersOrStrings, SortedSet.filter(predicateNumbersOrStrings))).type.toBe<
      SortedSet.SortedSet<string | number>
    >()

    expect(pipe(numbers, SortedSet.filter(predicateNumbersOrStrings))).type.toBe<
      SortedSet.SortedSet<number>
    >()
  })
})
