import * as assert from "assert"

import { identity } from "fp-ts/lib/function"

import {
  fold,
  exit,
  isDone,
  isAbort,
  isRaise,
  isInterrupt,
  done,
  abort,
  raise,
  interrupt
} from "../src/Exit"

describe("Exit", () => {
  const e1 = done(1)
  const a2 = abort(2)
  const r3 = raise(3)
  const ipt = interrupt

  describe("refinements", () => {
    it("isDone", () => {
      assert.strictEqual(isDone(e1), true)
      assert.strictEqual(isDone(a2), false)
      assert.strictEqual(isDone(r3), false)
      assert.strictEqual(isDone(ipt), false)
    })
    it("isAbort", () => {
      assert.strictEqual(isAbort(e1), false)
      assert.strictEqual(isAbort(a2), true)
      assert.strictEqual(isAbort(r3), false)
      assert.strictEqual(isAbort(ipt), false)
    })
    it("isRaise", () => {
      assert.strictEqual(isRaise(e1), false)
      assert.strictEqual(isRaise(a2), false)
      assert.strictEqual(isRaise(r3), true)
      assert.strictEqual(isRaise(ipt), false)
    })
    it("isInterrupt", () => {
      assert.strictEqual(isInterrupt(e1), false)
      assert.strictEqual(isInterrupt(a2), false)
      assert.strictEqual(isInterrupt(r3), false)
      assert.strictEqual(isInterrupt(ipt), true)
    })
  })
  describe("fold", () => {
    it("fold curried", () => {
      assert.deepStrictEqual(fold(identity, identity, identity, () => "ipt")(e1), 1)
      assert.deepStrictEqual(fold(identity, identity, identity, () => "ipt")(a2), 2)
      assert.deepStrictEqual(fold(identity, identity, identity, () => "ipt")(r3), 3)
      assert.deepStrictEqual(
        fold(identity, identity, identity, () => "ipt")(ipt),
        "ipt"
      )
    })
    it("fold", () => {
      const e1 = done(1)
      const a2 = abort(2)
      const r3 = raise(3)
      const ipt = interrupt

      assert.deepStrictEqual(
        exit.fold(e1, identity, identity, identity, () => "ipt"),
        1
      )
      assert.deepStrictEqual(
        exit.fold(a2, identity, identity, identity, () => "ipt"),
        2
      )
      assert.deepStrictEqual(
        exit.fold(r3, identity, identity, identity, () => "ipt"),
        3
      )
      assert.deepStrictEqual(
        exit.fold(ipt, identity, identity, identity, () => "ipt"),
        "ipt"
      )
    })
  })
})
