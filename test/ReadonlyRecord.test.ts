import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import * as RR from "effect/ReadonlyRecord"

describe.concurrent("ReadonlyRecord", () => {
  it("get", () => {
    expect(pipe({}, RR.get("a"))).toEqual(Option.none())
    expect(pipe({ a: 1 }, RR.get("a"))).toEqual(Option.some(1))
  })

  it("modifyOption", () => {
    expect(pipe({}, RR.replaceOption("a", 2))).toEqual(Option.none())
    expect(pipe({ a: 1 }, RR.replaceOption("a", 2))).toEqual(Option.some({ a: 2 }))
    expect(pipe({ a: 1 }, RR.replaceOption("a", true))).toEqual(Option.some({ a: true }))
  })

  it("modifyOption", () => {
    expect(pipe({}, RR.modifyOption("a", (n: number) => n + 1))).toEqual(Option.none())
    expect(pipe({ a: 1 }, RR.modifyOption("a", (n: number) => n + 1))).toEqual(Option.some({ a: 2 }))
    expect(pipe({ a: 1 }, RR.modifyOption("a", (n: number) => String(n)))).toEqual(
      Option.some({ a: "1" })
    )
  })

  it("map", () => {
    expect(pipe({ a: 1, b: 2 }, RR.map((n) => n * 2))).toEqual({ a: 2, b: 4 })
    expect(pipe({ a: 1, b: 2 }, RR.map((n, k) => `${k}-${n}`))).toEqual({
      a: "a-1",
      b: "b-2"
    })
  })

  it("fromIterable", () => {
    const input = [1, 2, 3, 4]
    expect(RR.fromIterable(input, (a) => [String(a), a * 2])).toEqual({
      "1": 2,
      "2": 4,
      "3": 6,
      "4": 8
    })
  })

  it("fromEntries", () => {
    const input: Array<[string, number]> = [["a", 1], ["b", 2]]
    expect(RR.fromEntries(input)).toEqual({ a: 1, b: 2 })
  })

  it("collect", () => {
    const x = { a: 1, b: 2, c: 3 }
    assert.deepStrictEqual(RR.collect(x, (key, n) => [key, n]), [["a", 1], ["b", 2], ["c", 3]])
  })

  it("toEntries", () => {
    const x = { a: 1, b: 2, c: 3 }
    assert.deepStrictEqual(RR.toEntries(x), [["a", 1], ["b", 2], ["c", 3]])
  })

  it("remove", () => {
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2 }, "a"), { b: 2 })
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2 }, "c"), { a: 1, b: 2 })
  })

  describe.concurrent("pop", () => {
    it("should return the value associated with the given key, if the key is present in the record", () => {
      const record = { a: 1, b: 2 }
      const result = RR.pop("a")(record)

      assert.deepStrictEqual(result, Option.some([1, { b: 2 }] as [number, Record<string, number>]))
    })

    it("should return none if the key is not present in the record", () => {
      const record = { a: 1, b: 2 }
      const result = RR.pop("c")(record)

      assert.deepStrictEqual(result, Option.none())
    })
  })

  describe.concurrent("filterMap", () => {
    it("should filter the properties of an object", () => {
      const obj = { a: 1, b: 2, c: 3 }
      const filtered = RR.filterMap(obj, (value, key) => (value > 2 ? Option.some(key) : Option.none()))
      expect(filtered).toEqual({ c: "c" })
    })
  })

  it("compact", () => {
    const x = { a: Option.some(1), b: Option.none(), c: Option.some(2) }
    assert.deepStrictEqual(RR.compact(x), { a: 1, c: 2 })
  })

  it("filter", () => {
    const x = { a: 1, b: 2, c: 3, d: 4 }
    assert.deepStrictEqual(RR.filter(x, (value) => value > 2), { c: 3, d: 4 })
  })

  it("partitionMap", () => {
    const f = (n: number) => (n > 2 ? Either.right(n + 1) : Either.left(n - 1))
    assert.deepStrictEqual(RR.partitionMap({}, f), [{}, {}])
    assert.deepStrictEqual(RR.partitionMap({ a: 1, b: 3 }, f), [{ a: 0 }, { b: 4 }])
  })

  it("partition", () => {
    const f = (n: number) => n > 2
    assert.deepStrictEqual(RR.partition({}, f), [{}, {}])
    assert.deepStrictEqual(RR.partition({ a: 1, b: 3 }, f), [{ a: 1 }, { b: 3 }])
  })

  it("separate", () => {
    assert.deepStrictEqual(
      RR.separate({ a: Either.left("e"), b: Either.right(1) }),
      [{ a: "e" }, { b: 1 }]
    )
    // should ignore non own properties
    const o: RR.ReadonlyRecord<Either.Either<string, number>> = Object.create({ a: 1 })
    assert.deepStrictEqual(pipe(o, RR.separate), [{}, {}])
  })

  it("empty", () => {
    expect(RR.empty()).toEqual({})
  })

  it("isEmptyRecord", () => {
    assert.deepStrictEqual(RR.isEmptyRecord({}), true)
    assert.deepStrictEqual(RR.isEmptyRecord({ a: 3 }), false)
  })

  it("isEmptyReadonlyRecord", () => {
    assert.deepStrictEqual(RR.isEmptyReadonlyRecord({}), true)
    assert.deepStrictEqual(RR.isEmptyReadonlyRecord({ a: 3 }), false)
  })

  it("size", () => {
    assert.deepStrictEqual(RR.size({ a: "a", b: 1, c: true }), 3)
  })

  it("has", () => {
    assert.deepStrictEqual(RR.has({ a: 1, b: 2 }, "a"), true)
    assert.deepStrictEqual(RR.has({ a: 1, b: 2 }, "c"), false)
  })

  it("keys", () => {
    assert.deepStrictEqual(RR.keys({ a: 1, b: 2 }), ["a", "b"])
  })

  it("values", () => {
    assert.deepStrictEqual(RR.values({ a: 1, b: 2 }), [1, 2])
  })

  it("upsertAt", () => {
    assert.deepStrictEqual(RR.upsert({ a: 1, b: 2 }, "c", 3), { a: 1, b: 2, c: 3 })
    assert.deepStrictEqual(RR.upsert({ a: 1, b: 2 }, "a", 3), { a: 3, b: 2 })
  })

  it("update", () => {
    expect(RR.update({ a: 1, b: 2 }, "c", 3)).toStrictEqual({ a: 1, b: 2 })
    expect(RR.update({ a: 1, b: 2 }, "a", 3)).toStrictEqual({ a: 3, b: 2 })
  })

  it("isSubrecord", () => {
    expect(RR.isSubrecord({}, {})).toBe(true)
    expect(RR.isSubrecord({}, { a: 1 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 1 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 1, b: 2 })).toBe(true)
    expect(RR.isSubrecord({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true)
    expect(RR.isSubrecord({ a: 1 }, { a: 2 })).toBe(false)
    expect(RR.isSubrecord({ b: 2 }, { a: 1 })).toBe(false)
  })

  it("reduce", () => {
    // data-first
    assert.deepStrictEqual(
      RR.reduce({ k1: "a", k2: "b" }, "-", (accumulator, value, key) => accumulator + key + value),
      "-k1ak2b"
    )
    // data-last
    assert.deepStrictEqual(
      pipe({ k1: "a", k2: "b" }, RR.reduce("-", (accumulator, value, key) => accumulator + key + value)),
      "-k1ak2b"
    )
  })

  it("every", () => {
    assert.deepStrictEqual(RR.every((n: number) => n <= 2)({ a: 1, b: 2 }), true)
    assert.deepStrictEqual(RR.every((n: number) => n <= 1)({ a: 1, b: 2 }), false)
  })

  it("some", () => {
    assert.deepStrictEqual(RR.some((n: number) => n <= 1)({ a: 1, b: 2 }), true)
    assert.deepStrictEqual(RR.some((n: number) => n <= 0)({ a: 1, b: 2 }), false)
  })

  it("union", () => {
    const combine = (s1: string, s2: string) => s1 + s2
    const x: RR.ReadonlyRecord<string> = {
      a: "a1",
      b: "b1",
      c: "c1"
    }
    const y: RR.ReadonlyRecord<string> = {
      b: "b2",
      c: "c2",
      d: "d2"
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
    const x: RR.ReadonlyRecord<string> = {
      a: "a1",
      b: "b1",
      c: "c1"
    }
    const y: RR.ReadonlyRecord<string> = {
      b: "b2",
      c: "c2",
      d: "d2"
    }
    assert.deepStrictEqual(RR.intersection(x, {}, combine), {})
    assert.deepStrictEqual(RR.intersection({}, y, combine), {})
    assert.deepStrictEqual(RR.intersection(x, y, combine), {
      b: "b1b2",
      c: "c1c2"
    })
  })

  it("difference", () => {
    const x: RR.ReadonlyRecord<string> = {
      a: "a1",
      b: "b1",
      c: "c1"
    }
    const y: RR.ReadonlyRecord<string> = {
      b: "b2",
      c: "c2",
      d: "d2"
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
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { a: 2 }), false)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)({ a: 1 }, { b: 1 }), false)
    const noPrototype = Object.create(null)
    assert.deepStrictEqual(RR.getEquivalence(N.Equivalence)(noPrototype, { b: 1 }), false)
  })

  it("singleton", () => {
    assert.deepStrictEqual(RR.singleton("a", 1), { a: 1 })
  })
})
