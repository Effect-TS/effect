import { assert, describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as N from "effect/Number"

describe("remainder negative-zero dividend", () => {
  it("primary: preserves the result of an ordinary integer remainder when reused", () => {
    const first = N.remainder(-4, 2)
    assert.isTrue(Object.is(first, -0))
    const repeated = N.remainder(first, 2)
    assert.isTrue(Object.is(repeated, -0))
    assert.strictEqual(1 / repeated, -Infinity)
  })

  it("primary: preserves the same integer chain in data-last form", () => {
    const first = pipe(-4, N.remainder(2))
    assert.isTrue(Object.is(first, -0))
    const repeated = pipe(first, N.remainder(2))
    assert.isTrue(Object.is(repeated, -0))
    assert.strictEqual(1 / repeated, -Infinity)
  })

  for (const divisor of [2, -2, 0.5, -0.5]) {
    it(`regression: retains negative zero with ordinary divisor ${divisor}`, () => {
      assert.isFalse(divisor.toString().includes("e"))
      assert.isTrue(Object.is(N.remainder(-0, divisor), -0))
      assert.isTrue(Object.is(pipe(-0, N.remainder(divisor)), -0))
    })
  }

  it("control: the original integer calculation produces negative zero", () => {
    assert.isTrue(Object.is(N.remainder(-4, 2), -0))
    assert.isTrue(Object.is(N.remainder(-4, -2), -0))
  })

  it("control: positive zero stays positive with either divisor sign", () => {
    for (const divisor of [2, -2, 0.5, -0.5, 1e-7, -1e-7]) {
      assert.isTrue(Object.is(N.remainder(0, divisor), 0))
      assert.isTrue(Object.is(pipe(0, N.remainder(divisor)), 0))
    }
  })

  it("control: scientific dispatch already retains incoming negative zero", () => {
    for (const divisor of [1e-7, -1e-7]) {
      assert.isTrue(Object.is(N.remainder(-0, divisor), -0))
      assert.isTrue(Object.is(pipe(-0, N.remainder(divisor)), -0))
    }
  })

  it("control: zero divisors and nonfinite inputs retain NaN outcomes", () => {
    for (const self of [-0, 0, -4, 0.3, 1e-7, NaN, Infinity, -Infinity]) {
      for (const divisor of [0, -0, NaN, Infinity, -Infinity]) {
        assert.isTrue(Number.isNaN(N.remainder(self, divisor)))
        assert.isTrue(Number.isNaN(pipe(self, N.remainder(divisor))))
      }
    }
    for (const self of [NaN, Infinity, -Infinity]) {
      for (const divisor of [2, -2, 0.5, -0.5, 1e-7, -1e-7]) {
        assert.isTrue(Number.isNaN(N.remainder(self, divisor)))
      }
    }
  })

  it("control: ordinary nonzero decimal precision and dividend signs are unchanged", () => {
    assert.strictEqual(N.remainder(0.3, 0.2), 0.1)
    assert.strictEqual(N.remainder(-0.3, 0.2), -0.1)
    assert.strictEqual(N.remainder(0.3, -0.2), 0.1)
    assert.strictEqual(N.remainder(-0.3, -0.2), -0.1)
  })
})
