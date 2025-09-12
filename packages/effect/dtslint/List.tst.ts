import type { Option } from "effect"
import { List, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const number: List.List<number>
declare const string: List.List<string>
declare const nonEmptyNumber: List.Cons<number>
declare const nonEmptyString: List.Cons<string>
declare const numberOrString: List.List<number | string>
declare const predicateNumberOrString: Predicate.Predicate<number | string>

describe("List", () => {
  it("every", () => {
    if (List.every(numberOrString, Predicate.isString)) {
      expect(numberOrString).type.toBe<List.List<string>>()
    }
    if (pipe(numberOrString, List.every(Predicate.isString))) {
      // @tstyche fixme -- This doesn't work but it should
      expect(numberOrString).type.toBe<List.List<string>>()
    }
    if (List.every(Predicate.isString)(numberOrString)) {
      expect(numberOrString).type.toBe<List.List<string>>()
    }

    expect(
      List.every(numberOrString, (value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    ).type.toBe<boolean>()
    expect(pipe(
      numberOrString,
      List.every((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<boolean>()
  })

  it("some", () => {
    if (List.some(numberOrString, Predicate.isString)) {
      expect(numberOrString).type.toBe<List.Cons<string | number>>()
    }
    if (pipe(numberOrString, List.some(Predicate.isString))) {
      // @tstyche fixme -- This doesn't work but it should
      expect(numberOrString).type.toBe<List.Cons<string | number>>()
    }
    if (List.some(Predicate.isString)(numberOrString)) {
      expect(numberOrString).type.toBe<List.Cons<string | number>>()
    }

    expect(
      List.some(numberOrString, (value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    ).type.toBe<boolean>()
    expect(pipe(
      numberOrString,
      List.some((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<boolean>()
  })

  it("partition", () => {
    // Predicate
    expect(List.partition(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<
      [excluded: List.List<string | number>, satisfying: List.List<string | number>]
    >()
    expect(pipe(
      numberOrString,
      List.partition((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<
      [excluded: List.List<string | number>, satisfying: List.List<string | number>]
    >()
    expect(List.partition(number, predicateNumberOrString)).type.toBe<
      [excluded: List.List<number>, satisfying: List.List<number>]
    >()
    expect(pipe(number, List.partition(predicateNumberOrString))).type.toBe<
      [excluded: List.List<number>, satisfying: List.List<number>]
    >()

    // Refinement
    expect(List.partition(numberOrString, Predicate.isNumber)).type.toBe<
      [excluded: List.List<string>, satisfying: List.List<number>]
    >()

    expect(pipe(numberOrString, List.partition(Predicate.isNumber))).type.toBe<
      [excluded: List.List<string>, satisfying: List.List<number>]
    >()
  })

  it("append", () => {
    expect(List.append(numberOrString, true)).type.toBe<List.Cons<string | number | boolean>>()
    expect(pipe(numberOrString, List.append(true))).type.toBe<List.Cons<string | number | boolean>>()
    expect(List.append(true)(numberOrString)).type.toBe<List.Cons<string | number | boolean>>()
  })

  it("prepend", () => {
    expect(List.prepend(numberOrString, true)).type.toBe<List.Cons<string | number | boolean>>()
    expect(pipe(numberOrString, List.prepend(true))).type.toBe<List.Cons<string | number | boolean>>()
    expect(List.prepend(true)(numberOrString)).type.toBe<List.Cons<string | number | boolean>>()
  })

  it("map", () => {
    expect(List.map(number, (n) => n + 1)).type.toBe<List.List<number>>()
    expect(pipe(number, List.map((n) => n + 1))).type.toBe<List.List<number>>()
    expect(List.map(nonEmptyNumber, (n) => n + 1)).type.toBe<List.Cons<number>>()
    expect(pipe(nonEmptyNumber, List.map((n) => n + 1))).type.toBe<List.Cons<number>>()
  })

  it("filter", () => {
    // Predicate
    expect(List.filter(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<List.List<number | string>>()
    expect(pipe(
      numberOrString,
      List.filter((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<List.List<number | string>>()

    expect(List.filter(number, predicateNumberOrString)).type.toBe<List.List<number>>()
    expect(pipe(number, List.filter(predicateNumberOrString))).type.toBe<List.List<number>>()

    // Refinement
    expect(List.filter(numberOrString, Predicate.isNumber)).type.toBe<List.List<number>>()
    expect(pipe(numberOrString, List.filter(Predicate.isNumber))).type.toBe<List.List<number>>()
  })

  it("findFirst", () => {
    // Predicate
    expect(List.findFirst(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<Option.Option<string | number>>()
    expect(pipe(
      numberOrString,
      List.findFirst((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<Option.Option<string | number>>()

    expect(List.findFirst(number, predicateNumberOrString)).type.toBe<Option.Option<number>>()
    expect(pipe(number, List.findFirst(predicateNumberOrString))).type.toBe<Option.Option<number>>()

    // Refinement
    expect(List.findFirst(numberOrString, Predicate.isNumber)).type.toBe<Option.Option<number>>()
    expect(pipe(numberOrString, List.findFirst(Predicate.isNumber))).type.toBe<Option.Option<number>>()
  })

  it("appendAll", () => {
    expect(List.appendAll(string, number)).type.toBe<List.List<string | number>>()
    expect(pipe(string, List.appendAll(number))).type.toBe<List.List<string | number>>()
    expect(List.appendAll(nonEmptyString, number)).type.toBe<List.Cons<string | number>>()
    expect(pipe(nonEmptyString, List.appendAll(number))).type.toBe<List.Cons<string | number>>()
    expect(List.appendAll(string, nonEmptyNumber)).type.toBe<List.Cons<string | number>>()
    expect(pipe(string, List.appendAll(nonEmptyNumber))).type.toBe<List.Cons<string | number>>()
    expect(List.appendAll(nonEmptyString, nonEmptyNumber)).type.toBe<List.Cons<string | number>>()
    expect(pipe(nonEmptyString, List.appendAll(nonEmptyNumber))).type.toBe<List.Cons<string | number>>()
  })

  it("prependAll", () => {
    expect(List.prependAll(string, number)).type.toBe<List.List<string | number>>()
    expect(pipe(string, List.prependAll(number))).type.toBe<List.List<string | number>>()
    expect(List.prependAll(nonEmptyString, number)).type.toBe<List.Cons<string | number>>()
    expect(pipe(nonEmptyString, List.prependAll(number))).type.toBe<List.Cons<string | number>>()
    expect(List.prependAll(string, nonEmptyNumber)).type.toBe<List.Cons<string | number>>()
    expect(pipe(string, List.prependAll(nonEmptyNumber))).type.toBe<List.Cons<string | number>>()
    expect(List.prependAll(nonEmptyString, nonEmptyNumber)).type.toBe<List.Cons<string | number>>()
    expect(pipe(nonEmptyString, List.prependAll(nonEmptyNumber))).type.toBe<List.Cons<string | number>>()
  })

  it("flatMap", () => {
    expect(
      List.flatMap(string, (value) => {
        expect(value).type.toBe<string>()
        return List.empty<number>()
      })
    ).type.toBe<List.List<number>>()
    expect(
      pipe(
        string,
        List.flatMap((value) => {
          expect(value).type.toBe<string>()
          return List.empty<number>()
        })
      )
    ).type.toBe<List.List<number>>()

    expect(
      List.flatMap(nonEmptyString, (value) => {
        expect(value).type.toBe<string>()
        return List.empty<number>()
      })
    ).type.toBe<List.List<number>>()
    expect(
      pipe(
        nonEmptyString,
        List.flatMap((value) => {
          expect(value).type.toBe<string>()
          return List.empty<number>()
        })
      )
    ).type.toBe<List.List<number>>()

    expect(
      List.flatMap(nonEmptyString, (value) => {
        expect(value).type.toBe<string>()
        return List.of(value.length)
      })
    ).type.toBe<List.Cons<number>>()
    expect(
      pipe(
        nonEmptyString,
        List.flatMap((value) => {
          expect(value).type.toBe<string>()
          return List.of(value.length)
        })
      )
    ).type.toBe<List.Cons<number>>()
  })
})
