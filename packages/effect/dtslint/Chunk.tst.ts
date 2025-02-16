import type { Option } from "effect"
import { Chunk, Effect, hole, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const numbers: Chunk.Chunk<number>
declare const strings: Chunk.Chunk<string>
declare const nonEmptyNumbers: Chunk.NonEmptyChunk<number>
declare const nonEmptyStrings: Chunk.NonEmptyChunk<string>
declare const numbersOrStrings: Chunk.Chunk<number | string>
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

describe("Chunk", () => {
  it("every", () => {
    if (Chunk.every(numbersOrStrings, Predicate.isString)) {
      expect(numbersOrStrings).type.toBe<Chunk.Chunk<string>>()
    }
    if (Chunk.every(Predicate.isString)(numbersOrStrings)) {
      expect(numbersOrStrings).type.toBe<Chunk.Chunk<string>>()
    }

    expect(Chunk.every(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })).type.toBe<boolean>()
    expect(pipe(
      numbersOrStrings,
      Chunk.every((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )).type.toBe<boolean>()
  })

  it("some", () => {
    if (Chunk.some(numbersOrStrings, Predicate.isString)) {
      expect(numbersOrStrings).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    }

    expect(
      Chunk.some(numbersOrStrings, (item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    ).type.toBe<boolean>()
    expect(pipe(
      numbersOrStrings,
      Chunk.some((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )).type.toBe<boolean>()
  })

  it("partition", () => {
    expect(Chunk.partition(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })).type.toBe<[excluded: Chunk.Chunk<string | number>, satisfying: Chunk.Chunk<string | number>]>()
    expect(pipe(
      numbersOrStrings,
      Chunk.partition((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )).type.toBe<[excluded: Chunk.Chunk<string | number>, satisfying: Chunk.Chunk<string | number>]>()

    expect(Chunk.partition(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      [excluded: Chunk.Chunk<string | number>, satisfying: Chunk.Chunk<string | number>]
    >()
    expect(pipe(numbersOrStrings, Chunk.partition(predicateNumbersOrStrings))).type.toBe<
      [excluded: Chunk.Chunk<string | number>, satisfying: Chunk.Chunk<string | number>]
    >()

    expect(Chunk.partition(numbers, predicateNumbersOrStrings)).type.toBe<
      [excluded: Chunk.Chunk<number>, satisfying: Chunk.Chunk<number>]
    >()
    expect(pipe(numbers, Chunk.partition(predicateNumbersOrStrings))).type.toBe<
      [excluded: Chunk.Chunk<number>, satisfying: Chunk.Chunk<number>]
    >()

    expect(Chunk.partition(numbersOrStrings, Predicate.isNumber)).type.toBe<
      [excluded: Chunk.Chunk<string>, satisfying: Chunk.Chunk<number>]
    >()
    expect(pipe(numbersOrStrings, Chunk.partition(Predicate.isNumber))).type.toBe<
      [excluded: Chunk.Chunk<string>, satisfying: Chunk.Chunk<number>]
    >()
  })

  it("append", () => {
    expect(Chunk.append(numbersOrStrings, true)).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
    expect(pipe(numbersOrStrings, Chunk.append(true))).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
    expect(Chunk.append(true)(numbersOrStrings)).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
  })

  it("prepend", () => {
    expect(Chunk.prepend(numbersOrStrings, true)).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
    expect(pipe(numbersOrStrings, Chunk.prepend(true))).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
    expect(Chunk.prepend(true)(numbersOrStrings)).type.toBe<Chunk.NonEmptyChunk<string | number | boolean>>()
  })

  it("map", () => {
    // Chunk
    expect(Chunk.map(strings, (s, i) => {
      expect(s).type.toBe<string>()
      expect(i).type.toBe<number>()
      return s + "a"
    })).type.toBe<Chunk.Chunk<string>>()
    expect(pipe(
      strings,
      Chunk.map((s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return s + "a"
      })
    )).type.toBe<Chunk.Chunk<string>>()

    // NonEmptyChunk
    expect(Chunk.map(nonEmptyStrings, (s, i) => {
      expect(s).type.toBe<string>()
      expect(i).type.toBe<number>()
      return s + "a"
    })).type.toBe<Chunk.NonEmptyChunk<string>>()
    expect(pipe(
      nonEmptyStrings,
      Chunk.map((s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return s + "a"
      })
    )).type.toBe<Chunk.NonEmptyChunk<string>>()
  })

  it("filter", () => {
    Chunk.filter(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.filter((item) => {
          expect(item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<Chunk.Chunk<string | number>>()
    expect(
      Chunk.filter(numbersOrStrings, predicateNumbersOrStrings)
    ).type.toBe<Chunk.Chunk<string | number>>()
    expect(
      pipe(numbersOrStrings, Chunk.filter(predicateNumbersOrStrings))
    ).type.toBe<Chunk.Chunk<string | number>>()

    expect(
      Chunk.filter(numbers, predicateNumbersOrStrings)
    ).type.toBe<Chunk.Chunk<number>>()
    expect(
      pipe(numbers, Chunk.filter(predicateNumbersOrStrings))
    ).type.toBe<Chunk.Chunk<number>>()

    expect(
      Chunk.filter(numbersOrStrings, Predicate.isNumber)
    ).type.toBe<Chunk.Chunk<number>>()
    expect(
      pipe(numbersOrStrings, Chunk.filter(Predicate.isNumber))
    ).type.toBe<Chunk.Chunk<number>>()
  })

  it("takeWhile", () => {
    Chunk.takeWhile(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.takeWhile((item) => {
          expect(item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<Chunk.Chunk<string | number>>()

    expect(
      Chunk.takeWhile(numbersOrStrings, predicateNumbersOrStrings)
    ).type.toBe<Chunk.Chunk<string | number>>()
    expect(
      pipe(numbersOrStrings, Chunk.takeWhile(predicateNumbersOrStrings))
    ).type.toBe<Chunk.Chunk<string | number>>()

    expect(Chunk.takeWhile(numbers, predicateNumbersOrStrings)).type.toBe<
      Chunk.Chunk<number>
    >()
    expect(
      pipe(numbers, Chunk.takeWhile(predicateNumbersOrStrings))
    ).type.toBe<Chunk.Chunk<number>>()

    expect(
      Chunk.takeWhile(numbersOrStrings, Predicate.isNumber)
    ).type.toBe<Chunk.Chunk<number>>()
    expect(
      pipe(numbersOrStrings, Chunk.takeWhile(Predicate.isNumber))
    ).type.toBe<Chunk.Chunk<number>>()
  })

  it("findFirst", () => {
    Chunk.findFirst(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.findFirst((_item) => {
          expect(_item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<Option.Option<string | number>>()

    expect(Chunk.findFirst(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<Option.Option<string | number>>()
    expect(pipe(numbersOrStrings, Chunk.findFirst(predicateNumbersOrStrings))).type.toBe<
      Option.Option<string | number>
    >()

    expect(Chunk.findFirst(numbersOrStrings, Predicate.isNumber)).type.toBe<Option.Option<number>>()
    expect(pipe(numbersOrStrings, Chunk.findFirst(Predicate.isNumber))).type.toBe<Option.Option<number>>()
  })

  it("findLast", () => {
    Chunk.findLast(numbersOrStrings, (_item) => {
      expect(_item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.findLast((_item) => {
          expect(_item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<Option.Option<string | number>>()

    expect(Chunk.findLast(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<Option.Option<string | number>>()
    expect(pipe(numbersOrStrings, Chunk.findLast(predicateNumbersOrStrings))).type.toBe<
      Option.Option<string | number>
    >()

    expect(Chunk.findLast(numbersOrStrings, Predicate.isNumber)).type.toBe<Option.Option<number>>()
    expect(pipe(numbersOrStrings, Chunk.findLast(Predicate.isNumber))).type.toBe<Option.Option<number>>()
  })

  it("dropWhile", () => {
    Chunk.dropWhile(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.dropWhile((item) => {
          expect(item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<Chunk.Chunk<string | number>>()

    expect(Chunk.dropWhile(numbers, predicateNumbersOrStrings)).type.toBe<Chunk.Chunk<number>>()
    expect(pipe(numbers, Chunk.dropWhile(predicateNumbersOrStrings))).type.toBe<Chunk.Chunk<number>>()

    expect(Chunk.dropWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<Chunk.Chunk<string | number>>()
    expect(pipe(numbersOrStrings, Chunk.dropWhile(Predicate.isNumber))).type.toBe<Chunk.Chunk<string | number>>()
  })

  it("splitWhere", () => {
    Chunk.splitWhere(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    expect(
      pipe(
        numbersOrStrings,
        Chunk.splitWhere((item) => {
          expect(item).type.toBe<string | number>()
          return true
        })
      )
    ).type.toBe<
      [beforeMatch: Chunk.Chunk<string | number>, fromMatch: Chunk.Chunk<string | number>]
    >()

    expect(Chunk.splitWhere(numbers, predicateNumbersOrStrings))
      .type.toBe<[beforeMatch: Chunk.Chunk<number>, fromMatch: Chunk.Chunk<number>]>()
    expect(pipe(numbers, Chunk.splitWhere(predicateNumbersOrStrings)))
      .type.toBe<[beforeMatch: Chunk.Chunk<number>, fromMatch: Chunk.Chunk<number>]>()

    expect(Chunk.splitWhere(numbersOrStrings, Predicate.isNumber))
      .type.toBe<[beforeMatch: Chunk.Chunk<string | number>, fromMatch: Chunk.Chunk<string | number>]>()
    expect(pipe(numbersOrStrings, Chunk.splitWhere(Predicate.isNumber)))
      .type.toBe<[beforeMatch: Chunk.Chunk<string | number>, fromMatch: Chunk.Chunk<string | number>]>()
  })

  it("prependAll", () => {
    // Chunk + Chunk
    expect(Chunk.prependAll(strings, numbers)).type.toBe<Chunk.Chunk<string | number>>()
    expect(pipe(strings, Chunk.prependAll(numbers))).type.toBe<Chunk.Chunk<string | number>>()

    // NonEmptyChunk + Chunk
    expect(Chunk.prependAll(nonEmptyStrings, numbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(nonEmptyStrings, Chunk.prependAll(numbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()

    // Chunk + NonEmptyChunk
    expect(Chunk.prependAll(strings, nonEmptyNumbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(strings, Chunk.prependAll(nonEmptyNumbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()

    // NonEmptyChunk + NonEmptyChunk
    expect(Chunk.prependAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(nonEmptyStrings, Chunk.prependAll(nonEmptyNumbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()
  })

  it("appendAll", () => {
    // Chunk + Chunk
    expect(Chunk.appendAll(strings, numbers)).type.toBe<Chunk.Chunk<string | number>>()
    expect(pipe(strings, Chunk.appendAll(numbers))).type.toBe<Chunk.Chunk<string | number>>()

    // NonEmptyChunk + Chunk
    expect(Chunk.appendAll(nonEmptyStrings, numbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(nonEmptyStrings, Chunk.appendAll(numbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()

    // Chunk + NonEmptyChunk
    expect(Chunk.appendAll(strings, nonEmptyNumbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(strings, Chunk.appendAll(nonEmptyNumbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()

    // NonEmptyChunk + NonEmptyChunk
    expect(Chunk.appendAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<Chunk.NonEmptyChunk<string | number>>()
    expect(pipe(nonEmptyStrings, Chunk.appendAll(nonEmptyNumbers))).type.toBe<Chunk.NonEmptyChunk<string | number>>()
  })

  it("flatMap", () => {
    // Chunk + Chunk
    expect(
      Chunk.flatMap(strings, (s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Chunk.empty<number>()
      })
    ).type.toBe<Chunk.Chunk<number>>()
    expect(
      pipe(
        strings,
        Chunk.flatMap((s, i) => {
          expect(s).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Chunk.empty<number>()
        })
      )
    ).type.toBe<Chunk.Chunk<number>>()

    // NonEmptyChunk + Chunk
    expect(
      Chunk.flatMap(nonEmptyStrings, (s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Chunk.empty<number>()
      })
    ).type.toBe<Chunk.Chunk<number>>()
    expect(
      pipe(
        nonEmptyStrings,
        Chunk.flatMap((s, i) => {
          expect(s).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Chunk.empty<number>()
        })
      )
    ).type.toBe<Chunk.Chunk<number>>()

    // NonEmptyChunk + NonEmptyChunk
    expect(
      Chunk.flatMap(nonEmptyStrings, (s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Chunk.of(s.length)
      })
    ).type.toBe<Chunk.NonEmptyChunk<number>>()
    expect(
      pipe(
        nonEmptyStrings,
        Chunk.flatMap((s, i) => {
          expect(s).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Chunk.of(s.length)
        })
      )
    ).type.toBe<Chunk.NonEmptyChunk<number>>()
  })

  it("flatten", () => {
    expect(Chunk.flatten(hole<Chunk.Chunk<Chunk.Chunk<number>>>())).type.toBe<Chunk.Chunk<number>>()
    expect(pipe(hole<Chunk.Chunk<Chunk.Chunk<number>>>(), Chunk.flatten)).type.toBe<Chunk.Chunk<number>>()

    expect(Chunk.flatten(hole<Chunk.Chunk<Chunk.NonEmptyChunk<number>>>())).type.toBe<Chunk.Chunk<number>>()
    expect(pipe(hole<Chunk.Chunk<Chunk.NonEmptyChunk<number>>>(), Chunk.flatten)).type.toBe<Chunk.Chunk<number>>()

    expect(Chunk.flatten(hole<Chunk.NonEmptyChunk<Chunk.Chunk<number>>>())).type.toBe<Chunk.Chunk<number>>()
    expect(pipe(hole<Chunk.NonEmptyChunk<Chunk.Chunk<number>>>(), Chunk.flatten)).type.toBe<Chunk.Chunk<number>>()

    expect(Chunk.flatten(hole<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>()))
      .type.toBe<Chunk.NonEmptyChunk<number>>()
    expect(pipe(hole<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>(), Chunk.flatten))
      .type.toBe<Chunk.NonEmptyChunk<number>>()

    const nestedChunk = hole<Effect.Effect<Chunk.Chunk<Chunk.Chunk<number>>, never, never>>()
    const nestedNonEmptyChunk = hole<Effect.Effect<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>, never, never>>()

    expect(nestedChunk.pipe(Effect.map((x) => {
      expect(x).type.toBe<Chunk.Chunk<Chunk.Chunk<number>>>()
      return Chunk.flatten(x)
    }))).type.toBe<
      Effect.Effect<Chunk.Chunk<number>, never, never>
    >()
    expect(nestedChunk.pipe(Effect.map(Chunk.flatten))).type.toBe<
      Effect.Effect<Chunk.Chunk<number>, never, never>
    >()
    expect(nestedNonEmptyChunk.pipe(Effect.map((x) => {
      expect(x).type.toBe<Chunk.NonEmptyChunk<Chunk.NonEmptyChunk<number>>>()
      return Chunk.flatten(x)
    }))).type.toBe<
      Effect.Effect<Chunk.NonEmptyChunk<number>, never, never>
    >()
    expect(nestedNonEmptyChunk.pipe(Effect.map(Chunk.flatten))).type.toBe<
      Effect.Effect<Chunk.NonEmptyChunk<number>, never, never>
    >()
  })

  it("reverse", () => {
    // Chunk
    expect(Chunk.reverse(numbers)).type.toBe<Chunk.Chunk<number>>()
    expect(pipe(numbers, Chunk.reverse)).type.toBe<Chunk.Chunk<number>>()

    // NonEmptyChunk
    expect(Chunk.reverse(nonEmptyNumbers)).type.toBe<Chunk.NonEmptyChunk<number>>()
    expect(pipe(nonEmptyNumbers, Chunk.reverse)).type.toBe<Chunk.NonEmptyChunk<number>>()
  })

  it("toArray", () => {
    // Chunk
    expect(Chunk.toArray(hole<Chunk.Chunk<string>>())).type.toBe<Array<string>>()
    expect(pipe(hole<Chunk.Chunk<string>>(), Chunk.toArray)).type.toBe<Array<string>>()

    // NonEmptyChunk
    expect(Chunk.toArray(hole<Chunk.NonEmptyChunk<string>>())).type.toBe<[string, ...Array<string>]>()
    expect(pipe(hole<Chunk.NonEmptyChunk<string>>(), Chunk.toArray)).type.toBe<[string, ...Array<string>]>()
  })

  it("toReadonlyArray", () => {
    // Chunk
    expect(Chunk.toReadonlyArray(hole<Chunk.Chunk<string>>())).type.toBe<ReadonlyArray<string>>()
    expect(pipe(hole<Chunk.Chunk<string>>(), Chunk.toReadonlyArray)).type.toBe<ReadonlyArray<string>>()

    // NonEmptyChunk
    expect(Chunk.toReadonlyArray(hole<Chunk.NonEmptyChunk<string>>())).type.toBe<
      readonly [string, ...Array<string>]
    >()
    expect(pipe(hole<Chunk.NonEmptyChunk<string>>(), Chunk.toReadonlyArray)).type.toBe<
      readonly [string, ...Array<string>]
    >()
  })
})
