import * as assert from "assert"

import * as Index from "../../src/Monocle/Index"
import * as I from "../../src/Monocle/Iso"
import * as Op from "../../src/Monocle/Optional"
import * as NEA from "../../src/NonEmptyArray"
import * as O from "../../src/Option"
import * as R from "../../src/Record"

describe("Index", () => {
  describe("record", () => {
    const index = Index.record<string>().index("key")

    it("get", () => {
      const map = R.singleton("key", "value")
      assert.deepStrictEqual(index.getOption(map), O.some("value"))
    })

    it("set if there", () => {
      const map = R.singleton("key", "value")
      const newMap = index.set("new")(map)
      assert.deepStrictEqual(newMap, R.singleton("key", "new"))
    })

    it("leave if missing", () => {
      const map = {}
      const newMap = index.set("new")(map)
      assert.deepStrictEqual(newMap, map)
    })
  })

  describe("array", () => {
    const one = Index.array<string>().index(1)

    it("get", () => {
      assert.deepStrictEqual(one.getOption(["a"]), O.none)
      assert.deepStrictEqual(one.getOption(["a", "b"]), O.some("b"))
    })

    it("get", () => {
      assert.deepStrictEqual(one.set("x")(["a"]), ["a"])
      assert.deepStrictEqual(one.set("x")(["a", "b"]), ["a", "x"])
    })

    it("modify", () => {
      assert.deepStrictEqual(Op.modify(one)((v) => `${v}X`)(["a"]), ["a"])
      assert.deepStrictEqual(Op.modify(one)((v) => `${v}X`)(["a", "b"]), ["a", "bX"])
    })

    it("modifyOption", () => {
      assert.deepStrictEqual(Op.modifyOption(one)((v) => `${v}X`)(["a"]), O.none)
      assert.deepStrictEqual(
        Op.modifyOption(one)((v) => `${v}X`)(["a", "b"]),
        O.some(["a", "bX"])
      )
    })
  })

  describe("nonEmptyArray", () => {
    const one = Index.nonEmptyArray<string>().index(1)

    it("get", () => {
      assert.deepStrictEqual(one.getOption(NEA.cons("a")([])), O.none)
      assert.deepStrictEqual(one.getOption(NEA.cons("a")(["b"])), O.some("b"))
    })

    it("get", () => {
      assert.deepStrictEqual(one.set("x")(NEA.cons("a")([])), NEA.cons("a")([]))
      assert.deepStrictEqual(one.set("x")(NEA.cons("a")(["b"])), NEA.cons("a")(["x"]))
    })

    it("modify", () => {
      assert.deepStrictEqual(
        Op.modify(one)((v) => `${v}X`)(NEA.cons("a")([])),
        NEA.cons("a")([])
      )
      assert.deepStrictEqual(
        Op.modify(one)((v) => `${v}X`)(NEA.cons("a")(["b"])),
        NEA.cons("a")(["bX"])
      )
    })

    it("modifyOption", () => {
      assert.deepStrictEqual(
        Op.modifyOption(one)((v) => `${v}X`)(NEA.cons("a")([])),
        O.none
      )
      assert.deepStrictEqual(
        Op.modifyOption(one)((v) => `${v}X`)(NEA.cons("a")(["b"])),
        O.some(NEA.cons("a")(["bX"]))
      )
    })
  })

  it("fromIso", () => {
    const iso = I.create<Array<string>, Array<number>>(
      (s) => s.map((v) => +v),
      (a) => a.map(String)
    )
    const index = Index.fromIso(iso)(Index.array<number>()).index(1)
    assert.deepStrictEqual(index.getOption([]), O.none)
    assert.deepStrictEqual(index.getOption(["1"]), O.none)
    assert.deepStrictEqual(index.getOption(["1", "2"]), O.some(2))

    assert.deepStrictEqual(index.set(3)([]), [])
    assert.deepStrictEqual(index.set(3)(["1"]), ["1"])
    assert.deepStrictEqual(index.set(3)(["1", "2"]), ["1", "3"])
  })
})
