import * as E from "effect/Either"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as RR from "effect/ReadonlyRecord"

describe.concurrent("ReadonlyRecord", () => {
  it("get", () => {
    expect(pipe({}, RR.get("a"))).toEqual(O.none())
    expect(pipe({ a: 1 }, RR.get("a"))).toEqual(O.some(1))
  })

  it("modifyOption", () => {
    expect(pipe({}, RR.replaceOption("a", 2))).toEqual(O.none())
    expect(pipe({ a: 1 }, RR.replaceOption("a", 2))).toEqual(O.some({ a: 2 }))
    expect(pipe({ a: 1 }, RR.replaceOption("a", true))).toEqual(O.some({ a: true }))
  })

  it("modifyOption", () => {
    expect(pipe({}, RR.modifyOption("a", (n: number) => n + 1))).toEqual(O.none())
    expect(pipe({ a: 1 }, RR.modifyOption("a", (n: number) => n + 1))).toEqual(O.some({ a: 2 }))
    expect(pipe({ a: 1 }, RR.modifyOption("a", (n: number) => String(n)))).toEqual(
      O.some({ a: "1" })
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

  it("toArray", () => {
    const x = { a: 1, b: 2 }
    assert.deepStrictEqual(RR.toArray(x), [["a", 1], ["b", 2]])
  })

  it("remove", () => {
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2 }, "a"), { b: 2 })
    assert.deepStrictEqual(RR.remove({ a: 1, b: 2 }, "c"), { a: 1, b: 2 })
  })

  describe.concurrent("pop", () => {
    it("should return the value associated with the given key, if the key is present in the record", () => {
      const record = { a: 1, b: 2 }
      const result = RR.pop("a")(record)

      assert.deepStrictEqual(result, O.some([1, { b: 2 }] as const))
    })

    it("should return none if the key is not present in the record", () => {
      const record = { a: 1, b: 2 }
      const result = RR.pop("c")(record)

      assert.deepStrictEqual(result, O.none())
    })
  })

  describe.concurrent("filterMap", () => {
    it("should filter the properties of an object", () => {
      const obj = { a: 1, b: 2, c: 3 }
      const filtered = RR.filterMap(obj, (value, key) => (value > 2 ? O.some(key) : O.none()))
      expect(filtered).toEqual({ c: "c" })
    })
  })

  it("compact", () => {
    const x = { a: O.some(1), b: O.none(), c: O.some(2) }
    assert.deepStrictEqual(RR.compact(x), { a: 1, c: 2 })
  })

  it("filter", () => {
    const x = { a: 1, b: 2, c: 3, d: 4 }
    assert.deepStrictEqual(RR.filter(x, (value) => value > 2), { c: 3, d: 4 })
  })

  it("partitionMap", () => {
    const f = (n: number) => (n > 2 ? E.right(n + 1) : E.left(n - 1))
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
      RR.separate({ a: E.left("e"), b: E.right(1) }),
      [{ a: "e" }, { b: 1 }]
    )
    // should ignore non own properties
    const o: RR.ReadonlyRecord<E.Either<string, number>> = Object.create({ a: 1 })
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
})
