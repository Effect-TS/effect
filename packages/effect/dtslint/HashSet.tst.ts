import { HashSet, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const number: HashSet.HashSet<number>
declare const numberOrString: HashSet.HashSet<number | string>

declare const predicateNumberOrString: Predicate.Predicate<number | string>

describe("HashSet", () => {
  it("every", () => {
    if (HashSet.every(numberOrString, Predicate.isString)) {
      expect(numberOrString).type.toBe<HashSet.HashSet<string>>()
    }
    if (pipe(numberOrString, HashSet.every(Predicate.isString))) {
      // @tstyche fixme -- This doesn't work but it should
      expect(numberOrString).type.toBe<HashSet.HashSet<string>>()
    }
    if (HashSet.every(Predicate.isString)(numberOrString)) {
      expect(numberOrString).type.toBe<HashSet.HashSet<string>>()
    }

    expect(HashSet.every(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<boolean>()
    expect(pipe(
      numberOrString,
      HashSet.every((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<boolean>()
  })

  it("partition", () => {
    // Predicate
    expect(HashSet.partition(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<[excluded: HashSet.HashSet<string | number>, satisfying: HashSet.HashSet<string | number>]>()
    expect(pipe(
      numberOrString,
      HashSet.partition((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<[excluded: HashSet.HashSet<string | number>, satisfying: HashSet.HashSet<string | number>]>()

    // Refinement
    expect(HashSet.partition(numberOrString, Predicate.isNumber))
      .type.toBe<[excluded: HashSet.HashSet<string>, satisfying: HashSet.HashSet<number>]>()

    expect(pipe(numberOrString, HashSet.partition(Predicate.isNumber)))
      .type.toBe<[excluded: HashSet.HashSet<string>, satisfying: HashSet.HashSet<number>]>()
  })

  it("filter", () => {
    // Predicate
    expect(HashSet.filter(numberOrString, (value) => {
      expect(value).type.toBe<string | number>()
      return true
    })).type.toBe<HashSet.HashSet<string | number>>()
    expect(pipe(
      numberOrString,
      HashSet.filter((value) => {
        expect(value).type.toBe<string | number>()
        return true
      })
    )).type.toBe<HashSet.HashSet<string | number>>()

    expect(pipe(numberOrString, HashSet.filter(predicateNumberOrString)))
      .type.toBe<HashSet.HashSet<string | number>>()
    expect(pipe(number, HashSet.filter(predicateNumberOrString)))
      .type.toBe<HashSet.HashSet<number>>()

    // Refinement
    expect(HashSet.filter(numberOrString, Predicate.isNumber))
      .type.toBe<HashSet.HashSet<number>>()
    expect(pipe(numberOrString, HashSet.filter(Predicate.isNumber)))
      .type.toBe<HashSet.HashSet<number>>()
  })
})
