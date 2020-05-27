import * as assert from "assert"

import { eqNumber } from "../../src/Eq"
import * as At from "../../src/Monocle/At"
import * as I from "../../src/Monocle/Iso"
import * as O from "../../src/Option"
import * as R from "../../src/Record"
import * as S from "../../src/Set"

describe("At", () => {
  describe("record", () => {
    const map = R.singleton("key", "value")
    const at = At.record<string>().at("key")

    it("get", () => {
      assert.deepStrictEqual(at.get(map), O.some("value"))
    })

    it("add", () => {
      const newMap = at.set(O.some("NEW"))(map)

      assert.deepStrictEqual(newMap, R.singleton("key", "NEW"))
    })

    it("delete", () => {
      const newMap = at.set(O.none)(map)

      assert.deepStrictEqual(R.isEmpty(newMap), true)
    })
  })

  describe("set", () => {
    const set = S.singleton(3)
    const at = At.set(eqNumber).at(3)

    it("get", () => {
      assert.deepStrictEqual(at.get(set), true)
    })

    it("add", () => {
      const newSet = at.set(true)(set)

      assert.deepStrictEqual(newSet, set)
    })

    it("delete", () => {
      const newSet = at.set(false)(set)

      assert.deepStrictEqual(newSet, new Set())
    })
  })

  it("fromIso", () => {
    const iso = I.create<Record<string, string>, Record<string, number>>(
      R.map((v) => +v),
      R.map(String)
    )
    const at = At.fromIso(iso)(At.record<number>()).at("a")
    assert.deepStrictEqual(at.get({}), O.none)
    assert.deepStrictEqual(at.get({ a: "1" }), O.some(1))

    assert.deepStrictEqual(at.set(O.none)({}), {})
    assert.deepStrictEqual(at.set(O.some(1))({}), { a: "1" })
  })
})
