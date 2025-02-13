import { Array, Effect, Either, Equal, Option, Order, Predicate } from "effect"
import { hole, identity, pipe } from "effect/Function"
import { describe, expect, it } from "tstyche"

declare const nonEmptyReadonlyNumbers: Array.NonEmptyReadonlyArray<number>
declare const nonEmptyReadonlyStrings: Array.NonEmptyReadonlyArray<string>
declare const nonEmptyNumbers: Array.NonEmptyArray<number>
declare const nonEmptyStrings: Array.NonEmptyArray<string>
declare const readonlyNumbers: ReadonlyArray<number>
declare const numbers: Array<number>
declare const strings: Array<string>
declare const iterNumbers: Iterable<number>
declare const iterStrings: Iterable<string>
declare const numbersOrStrings: Array<number | string>

declare const primitiveNumber: number
declare const primitiveNumerOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

declare const unknownValue: unknown
declare const stringOrStringArrayOrUnion: string | Array<string> | null

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

interface AB {
  readonly a: string
  readonly b: number
}
declare const abs: ReadonlyArray<AB>
declare const nonEmptyabs: Array.NonEmptyReadonlyArray<AB>
declare const ordera: Order.Order<{ readonly a: string }>

declare const flattenArray: Effect.Effect<ReadonlyArray<ReadonlyArray<number>>>
declare const flattenNonEmptyArray: Effect.Effect<
  Array.NonEmptyReadonlyArray<Array.NonEmptyReadonlyArray<number>>
>

