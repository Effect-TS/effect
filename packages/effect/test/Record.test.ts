import { Either, Number as N, Option, pipe, Record as R } from "effect"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

const stringRecord: Record<string, number> = { a: 1, [symA]: null }
const symbolRecord: Record<symbol, number> = { [symA]: 1, [symB]: 2 }

describe("Record", () => {
  describe("string | symbol APIs", () => {
    it("empty", () => {
      deepStrictEqual(R.empty(), {})
    })

    it("fromIterableWith", () => {
      deepStrictEqual(R.fromIterableWith([1, 2, 3, 4], (a) => [a === 3 ? "a" : String(a), a * 2]), {
        "1": 2,
        "2": 4,
        a: 6,
        "4": 8
      })
      deepStrictEqual(R.fromIterableWith([1, 2, 3, 4], (a) => [a === 3 ? symA : String(a), a * 2]), {
        "1": 2,
        "2": 4,
        [symA]: 6,
        "4": 8
      })
    })

    it("fromIterableBy", () => {
      const users = [
        { id: "2", name: "name2" },
        { id: "1", name: "name1" }
      ]
      deepStrictEqual(R.fromIterableBy(users, (user) => user.id), {
        "2": { id: "2", name: "name2" },
        "1": { id: "1", name: "name1" }
      })

      deepStrictEqual(R.fromIterableBy(["a", symA], (s) => s), { a: "a", [symA]: symA })
    })

    it("fromEntries", () => {
      deepStrictEqual(R.fromEntries([["1", 2], ["2", 4], ["3", 6], ["4", 8]]), {
        "1": 2,
        "2": 4,
        "3": 6,
        "4": 8
      })
      deepStrictEqual(R.fromEntries([["1", 2], ["2", 4], ["3", 6], ["4", 8], [symA, 10], [symB, 12]]), {
        "1": 2,
        "2": 4,
        "3": 6,
        "4": 8,
        [symA]: 10,
        [symB]: 12
      })
    })

    it("has", () => {
      assertTrue(R.has(stringRecord, "a"))
      assertFalse(R.has(stringRecord, "c"))

      assertTrue(R.has(symbolRecord, symA))
      assertFalse(R.has(symbolRecord, symC))
    })

    it("get", () => {
      assertNone(pipe(R.empty<string>(), R.get("a")))
      assertSome(pipe(stringRecord, R.get("a")), 1)

      assertNone(pipe(R.empty<symbol>(), R.get(symA)))
      assertSome(pipe(symbolRecord, R.get(symA)), 1)
    })

    it("modify", () => {
      deepStrictEqual(pipe(R.empty<string>(), R.modify("a", (n: number) => n + 1)), {})
      deepStrictEqual(pipe(stringRecord, R.modify("a", (n: number) => n + 1)), { a: 2, [symA]: null })
      deepStrictEqual(pipe(stringRecord, R.modify("a", (n: number) => String(n))), { a: "1", [symA]: null })

      deepStrictEqual(pipe(R.empty<symbol>(), R.modify(symA, (n: number) => n + 1)), {})
      deepStrictEqual(pipe(symbolRecord, R.modify(symA, (n: number) => n + 1)), {
        [symA]: 2,
        [symB]: 2
      })
      deepStrictEqual(pipe(symbolRecord, R.modify(symA, (n: number) => String(n))), { [symA]: "1", [symB]: 2 })
    })

    it("modifyOption", () => {
      assertNone(pipe(R.empty<string>(), R.modifyOption("a", (n) => n + 1)))
      assertSome(pipe(stringRecord, R.modifyOption("a", (n: number) => n + 1)), { a: 2, [symA]: null })
      assertSome(pipe(stringRecord, R.modifyOption("a", (n: number) => String(n))), { a: "1", [symA]: null })

      assertNone(pipe(R.empty<symbol>(), R.modifyOption(symA, (n) => n + 1)))
      assertSome(pipe(symbolRecord, R.modifyOption(symA, (n: number) => n + 1)), { [symA]: 2, [symB]: 2 })
      assertSome(
        pipe(symbolRecord, R.modifyOption(symA, (n: number) => String(n))),
        { [symA]: "1", [symB]: 2 }
      )
    })

    it("replaceOption", () => {
      assertNone(pipe(R.empty<string>(), R.replaceOption("a", 2)))
      assertSome(pipe(stringRecord, R.replaceOption("a", 2)), { a: 2, [symA]: null })
      assertSome(pipe(stringRecord, R.replaceOption("a", true)), { a: true, [symA]: null })

      assertNone(pipe(R.empty<symbol>(), R.replaceOption(symA, 2)))
      assertSome(pipe(symbolRecord, R.replaceOption(symA, 2)), { [symA]: 2, [symB]: 2 })
      assertSome(pipe(symbolRecord, R.replaceOption(symA, true)), { [symA]: true, [symB]: 2 })
    })

    it("remove", () => {
      deepStrictEqual(R.remove(stringRecord, "a"), { [symA]: null })
      deepStrictEqual(R.remove(stringRecord, "c"), stringRecord)

      deepStrictEqual(R.remove(symbolRecord, symA), { [symB]: 2 })
      deepStrictEqual(R.remove(symbolRecord, symC), symbolRecord)
    })

    describe("pop", () => {
      it("should return the value associated with the given key, if the key is present in the record", () => {
        const result1 = R.pop(stringRecord, "a")
        deepStrictEqual(result1, Option.some([1, { [symA]: null }] as [number, Record<string, number>]))

        const result2 = R.pop(symbolRecord, symA)
        deepStrictEqual(result2, Option.some([1, { [symB]: 2 }] as [number, Record<string, number>]))
      })

      it("should return none if the key is not present in the record", () => {
        const result1 = R.pop(stringRecord, "c")
        deepStrictEqual(result1, Option.none())

        const result2 = R.pop(symbolRecord, symC)
        deepStrictEqual(result2, Option.none())
      })
    })

    describe("set", () => {
      it("should replace an existing value", () => {
        deepStrictEqual(R.set(stringRecord, "a", 2), { a: 2, [symA]: null })

        deepStrictEqual(R.set(symbolRecord, symA, 2), { [symA]: 2, [symB]: 2 })
      })

      it("should add the key / value pair", () => {
        deepStrictEqual(R.set(stringRecord, "c", 3), { a: 1, [symA]: null, c: 3 })

        deepStrictEqual(R.set(symbolRecord, symC, 3), { [symA]: 1, [symB]: 2, [symC]: 3 })
      })
    })

    it("replace", () => {
      deepStrictEqual(R.replace(stringRecord, "c", 3), stringRecord)
      deepStrictEqual(R.replace(stringRecord, "a", 2), { a: 2, [symA]: null })

      deepStrictEqual(R.replace(symbolRecord, symC, 3), symbolRecord)
      deepStrictEqual(R.replace(symbolRecord, symA, 2), { [symA]: 2, [symB]: 2 })
    })

    it("singleton", () => {
      deepStrictEqual(R.singleton("a", 1), { a: 1 })

      deepStrictEqual(R.singleton(symA, 1), { [symA]: 1 })
    })
  })

  describe("string only APIs", () => {
    it("map", () => {
      deepStrictEqual(pipe(stringRecord, R.map((n) => n * 2)), { a: 2, [symA]: null })
      deepStrictEqual(pipe(stringRecord, R.map((n, k) => `${k}-${n}`)), { a: "a-1", [symA]: null })
    })

    it("collect", () => {
      const x = { a: 1, b: 2, c: 3, [symA]: null }
      deepStrictEqual(R.collect(x, (key, n) => [key, n]), [["a", 1], ["b", 2], ["c", 3]])
    })

    it("toEntries", () => {
      const x = { a: 1, b: 2, c: 3, [symA]: null }
      deepStrictEqual(R.toEntries(x), [["a", 1], ["b", 2], ["c", 3]])
    })

    it("filterMap", () => {
      const x: Record<string, number> = { a: 1, b: 2, c: 3, [symA]: null }
      const filtered = R.filterMap(x, (value, key) => (value > 2 ? Option.some(key) : Option.none()))
      deepStrictEqual(filtered, { c: "c" })
    })

    it("getSomes", () => {
      const x = { a: Option.some(1), b: Option.none(), c: Option.some(2), [symA]: null }
      deepStrictEqual(R.getSomes(x), { a: 1, c: 2 })
    })

    it("filter", () => {
      const x: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, [symA]: null }
      deepStrictEqual(R.filter(x, (value) => value > 2), { c: 3, d: 4 })
    })

    it("partitionMap", () => {
      const f = (n: number) => (n > 2 ? Either.right(n + 1) : Either.left(n - 1))
      deepStrictEqual(R.partitionMap({}, f), [{}, {}])
      deepStrictEqual(R.partitionMap({ a: 1, b: 3, [symA]: null }, f), [{ a: 0 }, { b: 4 }])
    })

    it("partition", () => {
      const f = (n: number) => n > 2
      deepStrictEqual(R.partition({}, f), [{}, {}])
      deepStrictEqual(R.partition({ a: 1, b: 3, [symA]: null }, f), [{ a: 1 }, { b: 3 }])
    })

    it("separate", () => {
      deepStrictEqual(
        R.separate({ a: Either.left("e"), b: Either.right(1), [symA]: null }),
        [{ a: "e" }, { b: 1 }]
      )
      // should ignore non own properties
      const o: R.ReadonlyRecord<"a", Either.Either<number, string>> = Object.create({ a: 1 })
      deepStrictEqual(pipe(o, R.separate), [{}, {}])
    })

    it("isEmptyRecord", () => {
      deepStrictEqual(R.isEmptyRecord({}), true)
      deepStrictEqual(R.isEmptyRecord({ [symA]: null }), true)
      deepStrictEqual(R.isEmptyRecord({ a: 3 }), false)
    })

    it("isEmptyReadonlyRecord", () => {
      deepStrictEqual(R.isEmptyReadonlyRecord({}), true)
      deepStrictEqual(R.isEmptyReadonlyRecord({ [symA]: null }), true)
      deepStrictEqual(R.isEmptyReadonlyRecord({ a: 3 }), false)
    })

    it("size", () => {
      deepStrictEqual(R.size({ a: "a", b: 1, c: true, [symA]: null }), 3)
    })

    it("keys", () => {
      deepStrictEqual(R.keys({ a: 1, b: 2, [symA]: null }), ["a", "b"])
    })

    it("values", () => {
      deepStrictEqual(R.values({ a: 1, b: 2, [symA]: null }), [1, 2])
    })

    it("isSubrecord", () => {
      assertTrue(R.isSubrecord(R.empty(), {}))
      assertTrue(R.isSubrecord(R.empty<string>(), { a: 1 }))
      assertTrue(R.isSubrecord({ a: 1 }, { a: 1 }))
      assertTrue(R.isSubrecord(stringRecord, { a: 1 }))
      assertTrue(R.isSubrecord({ a: 1 }, stringRecord))
      assertTrue(R.isSubrecord({ a: 1 } as Record<string, number>, { a: 1, b: 2 }))
      assertTrue(R.isSubrecord({ b: 2, a: 1 }, { a: 1, b: 2 }))
      assertFalse(R.isSubrecord({ a: 1 }, { a: 2 }))
      assertFalse(R.isSubrecord({ b: 2 } as Record<string, number>, { a: 1 }))
    })

    it("reduce", () => {
      // data-first
      deepStrictEqual(
        R.reduce({ k1: "a", k2: "b", [symA]: null }, "-", (accumulator, value, key) => accumulator + key + value),
        "-k1ak2b"
      )
      // data-last
      deepStrictEqual(
        pipe(
          { k1: "a", k2: "b", [symA]: null },
          R.reduce("-", (accumulator, value, key) => accumulator + key + value)
        ),
        "-k1ak2b"
      )
    })

    it("every", () => {
      assertTrue(R.every((n: number) => n <= 2)({ a: 1, b: 2, [symA]: null }))
      assertFalse(R.every((n: number) => n <= 1)({ a: 1, b: 2, [symA]: null }))
    })

    it("some", () => {
      assertTrue(R.some((n: number) => n <= 1)({ a: 1, b: 2, [symA]: null }))
      assertFalse(R.some((n: number) => n <= 0)({ a: 1, b: 2, [symA]: null }))
    })

    it("union", () => {
      const combine = (s1: string, s2: string) => s1 + s2
      const x: R.ReadonlyRecord<string, string> = {
        a: "a1",
        b: "b1",
        c: "c1",
        [symA]: null
      }
      const y: R.ReadonlyRecord<string, string> = {
        b: "b2",
        c: "c2",
        d: "d2",
        [symA]: null
      }
      deepStrictEqual(R.union(x, {}, combine), x)
      deepStrictEqual(R.union({}, x, combine), x)
      deepStrictEqual(R.union(x, {}, combine), x)
      deepStrictEqual(R.union({}, x, combine), x)
      deepStrictEqual(R.union(x, y, combine), {
        a: "a1",
        b: "b1b2",
        c: "c1c2",
        d: "d2"
      })
    })

    it("intersection", () => {
      const combine = (s1: string, s2: string) => s1 + s2
      const x: R.ReadonlyRecord<string, string> = {
        a: "a1",
        b: "b1",
        c: "c1",
        [symA]: null
      }
      const y: R.ReadonlyRecord<string, string> = {
        b: "b2",
        c: "c2",
        d: "d2",
        [symA]: null
      }
      deepStrictEqual(R.intersection(x, {}, combine), {})
      deepStrictEqual(R.intersection({}, y, combine), {})
      deepStrictEqual(R.intersection(x, y, combine), {
        b: "b1b2",
        c: "c1c2"
      })
    })

    it("difference", () => {
      const x: R.ReadonlyRecord<string, string> = {
        a: "a1",
        b: "b1",
        c: "c1",
        [symA]: null
      }
      const y: R.ReadonlyRecord<string, string> = {
        b: "b2",
        c: "c2",
        d: "d2",
        [symA]: null
      }
      deepStrictEqual(R.difference({}, x), x)
      deepStrictEqual(R.difference(x, {}), x)
      deepStrictEqual(R.difference({}, x), x)
      deepStrictEqual(R.difference(x, {}), x)
      deepStrictEqual(R.difference(x, y), {
        a: "a1",
        d: "d2"
      })
    })

    it("getEquivalence", () => {
      deepStrictEqual(R.getEquivalence(N.Equivalence)({ a: 1 }, { a: 1 }), true)
      deepStrictEqual(R.getEquivalence(N.Equivalence)({ a: 1 }, stringRecord), true)
      deepStrictEqual(R.getEquivalence(N.Equivalence)({ a: 1 }, { a: 2 }), false)
      deepStrictEqual(R.getEquivalence(N.Equivalence)({ a: 1 }, { b: 1 }), false)
      const noPrototype = Object.create(null)
      deepStrictEqual(R.getEquivalence(N.Equivalence)(noPrototype, { b: 1 }), false)
    })

    it("mapKeys", () => {
      deepStrictEqual(pipe({ a: 1, b: 2, [symA]: null }, R.mapKeys((key) => key.toUpperCase())), {
        A: 1,
        B: 2
      })
    })

    it("mapEntries", () => {
      deepStrictEqual(pipe(stringRecord, R.mapEntries((a, key) => [key.toUpperCase(), a + 1])), { A: 2 })
    })
  })
})
