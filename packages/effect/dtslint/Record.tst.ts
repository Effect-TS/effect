import type { Brand } from "effect"
import { Either, hole, Option, pipe, Predicate, Record } from "effect"
import { describe, expect, it, when } from "tstyche"

declare const string$numbers: Record<string, number>
declare const string$numbersOrStrings: Record<string, number | string>
declare const string$structAB: Record<"a" | "b", number>
declare const string$structCD: Record<"c" | "d", string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

const symA = Symbol.for("a")
const symB = Symbol.for("b")

declare const symbol$numbers: Record<symbol, number>
declare const template$numbers: Record<`a${string}`, number>

describe("Record", () => {
  it("NonLiteralKey", () => {
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<string>>()).type.toBe<string>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<symbol>>()).type.toBe<symbol>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<"">>()).type.toBe<string>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<"a">>()).type.toBe<string>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<"a" | "b">>()).type.toBe<string>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<typeof symA>>()).type.toBe<symbol>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<typeof symA | typeof symB>>()).type.toBe<symbol>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<"a" | typeof symA>>()).type.toBe<string | symbol>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`${string}`>>()).type.toBe<string>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`a${string}`>>()).type.toBe<`a${string}`>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`${string}a`>>()).type.toBe<`${string}a`>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`a${string}b${string}`>>()).type.toBe<`a${string}b${string}`>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`a${number}`>>()).type.toBe<`a${number}`>()
    expect(hole<Record.ReadonlyRecord.NonLiteralKey<`a${number}b${string}c${number}`>>()).type.toBe<
      `a${number}b${string}c${number}`
    >()
  })

  it("empty", () => {
    expect(Record.empty<never>()).type.not.toBeAssignableTo<Record<"a", number>>()

    const empty1: Record<string, number> = Record.empty()
    expect(empty1).type.toBe<Record<string, number>>()
    const empty2: Record<symbol, number> = Record.empty()
    expect(empty2).type.toBe<Record<symbol, number>>()
    expect(Record.empty()).type.toBe<Record<never, never>>()
    expect(Record.empty<"a">()).type.toBe<Record<string, never>>()
    expect(Record.empty<`a${string}bc`>()).type.toBe<Record<`a${string}bc`, never>>()
    expect(Record.empty<string>()).type.toBe<Record<string, never>>()
  })

  it("fromIterableWith and fromIterableBy", () => {
    expect(Record.fromIterableWith([1, 2], (n) => {
      expect(n).type.toBe<number>()
      return [String(n), n]
    })).type.toBe<Record<string, number>>()
    expect(Record.fromIterableWith([symA, symB], (s) => {
      expect(s).type.toBe<symbol>()
      return [String(s), s]
    })).type.toBe<Record<string, symbol>>()
    expect(Record.fromIterableWith([1, symA], (ns) => {
      expect(ns).type.toBe<number | symbol>()
      return [Predicate.isNumber(ns) ? String(ns) : ns, ns]
    })).type.toBe<Record<string | symbol, number | symbol>>()
  })

  it("fromIterableBy", () => {
    expect(Record.fromIterableBy([1, 2], (n) => {
      expect(n).type.toBe<number>()
      return String(n)
    })).type.toBe<Record<string, number>>()
    expect(Record.fromIterableBy([symA, symB], (s) => {
      expect(s).type.toBe<symbol>()
      return String(s)
    })).type.toBe<Record<string, symbol>>()
    expect(Record.fromIterableBy([1, symA], (ns) => {
      expect(ns).type.toBe<number | symbol>()
      return Predicate.isNumber(ns) ? String(ns) : ns
    })).type.toBe<Record<string | symbol, number | symbol>>()
  })

  it("fromEntries", () => {
    expect(Record.fromEntries([["a", 1], ["b", 2]])).type.toBe<Record<string, number>>()
    expect(Record.fromEntries([[symA, 1], [symB, 2]])).type.toBe<Record<symbol, number>>()
    expect(Record.fromEntries([["a", 1], [symB, 2]])).type.toBe<Record<string | symbol, number>>()
  })

  it("collect", () => {
    expect(Record.collect(string$numbers, (k, a) => {
      expect(k).type.toBe<string>()
      expect(a).type.toBe<number>()
      return a
    })).type.toBe<Array<number>>()
    expect(pipe(
      string$numbers,
      Record.collect((k, a) => {
        expect(k).type.toBe<string>()
        expect(a).type.toBe<number>()
        return a
      })
    )).type.toBe<Array<number>>()

    expect(Record.collect(template$numbers, (k, a) => {
      expect(k).type.toBe<`a${string}`>()
      expect(a).type.toBe<number>()
      return a
    })).type.toBe<Array<number>>()
    expect(pipe(
      template$numbers,
      Record.collect((k, a) => {
        expect(k).type.toBe<`a${string}`>()
        expect(a).type.toBe<number>()
        return a
      })
    )).type.toBe<Array<number>>()

    expect(Record.collect(string$structAB, (k, a) => {
      expect(k).type.toBe<"a" | "b">()
      expect(a).type.toBe<number>()
      return a
    })).type.toBe<Array<number>>()
    expect(pipe(
      string$structAB,
      Record.collect((k, a) => {
        expect(k).type.toBe<"a" | "b">()
        expect(a).type.toBe<number>()
        return a
      })
    )).type.toBe<Array<number>>()
  })

  it("toEntries", () => {
    expect(Record.toEntries(string$numbers)).type.toBe<Array<[string, number]>>()
    expect(Record.toEntries(template$numbers)).type.toBe<Array<[`a${string}`, number]>>()
    expect(Record.toEntries(symbol$numbers)).type.toBe<Array<[string, number]>>()
    // Testing with branded records
    const brandedRecord = hole<Record<string & Brand.Brand<"brandedString">, number>>()
    expect(Record.toEntries(brandedRecord)).type.toBe<Array<[string & Brand.Brand<"brandedString">, number]>>()
    expect(Record.toEntries(string$structAB)).type.toBe<Array<["a" | "b", number]>>()
  })

  it("has", () => {
    expect(Record.has(string$numbers, "a")).type.toBe<boolean>()
    expect(pipe(string$numbers, Record.has("a"))).type.toBe<boolean>()
    expect(Record.has).type.not.toBeCallableWith(string$numbers, symA)
    expect(Record.has(template$numbers, "a")).type.toBe<boolean>()
    expect(Record.has).type.not.toBeCallableWith(template$numbers, "b")
    expect(Record.has(symbol$numbers, symA)).type.toBe<boolean>()
    expect(Record.has).type.not.toBeCallableWith(symbol$numbers, "a")
    expect(Record.has).type.not.toBeCallableWith(string$structAB, "c")
    expect(Record.has).type.not.toBeCallableWith(string$structAB, symA)
  })

  it("get", () => {
    expect(Record.get(string$numbers, "a")).type.toBe<Option.Option<number>>()
    expect(pipe(string$numbers, Record.get("a"))).type.toBe<Option.Option<number>>()
    when(pipe).isCalledWith(string$numbers, expect(Record.get).type.not.toBeCallableWith(symA))
    expect(pipe(template$numbers, Record.get("a"))).type.toBe<Option.Option<number>>()
    when(pipe).isCalledWith(template$numbers, expect(Record.get).type.not.toBeCallableWith("b"))
    expect(pipe(symbol$numbers, Record.get(symA))).type.toBe<Option.Option<number>>()
    when(pipe).isCalledWith(symbol$numbers, expect(Record.get).type.not.toBeCallableWith("a"))
    expect(pipe(string$structAB, Record.get("a"))).type.toBe<Option.Option<number>>()
    when(pipe).isCalledWith(string$structAB, expect(Record.get).type.not.toBeCallableWith("c"))
  })

  it("modify, modifyOption, and replaceOption", () => {
    expect(pipe(string$numbers, Record.modify("a", () => 2))).type.toBe<Record<string, number>>()
    expect(pipe(string$numbers, Record.modify("a", () => true))).type.toBe<Record<string, number | boolean>>()
    expect(pipe(template$numbers, Record.modify("a", () => 2))).type.toBe<Record<`a${string}`, number>>()
    expect(pipe(template$numbers, Record.modify("a", () => true))).type.toBe<
      Record<`a${string}`, number | boolean>
    >()
    when(pipe).isCalledWith(template$numbers, expect(Record.modify).type.not.toBeCallableWith("b", () => true))
    expect(pipe(symbol$numbers, Record.modify(symA, () => 2))).type.toBe<Record<symbol, number>>()
    expect(pipe(symbol$numbers, Record.modify(symA, () => true))).type.toBe<Record<symbol, number | boolean>>()
    expect(pipe(string$structAB, Record.modify("a", () => 2))).type.toBe<Record<"a" | "b", number>>()
    expect(pipe(string$structAB, Record.modify("a", () => true))).type.toBe<
      Record<"a" | "b", number | boolean>
    >()
  })

  it("modifyOption", () => {
    expect(pipe(string$numbers, Record.modifyOption("a", () => 2)))
      .type.toBe<Option.Option<Record<string, number>>>()
    expect(pipe(string$numbers, Record.modifyOption("a", () => true)))
      .type.toBe<Option.Option<Record<string, number | boolean>>>()
    expect(pipe(template$numbers, Record.modifyOption("a", () => 2)))
      .type.toBe<Option.Option<Record<`a${string}`, number>>>()
    expect(pipe(template$numbers, Record.modifyOption("a", () => true)))
      .type.toBe<Option.Option<Record<`a${string}`, number | boolean>>>()
    when(pipe).isCalledWith(
      template$numbers,
      expect(Record.modifyOption).type.not.toBeCallableWith("b", () => true)
    )
    expect(pipe(symbol$numbers, Record.modifyOption(symA, () => 2)))
      .type.toBe<Option.Option<Record<symbol, number>>>()
    expect(pipe(symbol$numbers, Record.modifyOption(symA, () => true)))
      .type.toBe<Option.Option<Record<symbol, number | boolean>>>()
    expect(pipe(string$structAB, Record.modifyOption("a", () => 2)))
      .type.toBe<Option.Option<Record<"a" | "b", number>>>()
    expect(pipe(string$structAB, Record.modifyOption("a", () => true)))
      .type.toBe<Option.Option<Record<"a" | "b", number | boolean>>>()
  })

  it("replaceOption", () => {
    expect(pipe(string$numbers, Record.replaceOption("a", 2)))
      .type.toBe<Option.Option<Record<string, number>>>()
    expect(pipe(string$numbers, Record.replaceOption("a", true)))
      .type.toBe<Option.Option<Record<string, number | boolean>>>()
    expect(pipe(template$numbers, Record.replaceOption("a", 2)))
      .type.toBe<Option.Option<Record<`a${string}`, number>>>()
    expect(pipe(template$numbers, Record.replaceOption("a", true)))
      .type.toBe<Option.Option<Record<`a${string}`, number | boolean>>>()
    when(pipe).isCalledWith(template$numbers, expect(Record.replaceOption).type.not.toBeCallableWith("b", true))
    expect(pipe(symbol$numbers, Record.replaceOption(symA, 2)))
      .type.toBe<Option.Option<Record<symbol, number>>>()
    expect(pipe(symbol$numbers, Record.replaceOption(symA, true)))
      .type.toBe<Option.Option<Record<symbol, number | boolean>>>()
    expect(pipe(string$structAB, Record.replaceOption("a", 2)))
      .type.toBe<Option.Option<Record<"a" | "b", number>>>()
    expect(pipe(string$structAB, Record.replaceOption("a", true)))
      .type.toBe<Option.Option<Record<"a" | "b", number | boolean>>>()
  })

  it("remove", () => {
    expect(pipe(string$numbers, Record.remove("a"))).type.toBe<Record<string, number>>()
    expect(pipe(template$numbers, Record.remove("a"))).type.toBe<Record<`a${string}`, number>>()
    when(pipe).isCalledWith(template$numbers, expect(Record.remove).type.not.toBeCallableWith("b"))
    expect(pipe(symbol$numbers, Record.remove(symA))).type.toBe<Record<symbol, number>>()
    expect(pipe(string$structAB, Record.remove("a"))).type.toBe<Record<"b", number>>()
  })

  it("pop", () => {
    expect(pipe(string$numbers, Record.pop("a"))).type.toBe<Option.Option<[number, Record<string, number>]>>()
    expect(pipe(template$numbers, Record.pop("a"))).type.toBe<
      Option.Option<[number, Record<`a${string}`, number>]>
    >()
    when(pipe).isCalledWith(template$numbers, expect(Record.pop).type.not.toBeCallableWith("b"))
    expect(pipe(symbol$numbers, Record.pop(symA))).type.toBe<Option.Option<[number, Record<symbol, number>]>>()
    expect(pipe(string$structAB, Record.pop("a"))).type.toBe<Option.Option<[number, Record<"b", number>]>>()
  })

  it("map", () => {
    expect(Record.map(string$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v > 0
    })).type.toBe<Record<string, boolean>>()
    expect(pipe(
      string$numbers,
      Record.map((v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<string>()
        return v > 0
      })
    )).type.toBe<Record<string, boolean>>()
    expect(Record.map(template$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<`a${string}`>()
      return v > 0
    })).type.toBe<Record<`a${string}`, boolean>>()
    expect(Record.map(symbol$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v + 1
    })).type.toBe<Record<string, number>>()
    expect(Record.map(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return v > 0
    })).type.toBe<Record<"a" | "b", boolean>>()
    expect(pipe(
      string$structAB,
      Record.map((v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<"a" | "b">()
        return v > 0
      })
    )).type.toBe<Record<"a" | "b", boolean>>()
  })

  it("filterMap", () => {
    expect(Record.filterMap(string$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v > 0 ? Option.some("positive") : Option.none()
    }))
      .type.toBe<Record<string, string>>()
    expect(Record.filterMap(template$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<`a${string}`>()
      return v > 0 ? Option.some("positive") : Option.none()
    }))
      .type.toBe<Record<`a${string}`, string>>()
    expect(Record.filterMap(symbol$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v > 0 ? Option.some("positive") : Option.none()
    }))
      .type.toBe<Record<string, string>>()
    expect(pipe(
      string$structAB,
      Record.filterMap((v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<"a" | "b">()
        return k === "a" ? Option.some(v) : Option.none()
      })
    ))
      .type.toBe<Record<string, number>>()
    expect(Record.filterMap(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return k === "a" ? Option.some(v) : Option.none()
    }))
      .type.toBe<Record<string, number>>()
  })

  it("filter", () => {
    expect(Record.filter(string$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v > 0
    })).type.toBe<Record<string, number>>()
    expect(Record.filter(template$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<`a${string}`>()
      return v > 0
    })).type.toBe<Record<`a${string}`, number>>()
    expect(pipe(
      string$structAB,
      Record.filter((v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<"a" | "b">()
        return k === "a"
      })
    ))
      .type.toBe<Record<string, number>>()
    expect(Record.filter(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return k === "a"
    }))
      .type.toBe<Record<string, number>>()
    expect(Record.filter(string$numbersOrStrings, predicateNumbersOrStrings))
      .type.toBe<Record<string, string | number>>()
    expect(Record.filter(string$numbers, predicateNumbersOrStrings))
      .type.toBe<Record<string, number>>()
    expect(pipe(string$numbersOrStrings, Record.filter(predicateNumbersOrStrings)))
      .type.toBe<Record<string, string | number>>()
    expect(pipe(string$numbers, Record.filter(predicateNumbersOrStrings)))
      .type.toBe<Record<string, number>>()
    expect(Record.filter(string$numbersOrStrings, Predicate.isNumber))
      .type.toBe<Record<string, number>>()
    expect(pipe(string$numbersOrStrings, Record.filter(Predicate.isNumber)))
      .type.toBe<Record<string, number>>()
  })

  it("partitionMap", () => {
    expect(
      Record.partitionMap(string$numbers, (v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<string>()
        return v > 0 ? Either.right("positive") : Either.left(false)
      })
    ).type.toBe<[left: Record<string, boolean>, right: Record<string, string>]>()
    expect(
      pipe(
        string$structAB,
        Record.partitionMap((v, k) => {
          expect(v).type.toBe<number>()
          expect(k).type.toBe<"a" | "b">()
          return k === "a" ? Either.right("positive") : Either.left(false)
        })
      )
    ).type.toBe<[left: Record<string, boolean>, right: Record<string, string>]>()
    expect(
      Record.partitionMap(string$structAB, (v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<"a" | "b">()
        return k === "a" ? Either.right("positive") : Either.left(false)
      })
    ).type.toBe<[left: Record<string, boolean>, right: Record<string, string>]>()
  })

  it("partition", () => {
    expect(Record.partition(string$numbers, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<string>()
      return v > 0
    }))
      .type.toBe<[excluded: Record<string, number>, satisfying: Record<string, number>]>()
    expect(pipe(
      string$structAB,
      Record.partition((v, k) => {
        expect(v).type.toBe<number>()
        expect(k).type.toBe<"a" | "b">()
        return k === "a"
      })
    ))
      .type.toBe<[excluded: Record<string, number>, satisfying: Record<string, number>]>()
    expect(Record.partition(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return k === "a"
    }))
      .type.toBe<[excluded: Record<string, number>, satisfying: Record<string, number>]>()
    expect(Record.partition(string$numbersOrStrings, predicateNumbersOrStrings))
      .type.toBe<
      [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
    >()
    expect(pipe(string$numbersOrStrings, Record.partition(predicateNumbersOrStrings)))
      .type.toBe<
      [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
    >()
    expect(Record.partition(string$numbersOrStrings, Predicate.isNumber))
      .type.toBe<[excluded: Record<string, string>, satisfying: Record<string, number>]>()
    expect(pipe(string$numbersOrStrings, Record.partition(Predicate.isNumber)))
      .type.toBe<[excluded: Record<string, string>, satisfying: Record<string, number>]>()
  })

  it("keys", () => {
    expect(Record.keys(string$structAB)).type.toBe<Array<"a" | "b">>()
  })

  it("values", () => {
    expect(Record.values(string$structAB)).type.toBe<Array<number>>()
  })

  it("set", () => {
    expect(Record.set(string$numbers, "a", 2)).type.toBe<Record<string, number>>()
    expect(Record.set(string$numbers, "a", true)).type.toBe<Record<string, number | boolean>>()
    expect(Record.set(template$numbers, "a", 2)).type.toBe<Record<`a${string}`, number>>()
    expect(Record.set(template$numbers, "a", true)).type.toBe<Record<`a${string}`, number | boolean>>()
    expect(Record.set(template$numbers, "b", true)).type.toBe<Record<"b" | `a${string}`, number | boolean>>()
    expect(Record.set(string$structAB, "a", 2)).type.toBe<Record<"a" | "b", number>>()
    expect(Record.set(string$structAB, "a", true)).type.toBe<Record<"a" | "b", number | boolean>>()
    expect(Record.set(string$structAB, "c", true)).type.toBe<Record<"a" | "b" | "c", number | boolean>>()
  })

  it("reduce", () => {
    const result = Record.reduce(string$structAB, "", (acc, v, k) => {
      expect(acc).type.toBe<string>()
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return typeof k === "string" ? k : acc
    })
    expect(result).type.toBe<string>()
  })

  it("some", () => {
    expect(Record.some(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return false
    })).type.toBe<boolean>()
    pipe(
      string$numbersOrStrings,
      Record.some((v, k) => {
        expect(v).type.toBe<string | number>()
        expect(k).type.toBe<string>()
        return true
      })
    )
  })

  it("union", () => {
    expect(Record.union(string$numbers, string$numbers, (_, b) => b))
      .type.toBe<Record<string, number>>()
    expect(Record.union(string$numbers, string$numbersOrStrings, (_, b) => b))
      .type.toBe<Record<string, string | number>>()
    expect(Record.union(string$structAB, string$structCD, (_, b) => b))
      .type.toBe<Record<"a" | "b" | "c" | "d", string | number>>()
  })

  it("singleton", () => {
    expect(Record.singleton("a", 1)).type.toBe<Record<"a", number>>()
  })

  it("every", () => {
    pipe(
      string$numbersOrStrings,
      Record.every((v, k) => {
        expect(v).type.toBe<string | number>()
        expect(k).type.toBe<string>()
        return true
      })
    )
    Record.every(string$structAB, (v, k) => {
      expect(v).type.toBe<number>()
      expect(k).type.toBe<"a" | "b">()
      return false
    })
    if (Record.every(string$numbersOrStrings, Predicate.isString)) {
      expect(string$numbersOrStrings).type.toBe<Record.ReadonlyRecord<string, string>>()
    }
    if (Record.every(string$numbersOrStrings, Predicate.isString)) {
      expect(string$numbersOrStrings).type.toBe<Record.ReadonlyRecord<string, string>>()
    }
  })

  it("intersection", () => {
    expect(Record.intersection(string$numbers, string$numbers, (a, _) => a))
      .type.toBe<Record<string, number>>()
    expect(Record.intersection(string$numbers, string$numbersOrStrings, (_, b) => b))
      .type.toBe<Record<string, string | number>>()
    expect(Record.intersection(string$structAB, string$structCD, (_, b) => b))
      .type.toBe<Record<never, string>>()
    expect(Record.intersection(string$structAB, string$structCD, (a, _) => a))
      .type.toBe<Record<never, number>>()
    expect(Record.intersection(string$numbers, string$numbers, (a, _) => a))
      .type.toBe<Record<string, number>>()
    expect(Record.intersection(string$numbers, string$structCD, (a, _) => a))
      .type.toBe<Record<string, number>>()
    expect(Record.intersection(string$structAB, { c: 2 }, (a, _) => a))
      .type.toBe<Record<never, number>>()
    expect(Record.intersection(string$structAB, { b: 2 }, (a, _) => a))
      .type.toBe<Record<"b", number>>()
  })

  it("findFirst", () => {
    expect(Record.findFirst(string$numbersOrStrings, (a, _) => predicateNumbersOrStrings(a)))
      .type.toBe<Option.Option<[string, string | number]>>()
    expect(pipe(string$numbersOrStrings, Record.findFirst((a, _) => predicateNumbersOrStrings(a))))
      .type.toBe<Option.Option<[string, string | number]>>()
    expect(Record.findFirst(string$numbersOrStrings, Predicate.isString))
      .type.toBe<Option.Option<[string, string]>>()
    expect(pipe(string$numbersOrStrings, Record.findFirst(Predicate.isString)))
      .type.toBe<Option.Option<[string, string]>>()
  })
})
