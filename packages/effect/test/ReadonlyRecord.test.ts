import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import * as RR from "effect/ReadonlyRecord"
import { assert, describe, expect, it } from "vitest"

const symA = Symbol.for("a")
const symB = Symbol.for("b")

describe("ReadonlyRecord", () => {
  it("get", () => {
    expect(pipe(RR.empty<string>(), RR.get("a"))).toEqual(Option.none())
    expect(pipe({ a: 1 }, RR.get("a"))).toEqual(Option.some(1))
  })

  it("replaceOption", () => {
    expect(pipe(RR.empty<string>(), RR.replaceOption("a", 2))).toEqual(Option.none())
    expect(pipe({ a: 1, [symA]: null }, RR.replaceOption("a", 2))).toEqual(Option.some({ a: 2, [symA]: null }))
    expect(pipe({ a: 1, [symA]: null }, RR.replaceOption("a", true))).toEqual(Option.some({ a: true, [symA]: null }))
  })

  it("modify", () => {
    expect(pipe(RR.empty<string>(), RR.modify("a", (n: number) => n + 1))).toEqual({})
    expect(pipe({ a: 1, [symA]: null }, RR.modify("a", (n: number) => n + 1))).toEqual({ a: 2, [symA]: null })
    expect(pipe({ a: 1, [symA]: null }, RR.modify("a", (n: number) => String(n)))).toEqual(
      { a: "1", [symA]: null }
    )
  })

  it("modifyOption", () => {
    expect(pipe(RR.empty<string>(), RR.modifyOption("a", (n) => n + 1))).toEqual(Option.none())
    expect(pipe({ a: 1, [symA]: null }, RR.modifyOption("a", (n: number) => n + 1))).toEqual(
      Option.some({ a: 2, [symA]: null })
    )
    expect(pipe({ a: 1, [symA]: null }, RR.modifyOption("a", (n: number) => String(n)))).toEqual(
      Option.some({ a: "1", [symA]: null })
    )
  })

  it("replaceOption", () => {
    expect(pipe(RR.empty<string>(), RR.replaceOption("a", 2))).toEqual(Option.none())
    expect(pipe({ a: 1, [symA]: null }, RR.replaceOption("a", 2))).toEqual(Option.some({ a: 2, [symA]: null }))
    expect(pipe({ a: 1, [symA]: null }, RR.replaceOption("a", true))).toEqual(Option.some({ a: true, [symA]: null }))
  })

  it("map", () => {
    expect(pipe({ a: 1, b: 2, [symA]: null } as Record<string, number>, RR.map((n) => n * 2))).toEqual({
      a: 2,
      b: 4,
      [symA]: null
    })
    expect(pipe({ a: 1, b: 2, [symA]: null }, RR.map((n, k) => `${k}-${n}`))).toEqual({
      a: "a-1",
      b: "b-2",
      [symA]: null
    })
    expect(pipe({ [symA]: 1, [symB]: 2 }, RR.map((n) => n * 2))).toEqual({ [symA]: 1, [symB]: 2 })
  })

  it("fromIterableWith", () => {
    const input = [1, 2, 3, 4]
    expect(RR.fromIterableWith(input, (a) => [a === 3 ? "a" : String(a), a * 2])).toEqual({
      "1": 2,
      "2": 4,
      a: 6,
      "4": 8
    })
  })

  it("fromIterableBy", () => {
    const users = [
      { id: "2", name: "name2" },
      { id: "1", name: "name1" }
    ]
    expect(RR.fromIterableBy(users, (user) => user.id)).toEqual({
      "2": { id: "2", name: "name2" },
      "1": { id: "1", name: "name1" }
    })
  })

  it("fromEntries", () => {
    const input = [["1", 2], ["2", 4], ["3", 6], ["4", 8]] as const
    expect(RR.fromEntries(input)).toEqual({
      "1": 2,
      "2": 4,
      "3": 6,
      "4": 8
    })
  })

  it("collect", () => {
    const x = { a: 1, b: 2, c: 3, [symA]: null }
    assert.deepStrictEqual(RR.collect(x, (key, n) => [key, n]), [["a", 1], ["b", 2], ["c", 3]])
  })

  it("toEntries", () => {
    const x = { a: 1, b: 2, c: 3, [symA]: null }
    assert.deepStrictEqual(RR.toEntries(x), [["a", 1], ["b", 2], ["c", 3]])
  })

  it("remove", () => {
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2, [symA]: null }, "a"), { b: 2, [symA]: null })
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2, [symA]: null } as Record<string, number>, "c"), {
      a: 1,
      b: 2,
      [symA]: null
    })
  })

  describe("pop", () => {
    it("should return the value associated with the given key, if the key is present in the record", () => {
      const record = { a: 1, b: 2, [symA]: null }
      const result = RR.pop(record, "a")

      assert.deepStrictEqual(result, Option.some([1, { b: 2, [symA]: null }] as [number, Record<string, number>]))
    })

    it("should return none if the key is not present in the record", () => {
      const record = { a: 1, b: 2, [symA]: null }
      const result = RR.pop("c")(record)

      assert.deepStrictEqual(result, Option.none())
    })
  })

  describe("filterMap", () => {
    it("should filter the properties of an object", () => {
      const x: Record<string, number> = { a: 1, b: 2, c: 3, [symA]: null }
      const filtered = RR.filterMap(x, (value, key) => (value > 2 ? Option.some(key) : Option.none()))
      expect(filtered).toEqual({ c: "c" })
    })
  })

  it("getSomes", () => {
    const x = { a: Option.some(1), b: Option.none(), c: Option.some(2), [symA]: null }
    assert.deepStrictEqual(RR.getSomes(x), { a: 1, c: 2 })
  })

  it("filter", () => {
    const x: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, [symA]: null }
    assert.deepStrictEqual(RR.filter(x, (value) => value > 2), { c: 3, d: 4 })
  })

  it("partitionMap", () => {
    const f = (n: number) => (n > 2 ? Either.right(n + 1) : Either.left(n - 1))
    assert.deepStrictEqual(RR.partitionMap({}, f), [{}, {}])
    assert.deepStrictEqual(RR.partitionMap({ a: 1, b: 3, [symA]: null }, f), [{ a: 0 }, { b: 4 }])
  })

  it("partition", () => {
    const f = (n: number) => n > 2
    assert.deepStrictEqual(RR.partition({}, f), [{}, {}])
    assert.deepStrictEqual(RR.partition({ a: 1, b: 3, [symA]: null }, f), [{ a: 1 }, { b: 3 }])
  })

  it("separate", () => {
    assert.deepStrictEqual(
      RR.separate({ a: Either.left("e"), b: Either.right(1), [symA]: null }),
      [{ a: "e" }, { b: 1 }]
    )
    // should ignore non own properties
    const o: RR.ReadonlyRecord<"a", Either.Either<number, string>> = Object.create({ a: 1 })
    assert.deepStrictEqual(pipe(o, RR.separate), [{}, {}])
  })

  it("empty", () => {
    expect(RR.empty()).toEqual({})
  })

  it("isEmptyRecord", () => {
    assert.deepStrictEqual(RR.isEmptyRecord({}), true)
    assert.deepStrictEqual(RR.isEmptyRecord({ [symA]: null }), true)
    assert.deepStrictEqual(RR.isEmptyRecord({ a: 3 }), false)
  })

  it("isEmptyReadonlyRecord", () => {
    assert.deepStrictEqual(RR.isEmptyReadonlyRecord({}), true)
    assert.deepStrictEqual(RR.isEmptyReadonlyRecord({ [symA]: null }), true)
    assert.deepStrictEqual(RR.isEmptyReadonlyRecord({ a: 3 }), false)
  })

  it("size", () => {
    assert.deepStrictEqual(RR.size({ a: "a", b: 1, c: true, [symA]: null }), 3)
  })

  it("has", () => {
    assert.deepStrictEqual(RR.has({ a: 1, b: 2, [symA]: null }, "a"), true)
    assert.deepStrictEqual(RR.has({ a: 1, b: 2, [symA]: null } as Record<string, number>, "c"), false)
  })

  it("keys", () => {
    assert.deepStrictEqual(RR.keys({ a: 1, b: 2, [symA]: null }), ["a", "b"])
  })

  it("values", () => {
    assert.deepStrictEqual(RR.values({ a: 1, b: 2, [symA]: null }), [1, 2])
  })

  it("set", () => {
    assert.deepStrictEqual(RR.set({ a: 1, b: 2, [symA]: null }, "c", 3), { a: 1, b: 2, c: 3, [symA]: null })
    assert.deepStrictEqual(RR.set({ a: 1, b: 2, [symA]: null }, "a", 3), { a: 3, b: 2, [symA]: null })
  })

  it("replace", () => {
    expect(RR.replace({ a: 1, b: 2, [symA]: null } as Record<string, number>, "c", 3)).toStrictEqual({
      a: 1,
      b: 2,
      [symA]: null
    })
    expect(RR.replace({ a: 1, b: 2, [symA]: null }, "a", 3)).toStrictEqual({ a: 3, b: 2, [symA]: null })
  })

  it("isSubrecord", () => {
    expect(RR.isSubrecord(RR.empty(), {})).toBe(true)
    expect(RR.isSubrecord(RR.empty<string>(), { a: 1 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 1 })).toBe(true)
    expect(RR.isSubrecord({ a: 1, [symA]: null }, { a: 1 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 1, [symA]: null })).toBe(true)
    expect(RR.isSubrecord({ a: 1 } as Record<string, number>, { a: 1, b: 2 })).toBe(true)
    expect(RR.isSubrecord({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 2 })).toBe(false)
    expect(RR.isSubrecord({ b: 2 } as Record<string, number>, { a: 1 })).toBe(false)
  })

  it("reduce", () => {
    // data-first
    assert.deepStrictEqual(
      RR.reduce({ k1: "a", k2: "b", [symA]: null }, "-", (accumulator, value, key) => accumulator + key + value),
      "-k1ak2b"
    )
    // data-last
    assert.deepStrictEqual(
      pipe({ k1: "a", k2: "b", [symA]: null }, RR.reduce("-", (accumulator, value, key) => accumulator + key + value)),
      "-k1ak2b"
    )
  })

  it("every", () => {
    assert.deepStrictEqual(RR.every((n: number) => n <= 2)({ a: 1, b: 2, [symA]: null }), true)
    assert.deepStrictEqual(RR.every((n: number) => n <= 1)({ a: 1, b: 2, [symA]: null }), false)
  })

  it("some", () => {
    assert.deepStrictEqual(RR.some((n: number) => n <= 1)({ a: 1, b: 2, [symA]: null }), true)
    assert.deepStrictEqual(RR.some((n: number) => n <= 0)({ a: 1, b: 2, [symA]: null }), false)
  })

  it("union", () => {
    const combine = (s1: string, s2: string) => s1 + s2
    const x: RR.ReadonlyRecord<string, string> = {
      a: "a1",
      b: "b1",
      c: "c1",
      [symA]: null
    }
    const y: RR.ReadonlyRecord<string, string> = {
      b: "b2",
      c: "c2",
      d: "d2",
      [symA]: null
    }
    assert.deepStrictEqual(RR.union(x, {}, combine), x)
    assert.deepStrictEqual(RR.union({}, x, combine), x)
    assert.deepStrictEqual(RR.union(x, {}, combine), x)
    assert.deepStrictEqual(RR.union({}, x, combine), x)
    assert.deepStrictEqual(RR.union(x, y, combine), {
      a: "a1",
      b: "b1b2",
      c: "c1c2",
      d: "d2"
    })
  })

  it("intersection", () => {
    const combine = (s1: string, s2: string) => s1 + s2
    const x: RR.ReadonlyRecord<string, string> = {
      a: "a1",
      b: "b1",
      c: "c1",
      [symA]: null
    }
    const y: RR.ReadonlyRecord<string, string> = {
      b: "b2",
      c: "c2",
      d: "d2",
      [symA]: null
    }
    assert.deepStrictEqual(RR.intersection(x, {}, combine), {})
    assert.deepStrictEqual(RR.intersection({}, y, combine), {})
    assert.deepStrictEqual(RR.intersection(x, y, combine), {
      b: "b1b2",
      c: "c1c2"
    })
  })

  it("difference", () => {
    const x: RR.ReadonlyRecord<string, string> = {
      a: "a1",
      b: "b1",
      c: "c1",
      [symA]: null
    }
    const y: RR.ReadonlyRecord<string, string> = {
      b: "b2",
      c: "c2",
      d: "d2",
      [symA]: null
    }
    assert.deepStrictEqual(RR.difference({}, x), x)
    assert.deepStrictEqual(RR.difference(x, {}), x)
    assert.deepStrictEqual(RR.difference({}, x), x)
    assert.deepStrictEqual(RR.difference(x, {}), x)
    assert.deepStrictEqual(RR.difference(x, y), {
      a: "a1",
      d: "d2"
    })
  })

  it("getEquivalence", () => {
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { a: 1 }), true)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { a: 1, [symA]: null }), true)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { a: 2 }), false)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { b: 1 }), false)
    const noPrototype = Object.create(null)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)(noPrototype, { b: 1 }), false)
  })

  it("singleton", () => {
    assert.deepStrictEqual(RR.singleton("a", 1), { a: 1 })
  })

  it("mapKeys", () => {
    expect(pipe({ a: 1, b: 2, [symA]: null }, RR.mapKeys((key) => key.toUpperCase()))).toStrictEqual({
      A: 1,
      B: 2
    })
  })

  it("mapEntries", () => {
    expect(
      pipe(
        { a: 1, b: 2, [symA]: null } as Record<string, number>,
        RR.mapEntries((a, key) => [key.toUpperCase(), a + 1])
      )
    ).toStrictEqual({
      A: 2,
      B: 3
    })
  })
})
