import { Iterable, Effect, Option, Predicate } from "effect"
import { NonEmptyArray } from "effect/Array"
import { hole, pipe } from "effect/Function"
import { describe, expect, it, when } from "tstyche"
import { NonEmptyIterable } from "effect/NonEmptyIterable"

declare const nonEmptyStrings: NonEmptyIterable<string>
declare const nonEmptyNumbers: NonEmptyIterable<number>
declare const numbers: Iterable<number>
declare const strings: Iterable<string>
declare const numbersOrStrings: Iterable<number | string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

describe("Iterable", () => {

  it("isEmptyIterable", () => {
    if (Iterable.isEmpty(numbers)) {
      expect(numbers).type.toBe<Iterable<never>>()
    }
    // should play well with `Option.liftPredicate`
    expect(Option.liftPredicate(Iterable.isEmpty)).type.toBe<
      <A>(a: Iterable<A>) => Option.Option<Iterable<never>>
    >()
  })

  it("map", () => {
    expect(Iterable.map(strings, (s, i) => {
      expect(s).type.toBe<string>()
      expect(i).type.toBe<number>()
      return s + "a"
    })).type.toBe<Iterable<string>>()
    expect(pipe(
      strings,
      Iterable.map((s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return s + "a"
      })
    )).type.toBe<Iterable<string>>()

    expect(Iterable.map(nonEmptyStrings, (s, i) => {
      expect(s).type.toBe<string>()
      expect(i).type.toBe<number>()
      return s + "a"
    })).type.toBe<NonEmptyIterable<string>>()
    expect(pipe(
      nonEmptyStrings,
      Iterable.map((s, i) => {
        expect(s).type.toBe<string>()
        expect(i).type.toBe<number>()
        return s + "a"
      })
    )).type.toBe<NonEmptyIterable<string>>()
  })

  it("groupBy", () => {
    expect(Iterable.groupBy([1, 2, 3], (n) => {
      expect(n).type.toBe<number>()
      return String(n)
    })).type.toBe<Record<string, NonEmptyArray<number>>>()
    expect(pipe(
      [1, 2, 3],
      Iterable.groupBy((n) => {
        expect(n).type.toBe<number>()
        return String(n)
      })
    )).type.toBe<Record<string, NonEmptyArray<number>>>()
    expect(
      Iterable.groupBy([1, 2, 3], (n) => n > 0 ? "positive" as const : "negative" as const)
    ).type.toBe<Record<string, NonEmptyArray<number>>>()
    expect(Iterable.groupBy(["a", "b"], Symbol.for)).type.toBe<Record<symbol, NonEmptyArray<string>>>()
    expect(Iterable.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC)).type.toBe<
      Record<symbol, NonEmptyArray<string>>
    >()
  })

  it("some", () => {
    expect(Iterable.some(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })).type.toBe<boolean>()
    expect(pipe(
      numbersOrStrings,
      Iterable.some((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )).type.toBe<boolean>()
    if (Iterable.some(numbersOrStrings, Predicate.isString)) {
      expect(numbersOrStrings).type.toBe<
        Iterable<string | number>
      >()
    }
  })

  it("append", () => {
    expect(Iterable.append(numbersOrStrings, true))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
    expect(pipe(numbersOrStrings, Iterable.append(true)))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
    expect(Iterable.append(true)(numbersOrStrings))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
  })

  it("prepend", () => {
    expect(Iterable.prepend(numbersOrStrings, true))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
    expect(pipe(numbersOrStrings, Iterable.prepend(true)))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
    expect(Iterable.prepend(true)(numbersOrStrings))
      .type.toBe<NonEmptyIterable<string | number | boolean>>()
  })

  it("filter", () => {
    expect(Iterable.filter(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })).type.toBe<Iterable<string | number>>()
    expect(pipe(
      numbersOrStrings,
      Iterable.filter((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )).type.toBe<Iterable<string | number>>()

    expect(Iterable.filter).type.not.toBeCallableWith(numbersOrStrings, (_item: string) => true)
    when(pipe).isCalledWith(
      numbersOrStrings,
      expect(Iterable.filter).type.not.toBeCallableWith((_item: string) => true)
    )

    expect(Iterable.filter(numbers, predicateNumbersOrStrings)).type.toBe<Iterable<number>>()
    expect(pipe(numbers, Iterable.filter(predicateNumbersOrStrings))).type.toBe<Iterable<number>>()

    expect(Iterable.filter(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<Iterable<string | number>>()
    expect(pipe(numbersOrStrings, Iterable.filter(predicateNumbersOrStrings))).type.toBe<Iterable<string | number>>()

    expect(Iterable.filter(numbersOrStrings, Predicate.isNumber)).type.toBe<Iterable<number>>()
    expect(pipe(numbersOrStrings, Iterable.filter(Predicate.isNumber))).type.toBe<Iterable<number>>()
  })

  it("takeWhile", () => {
    expect(Iterable.takeWhile(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })).type.toBe<Iterable<string | number>>()
    expect(pipe(
      numbersOrStrings,
      Iterable.takeWhile((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )).type.toBe<Iterable<string | number>>()

    expect(Iterable.takeWhile(numbers, predicateNumbersOrStrings)).type.toBe<Iterable<number>>()
    expect(pipe(numbers, Iterable.takeWhile(predicateNumbersOrStrings))).type.toBe<Iterable<number>>()

    expect(Iterable.takeWhile(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<Iterable<string | number>>()
    expect(pipe(numbersOrStrings, Iterable.takeWhile(predicateNumbersOrStrings))).type.toBe<Iterable<string | number>>()

    expect(Iterable.takeWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<Iterable<number>>()
    expect(pipe(numbersOrStrings, Iterable.takeWhile(Predicate.isNumber))).type.toBe<Iterable<number>>()
  })

  it("findFirst", () => {
    expect(Iterable.findFirst(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })).type.toBe<Option.Option<string | number>>()
    expect(pipe(
      numbersOrStrings,
      Iterable.findFirst((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )).type.toBe<Option.Option<string | number>>()

    expect(Iterable.findFirst(numbersOrStrings, Predicate.isNumber)).type.toBe<Option.Option<number>>()
    expect(pipe(numbersOrStrings, Iterable.findFirst(Predicate.isNumber))).type.toBe<Option.Option<number>>()
  })

  it("findLast", () => {
    expect(Iterable.findLast(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })).type.toBe<Option.Option<string | number>>()
    expect(pipe(
      numbersOrStrings,
      Iterable.findLast((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )).type.toBe<Option.Option<string | number>>()

    expect(Iterable.findLast(numbersOrStrings, Predicate.isNumber)).type.toBe<Option.Option<number>>()
    expect(pipe(numbersOrStrings, Iterable.findLast(Predicate.isNumber))).type.toBe<Option.Option<number>>()

  })

  it("flatMap", () => {
    expect(
      Iterable.flatMap(strings, (item, i) => {
        expect(item).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Iterable.empty<number>()
      })
    ).type.toBe<Iterable<number>>()
    expect(
      pipe(
        strings,
        Iterable.flatMap((item, i) => {
          expect(item).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Iterable.empty<number>()
        })
      )
    ).type.toBe<Iterable<number>>()

    expect(
      Iterable.flatMap(nonEmptyStrings, (item, i) => {
        expect(item).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Iterable.empty<number>()
      })
    ).type.toBe<Iterable<number>>()
    expect(
      pipe(
        nonEmptyStrings,
        Iterable.flatMap((item, i) => {
          expect(item).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Iterable.empty<number>()
        })
      )
    ).type.toBe<Iterable<number>>()

    expect(
      Iterable.flatMap(nonEmptyStrings, (item, i) => {
        expect(item).type.toBe<string>()
        expect(i).type.toBe<number>()
        return Iterable.of(item.length)
      })
    ).type.toBe<NonEmptyIterable<number>>()
    expect(
      pipe(
        nonEmptyStrings,
        Iterable.flatMap((item, i) => {
          expect(item).type.toBe<string>()
          expect(i).type.toBe<number>()
          return Iterable.of(item.length)
        })
      )
    ).type.toBe<NonEmptyIterable<number>>()
  })

  it("flatten", () => {
    expect(Iterable.flatten(hole<Iterable<Iterable<number>>>())).type.toBe<Iterable<number>>()
    expect(Iterable.flatten(hole<Iterable<NonEmptyIterable<number>>>())).type.toBe<Iterable<number>>()
    expect(Iterable.flatten(hole<NonEmptyIterable<Iterable<number>>>())).type.toBe<Iterable<number>>()
    expect(Iterable.flatten(hole<NonEmptyIterable<NonEmptyIterable<number>>>()))
      .type.toBe<NonEmptyIterable<number>>()

    expect(
      hole<Effect.Effect<Iterable<Iterable<number>>>>().pipe(Effect.map((x) => {
        expect(x).type.toBe<Iterable<Iterable<number>>>()
        return Iterable.flatten(x)
      }))
    ).type.toBe<Effect.Effect<Iterable<number>, never, never>>()
    expect(
      hole<Effect.Effect<NonEmptyIterable<NonEmptyIterable<number>>>>().pipe(Effect.map((x) => {
        expect(x).type.toBe<NonEmptyIterable<NonEmptyIterable<number>>>()
        return Iterable.flatten(x)
      }))
    ).type.toBe<Effect.Effect<NonEmptyIterable<number>, never, never>>()
  })

  it("prependAll", () => {
    // Iterable + Iterable
    expect(Iterable.prependAll(strings, numbers)).type.toBe<Iterable<string | number>>()
    expect(pipe(strings, Iterable.prependAll(numbers))).type.toBe<Iterable<string | number>>()

    // NonEmptyIterable + Iterable
    expect(Iterable.prependAll(nonEmptyStrings, numbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(nonEmptyStrings, Iterable.prependAll(numbers))).type.toBe<NonEmptyIterable<string | number>>()

    // Iterable + NonEmptyIterable
    expect(Iterable.prependAll(strings, nonEmptyNumbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(strings, Iterable.prependAll(nonEmptyNumbers))).type.toBe<NonEmptyIterable<string | number>>()

    // NonEmptyIterable + NonEmptyIterable
    expect(Iterable.prependAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(nonEmptyStrings, Iterable.prependAll(nonEmptyNumbers))).type.toBe<
      NonEmptyIterable<string | number>
    >()
  })

  it("appendAll", () => {
    // Iterable + Iterable
    expect(Iterable.appendAll(strings, numbers)).type.toBe<Iterable<string | number>>()
    expect(pipe(strings, Iterable.appendAll(numbers))).type.toBe<Iterable<string | number>>()

    // NonEmptyIterable + Iterable
    expect(Iterable.appendAll(nonEmptyStrings, numbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(nonEmptyStrings, Iterable.appendAll(numbers))).type.toBe<NonEmptyIterable<string | number>>()

    // Iterable + NonEmptyIterable
    expect(Iterable.appendAll(strings, nonEmptyNumbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(strings, Iterable.appendAll(nonEmptyNumbers))).type.toBe<NonEmptyIterable<string | number>>()

    // NonEmptyIterable + NonEmptyIterable
    expect(Iterable.appendAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(nonEmptyStrings, Iterable.appendAll(nonEmptyNumbers)))
      .type.toBe<NonEmptyIterable<string | number>>()
  })

  it("zip", () => {
    expect(Iterable.zip(strings, numbers)).type.toBe<Iterable<[string, number]>>()
    expect(pipe(strings, Iterable.zip(numbers))).type.toBe<Iterable<[string, number]>>()
    expect(Iterable.zip(numbers)(strings)).type.toBe<Iterable<[string, number]>>()

    expect(Iterable.zip(nonEmptyStrings, nonEmptyNumbers)).type.toBe<NonEmptyIterable<[string, number]>>()
    expect(pipe(nonEmptyStrings, Iterable.zip(nonEmptyNumbers)))
      .type.toBe<NonEmptyIterable<[string, number]>>()
    expect(Iterable.zip(nonEmptyNumbers)(nonEmptyStrings)).type.toBe<NonEmptyIterable<[string, number]>>()
  })

  it("intersperse", () => {
    expect(Iterable.intersperse(strings, "a")).type.toBe<Iterable<string>>()
    expect(pipe(strings, Iterable.intersperse("a"))).type.toBe<Iterable<string>>()
    expect(Iterable.intersperse("a")(strings)).type.toBe<Iterable<string>>()

    expect(Iterable.intersperse(strings, 1)).type.toBe<Iterable<string | number>>()
    expect(pipe(strings, Iterable.intersperse(1))).type.toBe<Iterable<string | number>>()
    expect(Iterable.intersperse(1)(strings)).type.toBe<Iterable<string | number>>()

    expect(Iterable.intersperse(nonEmptyStrings, "a")).type.toBe<NonEmptyIterable<string>>()
    expect(pipe(nonEmptyStrings, Iterable.intersperse("a"))).type.toBe<NonEmptyIterable<string>>()
    expect(Iterable.intersperse("a")(nonEmptyStrings)).type.toBe<NonEmptyIterable<string>>()

    expect(Iterable.intersperse(nonEmptyStrings, 1)).type.toBe<NonEmptyIterable<string | number>>()
    expect(pipe(nonEmptyStrings, Iterable.intersperse(1))).type.toBe<NonEmptyIterable<string | number>>()
    expect(Iterable.intersperse(1)(nonEmptyStrings)).type.toBe<NonEmptyIterable<string | number>>()
  })

  it("dedupe", () => {
    // Iterable
    expect(Iterable.dedupe(strings)).type.toBe<Iterable<string>>()
    expect(pipe(strings, Iterable.dedupe)).type.toBe<Iterable<string>>()

    // NonEmptyIterable
    expect(Iterable.dedupe(nonEmptyStrings)).type.toBe<NonEmptyIterable<string>>()
    expect(pipe(nonEmptyStrings, Iterable.dedupe)).type.toBe<NonEmptyIterable<string>>()
  })

  it("dedupeAdjacentWith", () => {
    // Iterable
    expect(
      Iterable.dedupeAdjacentWith(strings, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<string>()
        return true
      })
    ).type.toBe<Iterable<string>>()
    expect(pipe(
      strings,
      Iterable.dedupeAdjacentWith((a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<string>()
        return true
      })
    )).type.toBe<Iterable<string>>()

    // NonEmptyIterable
    expect(
      Iterable.dedupeAdjacentWith(nonEmptyStrings, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<string>()
        return true
      })
    ).type.toBe<NonEmptyIterable<string>>()
    expect(
      pipe(
        nonEmptyStrings,
        Iterable.dedupeAdjacentWith((a, b) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<string>()
          return true
        })
      )
    ).type.toBe<NonEmptyIterable<string>>()
  })

  it("chunksOf", () => {
    // Iterable
    expect(Iterable.chunksOf(strings, 10)).type.toBe<Iterable<NonEmptyArray<string>>>()
    expect(pipe(strings, Iterable.chunksOf(10))).type.toBe<Iterable<NonEmptyArray<string>>>()
    expect(Iterable.chunksOf(10)(strings)).type.toBe<Iterable<NonEmptyArray<string>>>()

    // NonEmptyIterable
    expect(Iterable.chunksOf(nonEmptyStrings, 10))
      .type.toBe<NonEmptyIterable<NonEmptyArray<string>>>()
    expect(pipe(nonEmptyStrings, Iterable.chunksOf(10)))
      .type.toBe<NonEmptyIterable<NonEmptyArray<string>>>()
    expect(Iterable.chunksOf(10)(nonEmptyStrings))
      .type.toBe<NonEmptyIterable<NonEmptyArray<string>>>()
  })

  it("zipWith", () => {
    // Iterable + Iterable
    expect(
      Iterable.zipWith(strings, numbers, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<number>()
        return [a, b] as [string, number]
      })
    ).type.toBe<Iterable<[string, number]>>()
    expect(
      pipe(
        strings,
        Iterable.zipWith(numbers, (a, b) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          return [a, b] as [string, number]
        })
      )
    ).type.toBe<Iterable<[string, number]>>()

    // NonEmptyIterable + NonEmptyIterable
    expect(
      Iterable.zipWith(nonEmptyStrings, nonEmptyNumbers, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<number>()
        return [a, b] as [string, number]
      })
    ).type.toBe<NonEmptyIterable<[string, number]>>()
    expect(
      pipe(
        nonEmptyStrings,
        Iterable.zipWith(nonEmptyNumbers, (a, b) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          return [a, b] as [string, number]
        })
      )
    ).type.toBe<NonEmptyIterable<[string, number]>>()
  })

})