describe("Array", () => {
  it("isArray", () => {
    if (Array.isArray(unknownValue)) {
      expect(unknownValue).type.toBe<Array<unknown>>()
    }
    if (Array.isArray(stringOrStringArrayOrUnion)) {
      expect(stringOrStringArrayOrUnion).type.toBe<Array<string>>()
    }
  })

  it("isEmptyReadonlyArray", () => {
    if (Array.isEmptyReadonlyArray(readonlyNumbers)) {
      expect(readonlyNumbers).type.toBe<readonly []>()
    }
    expect(Option.liftPredicate(Array.isEmptyReadonlyArray)).type.toBe<
      <A>(a: ReadonlyArray<A>) => Option.Option<readonly []>
    >()
  })

  it("isEmptyArray", () => {
    if (Array.isEmptyArray(numbers)) {
      expect(numbers).type.toBe<[]>()
    }
    expect(Option.liftPredicate(Array.isEmptyArray)).type.toBe<
      <A>(a: Array<A>) => Option.Option<[]>
    >()
  })

  it("isNonEmptyReadonlyArray", () => {
    if (Array.isNonEmptyReadonlyArray(readonlyNumbers)) {
      expect(readonlyNumbers).type.toBe<readonly [number, ...Array<number>]>()
    }
    expect(Option.liftPredicate(Array.isNonEmptyReadonlyArray)).type.toBe<
      <A>(a: ReadonlyArray<A>) => Option.Option<readonly [A, ...Array<A>]>
    >()
  })

  it("isNonEmptyArray", () => {
    if (Array.isNonEmptyArray(numbers)) {
      expect(numbers).type.toBe<[number, ...Array<number>]>()
    }
    expect(Option.liftPredicate(Array.isNonEmptyArray)).type.toBe<
      <A>(a: Array<A>) => Option.Option<[A, ...Array<A>]>
    >()
  })

  it("map", () => {
    expect(Array.map(readonlyNumbers, (n) => n + 1)).type.toBe<Array<number>>()
    expect(pipe(readonlyNumbers, Array.map((n) => n + 1))).type.toBe<Array<number>>()
    expect(Array.map(numbers, (n) => n + 1)).type.toBe<Array<number>>()
    expect(pipe(numbers, Array.map((n) => n + 1))).type.toBe<Array<number>>()
    expect(Array.map(nonEmptyReadonlyNumbers, (n) => n + 1)).type.toBe<
      [number, ...Array<number>]
    >()
    expect(
      pipe(nonEmptyReadonlyNumbers, Array.map((n) => n + 1))
    ).type.toBe<[number, ...Array<number>]>()
    expect(Array.map(nonEmptyNumbers, (n) => n + 1)).type.toBe<
      [number, ...Array<number>]
    >()
    expect(pipe(nonEmptyNumbers, Array.map((n) => n + 1))).type.toBe<
      [number, ...Array<number>]
    >()
  })

  it("groupBy", () => {
    expect(Array.groupBy([1, 2, 3], String)).type.toBe<
      Record<string, [number, ...Array<number>]>
    >()
    expect(
      Array.groupBy([1, 2, 3], (n) => n > 0 ? "positive" as const : "negative" as const)
    ).type.toBe<Record<string, [number, ...Array<number>]>>()
    expect(Array.groupBy(["a", "b"], Symbol.for)).type.toBe<
      Record<symbol, [string, ...Array<string>]>
    >()
    expect(
      Array.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC)
    ).type.toBe<Record<symbol, [string, ...Array<string>]>>()
  })

  it("some", () => {
    if (Array.some(numbersOrStrings, Predicate.isString)) {
      expect(numbersOrStrings).type.toBe<
        Array<string | number> & readonly [string | number, ...Array<string | number>]
      >()
    }
    pipe(
      numbersOrStrings,
      Array.some((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
  })

  it("every", () => {
    if (Array.every(numbersOrStrings, Predicate.isString)) {
      expect(numbersOrStrings).type.toBe<
        Array<string | number> & ReadonlyArray<string>
      >()
    }
    if (Array.every(Predicate.isString)(numbersOrStrings)) {
      expect(numbersOrStrings).type.toBe<
        Array<string | number> & ReadonlyArray<string>
      >()
    }
    Array.every(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    Array.every(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })
    pipe(
      numbersOrStrings,
      Array.every((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    pipe(
      numbersOrStrings,
      Array.every((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )
  })

  it("append", () => {
    expect(Array.append(numbersOrStrings, true)).type.toBe<
      [string | number | boolean, ...Array<string | number | boolean>]
    >()
    expect(Array.append(true)(numbersOrStrings)).type.toBe<
      [string | number | boolean, ...Array<string | number | boolean>]
    >()
  })

  it("prepend", () => {
    expect(Array.prepend(numbersOrStrings, true)).type.toBe<
      [string | number | boolean, ...Array<string | number | boolean>]
    >()
    expect(Array.prepend(true)(numbersOrStrings)).type.toBe<
      [string | number | boolean, ...Array<string | number | boolean>]
    >()
  })

  it("sort", () => {
    expect(Array.sort(abs, ordera)).type.toBe<Array<AB>>()
    expect(pipe(abs, Array.sort(ordera))).type.toBe<Array<AB>>()
    expect(Array.sort(ordera)(abs)).type.toBe<Array<AB>>()
    expect(Array.sort(nonEmptyabs, ordera)).type.toBe<[AB, ...Array<AB>]>()
    expect(pipe(nonEmptyabs, Array.sort(ordera))).type.toBe<[AB, ...Array<AB>]>()
    expect(Array.sort(ordera)(nonEmptyabs)).type.toBe<[AB, ...Array<AB>]>()
    // @ts-expect-error
    pipe([1], Array.sort(Order.string))
    // @ts-expect-error
    Array.sort([1], Order.string)
    // @ts-expect-error
    Array.sort(Order.string)([1])
  })

  it("sortWith", () => {
    expect(pipe(abs, Array.sortWith(identity, ordera))).type.toBe<Array<AB>>()
    expect(Array.sortWith(abs, identity, ordera)).type.toBe<Array<AB>>()
    expect(pipe(nonEmptyabs, Array.sortWith(identity, ordera))).type.toBe<
      [AB, ...Array<AB>]
    >()
    expect(Array.sortWith(nonEmptyabs, identity, ordera)).type.toBe<
      [AB, ...Array<AB>]
    >()
  })

  it("partition", () => {
    Array.partition(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    pipe(
      numbersOrStrings,
      Array.partition((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    expect(Array.partition(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      [excluded: Array<string | number>, satisfying: Array<string | number>]
    >()
    expect(pipe(numbersOrStrings, Array.partition(predicateNumbersOrStrings))).type.toBe<
      [excluded: Array<string | number>, satisfying: Array<string | number>]
    >()
    expect(Array.partition(numbersOrStrings, Predicate.isNumber)).type.toBe<
      [excluded: Array<string>, satisfying: Array<number>]
    >()
    expect(pipe(numbersOrStrings, Array.partition(Predicate.isNumber))).type.toBe<
      [excluded: Array<string>, satisfying: Array<number>]
    >()
  })

  it("filter", () => {
    Array.filter(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })

    // @ts-expect-error: wrong predicate type
    Array.filter(numbersOrStrings, (_item: string) => true)

    pipe(
      numbersOrStrings,
      Array.filter((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )

    // @ts-expect-error: wrong predicate type in pipe
    pipe(numbersOrStrings, Array.filter((_item: string) => true))

    expect(Array.filter(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Array<string | number>
    >()
    expect(Array.filter(numbers, predicateNumbersOrStrings)).type.toBe<Array<number>>()
    expect(pipe(numbersOrStrings, Array.filter(predicateNumbersOrStrings))).type.toBe<
      Array<string | number>
    >()
    expect(pipe(numbers, Array.filter(predicateNumbersOrStrings))).type.toBe<Array<number>>()
    expect(Array.filter(numbersOrStrings, Predicate.isNumber)).type.toBe<Array<number>>()
    expect(pipe(numbersOrStrings, Array.filter(Predicate.isNumber))).type.toBe<Array<number>>()
  })

  it("takeWhile", () => {
    Array.takeWhile(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    Array.takeWhile(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })
    pipe(
      numbersOrStrings,
      Array.takeWhile((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    pipe(
      numbersOrStrings,
      Array.takeWhile((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )
    expect(Array.takeWhile(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Array<string | number>
    >()
    expect(Array.takeWhile(numbers, predicateNumbersOrStrings)).type.toBe<Array<number>>()
    expect(pipe(numbersOrStrings, Array.takeWhile(predicateNumbersOrStrings))).type.toBe<
      Array<string | number>
    >()
    expect(pipe(numbers, Array.takeWhile(predicateNumbersOrStrings))).type.toBe<Array<number>>()
    expect(Array.takeWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<Array<number>>()
    expect(pipe(numbersOrStrings, Array.takeWhile(Predicate.isNumber))).type.toBe<Array<number>>()
  })

  it("findFirst", () => {
    Array.findFirst(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    Array.findFirst(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })
    expect(
      Array.findFirst(numbersOrStrings, (item, _i): item is number => true)
    ).type.toBe<Option.Option<number>>()
    expect(
      Array.findFirst(numbersOrStrings, (_item, _i) => Option.some(true))
    ).type.toBe<Option.Option<boolean>>()
    pipe(
      numbersOrStrings,
      Array.findFirst((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    pipe(
      numbersOrStrings,
      Array.findFirst((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )
    expect(
      pipe(
        numbersOrStrings,
        Array.findFirst((item, _i): item is number => true)
      )
    ).type.toBe<Option.Option<number>>()
    expect(
      pipe(
        numbersOrStrings,
        Array.findFirst((_item, _i) => Option.some(true))
      )
    ).type.toBe<Option.Option<boolean>>()
    expect(Array.findFirst(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Option.Option<string | number>
    >()
    expect(pipe(numbersOrStrings, Array.findFirst(predicateNumbersOrStrings))).type.toBe<
      Option.Option<string | number>
    >()
    expect(Array.findFirst(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Option.Option<number>
    >()
    expect(pipe(numbersOrStrings, Array.findFirst(Predicate.isNumber))).type.toBe<
      Option.Option<number>
    >()
  })

  it("findLast", () => {
    Array.findLast(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    Array.findLast(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })
    expect(
      Array.findLast(numbersOrStrings, (item, _i): item is number => true)
    ).type.toBe<Option.Option<number>>()
    expect(
      Array.findLast(numbersOrStrings, (_item, _i) => Option.some(true))
    ).type.toBe<Option.Option<boolean>>()
    pipe(
      numbersOrStrings,
      Array.findLast((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    pipe(
      numbersOrStrings,
      Array.findLast((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )
    expect(
      pipe(
        numbersOrStrings,
        Array.findLast((item, _i): item is number => true)
      )
    ).type.toBe<Option.Option<number>>()
    expect(
      pipe(
        numbersOrStrings,
        Array.findLast((_item, _i) => Option.some(true))
      )
    ).type.toBe<Option.Option<boolean>>()
    expect(Array.findLast(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      Option.Option<string | number>
    >()
    expect(pipe(numbersOrStrings, Array.findLast(predicateNumbersOrStrings))).type.toBe<
      Option.Option<string | number>
    >()
    expect(Array.findLast(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Option.Option<number>
    >()
    expect(pipe(numbersOrStrings, Array.findLast(Predicate.isNumber))).type.toBe<
      Option.Option<number>
    >()
  })

  it("liftPredicate", () => {
    expect(pipe(primitiveNumerOrString, Array.liftPredicate(Predicate.isString))).type.toBe<
      Array<string>
    >()
    pipe(
      primitiveNumerOrString,
      Array.liftPredicate((n): n is number => {
        expect(n).type.toBe<string | number>()
        return typeof n === "number"
      })
    )
    expect(pipe(primitiveNumerOrString, Array.liftPredicate(predicateNumbersOrStrings))).type.toBe<
      Array<string | number>
    >()
    expect(pipe(primitiveNumber, Array.liftPredicate(predicateNumbersOrStrings))).type.toBe<
      Array<number>
    >()
    expect(
      pipe(
        primitiveNumber,
        Array.liftPredicate((_n) => {
          expect(_n).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<Array<number>>()
  })

  it("span", () => {
    Array.span(numbersOrStrings, (item) => {
      expect(item).type.toBe<string | number>()
      return true
    })
    Array.span(numbersOrStrings, (item, i) => {
      expect(item).type.toBe<string | number>()
      expect(i).type.toBe<number>()
      return true
    })
    pipe(
      numbersOrStrings,
      Array.span((item) => {
        expect(item).type.toBe<string | number>()
        return true
      })
    )
    pipe(
      numbersOrStrings,
      Array.span((item, i) => {
        expect(item).type.toBe<string | number>()
        expect(i).type.toBe<number>()
        return true
      })
    )
    expect(Array.span(numbersOrStrings, predicateNumbersOrStrings)).type.toBe<
      [init: Array<string | number>, rest: Array<string | number>]
    >()
    expect(Array.span(numbers, predicateNumbersOrStrings)).type.toBe<
      [init: Array<number>, rest: Array<number>]
    >()
    expect(pipe(numbersOrStrings, Array.span(predicateNumbersOrStrings))).type.toBe<
      [init: Array<string | number>, rest: Array<string | number>]
    >()
    expect(pipe(numbers, Array.span(predicateNumbersOrStrings))).type.toBe<
      [init: Array<number>, rest: Array<number>]
    >()
    expect(Array.span(numbersOrStrings, Predicate.isNumber)).type.toBe<
      [init: Array<number>, rest: Array<string>]
    >()
    expect(pipe(numbersOrStrings, Array.span(Predicate.isNumber))).type.toBe<
      [init: Array<number>, rest: Array<string>]
    >()
  })

  it("dropWhile", () => {
    expect(Array.dropWhile(numbers, predicateNumbersOrStrings)).type.toBe<Array<number>>()
    expect(pipe(numbers, Array.dropWhile(predicateNumbersOrStrings))).type.toBe<Array<number>>()
    expect(Array.dropWhile(numbersOrStrings, Predicate.isNumber)).type.toBe<
      Array<string | number>
    >()
    expect(pipe(numbersOrStrings, Array.dropWhile(Predicate.isNumber))).type.toBe<
      Array<string | number>
    >()
  })

  it("flatMap", () => {
    expect(
      Array.flatMap(strings, (_s, _i) => Array.empty<number>())
    ).type.toBe<Array<number>>()
    expect(
      pipe(strings, Array.flatMap((_s, _i) => Array.empty<number>()))
    ).type.toBe<Array<number>>()
    expect(Array.flatMap(strings, (s, _i) => Array.of(s.length))).type.toBe<Array<number>>()
    expect(
      pipe(strings, Array.flatMap((s, _i) => Array.of(s.length)))
    ).type.toBe<Array<number>>()
    expect(
      Array.flatMap(nonEmptyReadonlyStrings, (_s, _i) => Array.empty<number>())
    ).type.toBe<Array<number>>()
    expect(
      pipe(nonEmptyReadonlyStrings, Array.flatMap((_s, _i) => Array.empty<number>()))
    ).type.toBe<Array<number>>()
    expect(
      Array.flatMap(nonEmptyReadonlyStrings, (s, _i) => Array.of(s.length))
    ).type.toBe<[number, ...Array<number>]>()
    expect(
      pipe(nonEmptyReadonlyStrings, Array.flatMap((s, _i) => Array.of(s.length)))
    ).type.toBe<[number, ...Array<number>]>()
  })

  it("flatten", () => {
    expect(Array.flatten(hole<Array<Array<number>>>())).type.toBe<Array<number>>()
    expect(
      Array.flatten(hole<Array<Array.NonEmptyArray<number>>>())
    ).type.toBe<Array<number>>()
    expect(
      Array.flatten(hole<Array.NonEmptyArray<Array<number>>>())
    ).type.toBe<Array<number>>()
    expect(
      Array.flatten(
        hole<Array.NonEmptyReadonlyArray<Array.NonEmptyReadonlyArray<number>>>()
      )
    ).type.toBe<[number, ...Array<number>]>()
    expect(flattenArray.pipe(Effect.map((arr) => Array.flatten(arr)))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(flattenArray.pipe(Effect.map(Array.flatten))).type.toBe<
      Effect.Effect<Array<number>, never, never>
    >()
    expect(
      flattenNonEmptyArray.pipe(Effect.map((arr) => Array.flatten(arr)))
    ).type.toBe<Effect.Effect<[number, ...Array<number>], never, never>>()
    expect(
      flattenNonEmptyArray.pipe(Effect.map(Array.flatten))
    ).type.toBe<Effect.Effect<[number, ...Array<number>], never, never>>()
  })

  it("prependAll", () => {
    expect(Array.prependAll(strings, numbers)).type.toBe<Array<string | number>>()
    expect(pipe(strings, Array.prependAll(numbers))).type.toBe<Array<string | number>>()
    expect(Array.prependAll(nonEmptyStrings, numbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.prependAll(numbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.prependAll(strings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(strings, Array.prependAll(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.prependAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.prependAll(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.prependAll(iterStrings, numbers)).type.toBe<Array<string | number>>()
    expect(pipe(iterStrings, Array.prependAll(numbers))).type.toBe<Array<string | number>>()
    expect(Array.prependAll(iterStrings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(iterStrings, Array.prependAll(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.prependAll(nonEmptyStrings, iterNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.prependAll(iterNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
  })

  it("appendAll", () => {
    expect(Array.appendAll(strings, numbers)).type.toBe<Array<string | number>>()
    expect(pipe(strings, Array.appendAll(numbers))).type.toBe<Array<string | number>>()
    expect(Array.appendAll(nonEmptyStrings, numbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.appendAll(numbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.appendAll(strings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(strings, Array.appendAll(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.appendAll(nonEmptyStrings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.appendAll(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
  })

  it("zip", () => {
    expect(Array.zip(strings, numbers)).type.toBe<Array<[string, number]>>()
    expect(pipe(strings, Array.zip(numbers))).type.toBe<Array<[string, number]>>()
    expect(Array.zip(numbers)(strings)).type.toBe<Array<[string, number]>>()
    expect(Array.zip(nonEmptyStrings, nonEmptyNumbers)).type.toBe<
      [[string, number], ...Array<[string, number]>]
    >()
    expect(pipe(nonEmptyStrings, Array.zip(nonEmptyNumbers))).type.toBe<
      [[string, number], ...Array<[string, number]>]
    >()
    expect(Array.zip(nonEmptyNumbers)(nonEmptyStrings)).type.toBe<
      [[string, number], ...Array<[string, number]>]
    >()
  })

  it("intersperse", () => {
    expect(Array.intersperse(strings, "a")).type.toBe<Array<string>>()
    expect(Array.intersperse(strings, 1)).type.toBe<Array<string | number>>()
    expect(pipe(strings, Array.intersperse("a"))).type.toBe<Array<string>>()
    expect(pipe(strings, Array.intersperse(1))).type.toBe<Array<string | number>>()
    expect(Array.intersperse("a")(strings)).type.toBe<Array<string>>()
    expect(Array.intersperse(1)(strings)).type.toBe<Array<string | number>>()
    expect(Array.intersperse(nonEmptyStrings, "a")).type.toBe<[string, ...Array<string>]>()
    expect(Array.intersperse(nonEmptyStrings, 1)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.intersperse("a"))).type.toBe<[string, ...Array<string>]>()
    expect(pipe(nonEmptyStrings, Array.intersperse(1))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.intersperse("a")(nonEmptyStrings)).type.toBe<[string, ...Array<string>]>()
    expect(Array.intersperse(1)(nonEmptyStrings)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
  })

  it("rotate", () => {
    expect(Array.rotate(strings, 10)).type.toBe<Array<string>>()
    expect(pipe(strings, Array.rotate(10))).type.toBe<Array<string>>()
    expect(Array.rotate(10)(strings)).type.toBe<Array<string>>()
    expect(Array.rotate(nonEmptyStrings, 10)).type.toBe<[string, ...Array<string>]>()
    expect(pipe(nonEmptyStrings, Array.rotate(10))).type.toBe<[string, ...Array<string>]>()
    expect(Array.rotate(10)(nonEmptyStrings)).type.toBe<[string, ...Array<string>]>()
  })

  it("union", () => {
    expect(Array.union(strings, numbers)).type.toBe<Array<string | number>>()
    expect(pipe(strings, Array.union(numbers))).type.toBe<Array<string | number>>()
    expect(Array.union(numbers)(strings)).type.toBe<Array<string | number>>()
    expect(Array.union(nonEmptyStrings, numbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.union(strings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.union(nonEmptyStrings, nonEmptyNumbers)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.union(numbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(strings, Array.union(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(pipe(nonEmptyStrings, Array.union(nonEmptyNumbers))).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.union(numbers)(nonEmptyStrings)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.union(nonEmptyNumbers)(strings)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
    expect(Array.union(nonEmptyNumbers)(nonEmptyStrings)).type.toBe<
      [string | number, ...Array<string | number>]
    >()
  })

  it("unionWith", () => {
    expect(
      Array.unionWith(strings, numbers, Equal.equivalence<string | number>())
    ).type.toBe<Array<string | number>>()
    expect(
      Array.unionWith(strings, numbers, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<number>()
        return true
      })
    ).type.toBe<Array<string | number>>()
    expect(
      pipe(strings, Array.unionWith(numbers, Equal.equivalence<string | number>()))
    ).type.toBe<Array<string | number>>()
    expect(
      pipe(
        strings,
        Array.unionWith(numbers, (_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<Array<string | number>>()
    expect(
      Array.unionWith(nonEmptyStrings, numbers, Equal.equivalence<string | number>())
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      Array.unionWith(nonEmptyStrings, numbers, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<number>()
        return true
      })
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      Array.unionWith(strings, nonEmptyNumbers, Equal.equivalence<string | number>())
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      Array.unionWith(strings, nonEmptyNumbers, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<number>()
        return true
      })
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      Array.unionWith(nonEmptyStrings, nonEmptyNumbers, Equal.equivalence<string | number>())
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      Array.unionWith(nonEmptyStrings, nonEmptyNumbers, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<number>()
        return true
      })
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(nonEmptyStrings, Array.unionWith(numbers, Equal.equivalence<string | number>()))
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(
        nonEmptyStrings,
        Array.unionWith(numbers, (_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(strings, Array.unionWith(nonEmptyNumbers, Equal.equivalence<string | number>()))
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(
        strings,
        Array.unionWith(nonEmptyNumbers, (_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(nonEmptyStrings, Array.unionWith(nonEmptyNumbers, Equal.equivalence<string | number>()))
    ).type.toBe<[string | number, ...Array<string | number>]>()
    expect(
      pipe(
        nonEmptyStrings,
        Array.unionWith(nonEmptyNumbers, (_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<[string | number, ...Array<string | number>]>()
  })

  it("dedupe", () => {
    expect(Array.dedupe(strings)).type.toBe<Array<string>>()
    expect(pipe(strings, Array.dedupe)).type.toBe<Array<string>>()
    expect(Array.dedupe(nonEmptyStrings)).type.toBe<[string, ...Array<string>]>()
    expect(pipe(nonEmptyStrings, Array.dedupe)).type.toBe<[string, ...Array<string>]>()
  })

  it("dedupeWith", () => {
    expect(Array.dedupeWith(strings, Equal.equivalence())).type.toBe<Array<string>>()
    expect(
      Array.dedupeWith(strings, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<string>()
        return true
      })
    ).type.toBe<Array<string>>()
    expect(pipe(strings, Array.dedupeWith(Equal.equivalence()))).type.toBe<Array<string>>()
    expect(
      pipe(
        strings,
        Array.dedupeWith((_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<string>()
          return true
        })
      )
    ).type.toBe<Array<string>>()
    expect(Array.dedupeWith(nonEmptyStrings, Equal.equivalence())).type.toBe<
      [string, ...Array<string>]
    >()
    expect(
      Array.dedupeWith(nonEmptyStrings, (_a, _b) => {
        expect(_a).type.toBe<string>()
        expect(_b).type.toBe<string>()
        return true
      })
    ).type.toBe<[string, ...Array<string>]>()
    expect(pipe(nonEmptyStrings, Array.dedupeWith(Equal.equivalence()))).type.toBe<
      [string, ...Array<string>]
    >()
    expect(
      pipe(
        nonEmptyStrings,
        Array.dedupeWith((_a, _b) => {
          expect(_a).type.toBe<string>()
          expect(_b).type.toBe<string>()
          return true
        })
      )
    ).type.toBe<[string, ...Array<string>]>()
  })

  it("chop", () => {
    expect(
      Array.chop(strings, ([head, ...tail]) => {
        expect(head).type.toBe<string>()
        expect(tail).type.toBe<Array<string>>()
        return [head, tail]
      })
    ).type.toBe<Array<string>>()
    expect(
      pipe(
        strings,
        Array.chop(([head, ...tail]) => {
          expect(head).type.toBe<string>()
          expect(tail).type.toBe<Array<string>>()
          return [head, tail]
        })
      )
    ).type.toBe<Array<string>>()
    expect(
      Array.chop(nonEmptyStrings, ([head, ...tail]) => {
        expect(head).type.toBe<string>()
        expect(tail).type.toBe<Array<string>>()
        return [head, tail]
      })
    ).type.toBe<[string, ...Array<string>]>()
    expect(
      pipe(
        nonEmptyStrings,
        Array.chop(([head, ...tail]) => {
          expect(head).type.toBe<string>()
          expect(tail).type.toBe<Array<string>>()
          return [head, tail]
        })
      )
    ).type.toBe<[string, ...Array<string>]>()
  })

  it("chunksOf", () => {
    expect(Array.chunksOf(strings, 10)).type.toBe<Array<[string, ...Array<string>]>>()
    expect(pipe(strings, Array.chunksOf(10))).type.toBe<Array<[string, ...Array<string>]>>()
    expect(Array.chunksOf(10)(strings)).type.toBe<Array<[string, ...Array<string>]>>()
    expect(Array.chunksOf(nonEmptyStrings, 10)).type.toBe<
      [[string, ...Array<string>], ...Array<[string, ...Array<string>]>]
    >()
    expect(pipe(nonEmptyStrings, Array.chunksOf(10))).type.toBe<
      [[string, ...Array<string>], ...Array<[string, ...Array<string>]>]
    >()
    expect(Array.chunksOf(10)(nonEmptyStrings)).type.toBe<
      [[string, ...Array<string>], ...Array<[string, ...Array<string>]>]
    >()
  })

  it("reverse", () => {
    expect(Array.reverse(strings)).type.toBe<Array<string>>()
    expect(pipe(strings, Array.reverse)).type.toBe<Array<string>>()
    expect(Array.reverse(nonEmptyStrings)).type.toBe<[string, ...Array<string>]>()
    expect(pipe(nonEmptyStrings, Array.reverse)).type.toBe<[string, ...Array<string>]>()
  })

  it("sortBy", () => {
    expect(pipe(abs, Array.sortBy(ordera))).type.toBe<Array<AB>>()
    expect(
      pipe(
        abs,
        Array.sortBy((_a, _b) => 0)
      )
    ).type.toBe<Array<AB>>()
    expect(pipe(nonEmptyabs, Array.sortBy(ordera))).type.toBe<[AB, ...Array<AB>]>()
    expect(
      pipe(
        nonEmptyabs,
        Array.sortBy((_a, _b) => 0)
      )
    ).type.toBe<[AB, ...Array<AB>]>()
  })

  it("unzip", () => {
    expect(Array.unzip(hole<Iterable<[string, number]>>())).type.toBe<
      [Array<string>, Array<number>]
    >()
    expect(pipe(hole<Iterable<[string, number]>>(), Array.unzip)).type.toBe<
      [Array<string>, Array<number>]
    >()
    expect(
      Array.unzip(hole<Array.NonEmptyReadonlyArray<[string, number]>>())
    ).type.toBe<[[string, ...Array<string>], [number, ...Array<number>]]>()
    expect(
      pipe(hole<Array.NonEmptyReadonlyArray<[string, number]>>(), Array.unzip)
    ).type.toBe<[[string, ...Array<string>], [number, ...Array<number>]]>()
  })

  it("zipWith", () => {
    expect(
      Array.zipWith(strings, numbers, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<number>()
        return [a, b] as [string, number]
      })
    ).type.toBe<Array<[string, number]>>()
    expect(
      pipe(
        strings,
        Array.zipWith(numbers, (a, b) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          return [a, b] as [string, number]
        })
      )
    ).type.toBe<Array<[string, number]>>()
    expect(
      Array.zipWith(nonEmptyStrings, nonEmptyNumbers, (a, b) => {
        expect(a).type.toBe<string>()
        expect(b).type.toBe<number>()
        return [a, b] as [string, number]
      })
    ).type.toBe<[[string, number], ...Array<[string, number]>]>()
    expect(
      pipe(
        nonEmptyStrings,
        Array.zipWith(nonEmptyNumbers, (a, b) => {
          expect(a).type.toBe<string>()
          expect(b).type.toBe<number>()
          return [a, b] as [string, number]
        })
      )
    ).type.toBe<[[string, number], ...Array<[string, number]>]>()
  })

  it("separate", () => {
    expect(Array.separate([])).type.toBe<[Array<unknown>, Array<unknown>]>()
    expect(Array.separate([Either.right(1)])).type.toBe<[Array<never>, Array<number>]>()
    expect(Array.separate([Either.left("a")])).type.toBe<[Array<string>, Array<never>]>()
    expect(Array.separate([Either.left("a"), Either.right(1)])).type.toBe<
      [Array<string>, Array<number>]
    >()
    expect(Array.separate(hole<Array<Either.Either<number, string>>>())).type.toBe<
      [Array<string>, Array<number>]
    >()
    expect(
      Array.separate(hole<Iterable<Either.Either<number, string>>>())
    ).type.toBe<[Array<string>, Array<number>]>()
    expect(
      Array.separate(
        hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>()
      )
    ).type.toBe<[Array<string | Date>, Array<number | boolean>]>()
    expect(
      Array.separate(
        hole<
          Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>
        >()
      )
    ).type.toBe<[Array<string | Date>, Array<number | boolean>]>()
  })

  it("getRights", () => {
    expect(Array.getRights([])).type.toBe<Array<unknown>>()
    expect(Array.getRights([Either.left("a")])).type.toBe<Array<never>>()
    expect(Array.getRights([Either.right(1)])).type.toBe<Array<number>>()
    expect(Array.getRights([Either.left("a"), Either.right(1)])).type.toBe<Array<number>>()
    expect(Array.getRights(hole<Array<Either.Either<number, string>>>())).type.toBe<
      Array<number>
    >()
    expect(
      Array.getRights(hole<Iterable<Either.Either<number, string>>>())
    ).type.toBe<Array<number>>()
    expect(
      Array.getRights(
        hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>()
      )
    ).type.toBe<Array<number | boolean>>()
    expect(
      Array.getRights(
        hole<Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>>()
      )
    ).type.toBe<Array<number | boolean>>()
  })

  it("getLefts", () => {
    expect(Array.getLefts([])).type.toBe<Array<unknown>>()
    expect(Array.getLefts([Either.left("a")])).type.toBe<Array<string>>()
    expect(Array.getLefts([Either.right(1)])).type.toBe<Array<never>>()
    expect(Array.getLefts([Either.left("a"), Either.right(1)])).type.toBe<Array<string>>()
    expect(Array.getLefts(hole<Array<Either.Either<number, string>>>())).type.toBe<
      Array<string>
    >()
    expect(
      Array.getLefts(hole<Iterable<Either.Either<number, string>>>())
    ).type.toBe<Array<string>>()
    expect(
      Array.getLefts(
        hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>()
      )
    ).type.toBe<Array<string | Date>>()
    expect(
      Array.getLefts(
        hole<Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>>()
      )
    ).type.toBe<Array<string | Date>>()
  })

  it("getSomes", () => {
    expect(Array.getSomes([])).type.toBe<Array<unknown>>()
    expect(Array.getSomes([Option.none()])).type.toBe<Array<never>>()
    expect(Array.getSomes([Option.some(1)])).type.toBe<Array<number>>()
    expect(Array.getSomes([Option.none(), Option.some(1)])).type.toBe<Array<number>>()
    expect(Array.getSomes(hole<Array<Option.Option<number>>>())).type.toBe<Array<number>>()
    expect(
      Array.getSomes(hole<Iterable<Option.Option<number>>>())
    ).type.toBe<Array<number>>()
    expect(
      Array.getSomes(hole<Iterable<Option.Option<number> | Option.Option<string>>>())
    ).type.toBe<Array<string | number>>()
    expect(
      Array.getSomes(
        hole<Iterable<Option.Option<number>> | Iterable<Option.Option<string>>>()
      )
    ).type.toBe<Array<string | number>>()
  })

  it("replace", () => {
    expect(Array.replace([], 0, "a")).type.toBe<Array<string>>()
    expect(Array.replace(numbers, 0, "a")).type.toBe<Array<string | number>>()
    expect(Array.replace(nonEmptyNumbers, 0, "a" as const)).type.toBe<
      [number | "a", ...Array<number | "a">]
    >()
    expect(Array.replace(new Set([1, 2] as const), 0, "a" as const)).type.toBe<
      Array<"a" | 1 | 2>
    >()
    expect(pipe([], Array.replace(0, "a"))).type.toBe<Array<string>>()
    expect(pipe(numbers, Array.replace(0, "a"))).type.toBe<Array<string | number>>()
    expect(pipe(nonEmptyNumbers, Array.replace(0, "a" as const))).type.toBe<
      [number | "a", ...Array<number | "a">]
    >()
    expect(pipe(new Set([1, 2] as const), Array.replace(0, "a" as const))).type.toBe<
      Array<"a" | 1 | 2>
    >()
    expect(pipe(Array.of(1), Array.replace(0, "a" as const))).type.toBe<
      [number | "a", ...Array<number | "a">]
    >()
  })

  it("replaceOption", () => {
    expect(Array.replaceOption([], 0, "a")).type.toBe<Option.Option<Array<string>>>()
    expect(Array.replaceOption(numbers, 0, "a")).type.toBe<
      Option.Option<Array<string | number>>
    >()
    expect(Array.replaceOption(nonEmptyNumbers, 0, "a" as const)).type.toBe<
      Option.Option<[number | "a", ...Array<number | "a">]>
    >()
    expect(Array.replaceOption(new Set([1, 2] as const), 0, "a" as const)).type.toBe<
      Option.Option<Array<"a" | 1 | 2>>
    >()
    expect(pipe([], Array.replaceOption(0, "a"))).type.toBe<Option.Option<Array<string>>>()
    expect(pipe(numbers, Array.replaceOption(0, "a"))).type.toBe<
      Option.Option<Array<string | number>>
    >()
    expect(pipe(nonEmptyNumbers, Array.replaceOption(0, "a" as const))).type.toBe<
      Option.Option<[number | "a", ...Array<number | "a">]>
    >()
    expect(pipe(new Set([1, 2] as const), Array.replaceOption(0, "a" as const))).type.toBe<
      Option.Option<Array<"a" | 1 | 2>>
    >()
  })

  it("modify", () => {
    expect(Array.modify([], 0, (_n) => "a")).type.toBe<Array<string>>()
    expect(Array.modify(numbers, 0, (_n) => "a")).type.toBe<Array<string | number>>()
    expect(Array.modify(nonEmptyNumbers, 0, (_n) => "a" as const)).type.toBe<
      [number | "a", ...Array<number | "a">]
    >()
    expect(Array.modify(new Set([1, 2] as const), 0, (_n) => "a" as const)).type.toBe<
      Array<"a" | 1 | 2>
    >()
    expect(pipe([], Array.modify(0, (_n) => "a"))).type.toBe<Array<string>>()
    expect(pipe(numbers, Array.modify(0, (_n) => "a"))).type.toBe<
      Array<string | number>
    >()
    expect(pipe(nonEmptyNumbers, Array.modify(0, (_n) => "a" as const))).type.toBe<
      [number | "a", ...Array<number | "a">]
    >()
    expect(
      pipe(new Set([1, 2] as const), Array.modify(0, (_n) => "a" as const))
    ).type.toBe<Array<"a" | 1 | 2>>()
  })

  it("modifyOption", () => {
    expect(Array.modifyOption([], 0, (_n) => "a")).type.toBe<Option.Option<Array<string>>>()
    expect(Array.modifyOption(numbers, 0, (_n) => "a")).type.toBe<
      Option.Option<Array<string | number>>
    >()
    expect(
      Array.modifyOption(nonEmptyNumbers, 0, (_n) => "a" as const)
    ).type.toBe<Option.Option<[number | "a", ...Array<number | "a">]>>()
    expect(
      Array.modifyOption(new Set([1, 2] as const), 0, (_n) => "a" as const)
    ).type.toBe<Option.Option<Array<"a" | 1 | 2>>>()
    expect(pipe([], Array.modifyOption(0, (_n) => "a"))).type.toBe<
      Option.Option<Array<string>>
    >()
    expect(pipe(numbers, Array.modifyOption(0, (_n) => "a"))).type.toBe<
      Option.Option<Array<string | number>>
    >()
    expect(
      pipe(nonEmptyNumbers, Array.modifyOption(0, (_n) => "a" as const))
    ).type.toBe<Option.Option<[number | "a", ...Array<number | "a">]>>()
    expect(
      pipe(new Set([1, 2] as const), Array.modifyOption(0, (_n) => "a" as const))
    ).type.toBe<Option.Option<Array<"a" | 1 | 2>>>()
  })

  it("mapAccum", () => {
    expect(Array.mapAccum(strings, 0, (s, a, i) => [s + i, a])).type.toBe<
      [state: number, mappedArray: Array<string>]
    >()
    expect(
      Array.mapAccum(nonEmptyReadonlyStrings, 0, (s, a, i) => [s + i, a])
    ).type.toBe<[state: number, mappedArray: [string, ...Array<string>]]>()
    expect(
      pipe(strings, Array.mapAccum(0, (s, a, i) => [s + i, a]))
    ).type.toBe<[state: number, mappedArray: Array<string>]>()
    expect(
      pipe(nonEmptyReadonlyStrings, Array.mapAccum(0, (s, a, i) => [s + i, a]))
    ).type.toBe<[state: number, mappedArray: [string, ...Array<string>]]>()
  })
})
