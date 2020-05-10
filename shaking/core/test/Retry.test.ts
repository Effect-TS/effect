import * as assert from "assert"

import { function as F } from "fp-ts"
import { limitRetries } from "retry-ts"

import { effect as T, retry as R, exit as E } from "../src"

describe("Retry", () => {
  it("should retry", async () => {
    const program: T.AsyncE<string, number> = R.retrying(
      T.pure(limitRetries(2)),
      ({ iterNumber }) => (iterNumber > 1 ? T.pure(0) : T.raiseError("error")),
      F.flow(E.isRaise, T.pure)
    )

    assert.deepStrictEqual(await T.runToPromise(program), 0)
  })

  it("should retry & fail", async () => {
    const program: T.AsyncE<string, never> = R.retrying(
      T.pure(limitRetries(2)),
      F.constant(T.raiseError("error")),
      F.flow(E.isRaise, T.pure)
    )

    assert.deepStrictEqual(await T.runToPromiseExit(program), E.raise("error"))
  })
})
