import * as assert from "assert"

import * as _ from "../src/StateEither"

import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"

describe("StateEither", () => {
  describe("Monad", () => {
    it("map", async () => {
      const len = (s: string): number => s.length
      const ma = _.right("aaa")
      const e = _.evalState(_.stateEither.map(len)(ma), {})
      assert.deepStrictEqual(e, E.right(3))
    })

    it("ap", async () => {
      const len = (s: string): number => s.length
      const mab = _.right(len)
      const ma = _.right("aaa")
      const e = _.evalState(_.stateEither.ap(ma)(mab), {})
      assert.deepStrictEqual(e, E.right(3))
    })

    it("chain", async () => {
      const f = (s: string) => (s.length > 2 ? _.right(s.length) : _.right(0))
      const ma = _.right("aaa")
      const e = _.evalState(_.stateEither.chain(f)(ma), {})
      assert.deepStrictEqual(e, E.right(3))
    })
  })

  it("evalState", () => {
    const ma = _.right("aaa")
    const s = {}
    const e = _.evalState(ma, s)
    assert.deepStrictEqual(e, E.right("aaa"))
  })

  it("execState Right", () => {
    const ma = _.right("aaa")
    const s = {}
    const e = _.execState(ma, s)
    assert.deepStrictEqual(e, E.right(s))
  })

  it("execState Left", () => {
    const e = _.execState(_.left("aaa"), { a: 0 })
    assert.deepStrictEqual(e, E.left("aaa"))
  })

  it("rightState", () => {
    const state: _.State<{}, number> = (s) => [1, s]
    const e = _.evalState(_.rightState(state), {})
    assert.deepStrictEqual(e, E.right(1))
  })

  it("leftState", () => {
    const state: _.State<{}, number> = (s) => [1, s]
    const e = _.evalState(_.leftState(state), {})
    assert.deepStrictEqual(e, E.left(1))
  })

  it("fromEither", async () => {
    const ei: E.Either<{}, number> = E.right(1)
    const e = _.evalState(_.fromEither(ei), {})
    assert.deepStrictEqual(e, E.right(1))
  })

  it("fromEitherK", async () => {
    const f = (s: Array<string>) => E.right(s.length)
    const x = _.evalState(_.fromEitherK(f)(["a", "b"]), {})
    assert.deepStrictEqual(x, E.right(2))
  })

  it("chainEitherK", async () => {
    const f = (s: string) => E.right(s.length)
    const x = _.evalState(pipe(_.right("aa"), _.chainEitherK(f)), {})
    assert.deepStrictEqual(x, E.right(2))
  })
})
