/* eslint-disable @typescript-eslint/no-namespace */
import { pipe, tuple } from "@effect-ts/system/Function"

import * as DSL from "../../src/PreludeV2/DSL/index.js"
import * as StateT from "../../src/StateT/index.js"
import * as IO from "../../src/XPure/XIO/index.js"

namespace StateIO {
  export const MonadState = StateT.stateT<number>()(IO.Monad)

  export const chain = DSL.chainF(MonadState)
  export const succeed = DSL.succeedF(MonadState)
}

test("15", () => {
  const program: (s: number) => IO.XIO<readonly [number, number]> = pipe(
    (s: number) => IO.succeed(tuple(1, s)),
    StateIO.chain((n) => StateIO.succeed(n + 1))
  )

  expect(pipe(program, StateIO.MonadState.runState(10), IO.run)).toEqual(11)
})
