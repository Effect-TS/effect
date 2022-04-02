/* eslint-disable @typescript-eslint/no-namespace */
import * as E from "../../src/Either/index.js"
import { pipe } from "../../src/Function"
import * as DSL from "../../src/Prelude/DSL/index.js"
import * as StateT from "../../src/StateT/index.js"

namespace StateStateEither {
  export const MonadL0 = StateT.stateT<number>()(E.Monad)
  export const MonadL1 = StateT.stateT<string>()(MonadL0)

  export const chain = DSL.chainF(MonadL1)
  export const succeed = DSL.succeedF(MonadL1)
}

test("18", () => {
  const program = pipe(
    StateStateEither.succeed(1),
    StateStateEither.chain((n) => StateStateEither.succeed(n + 1))
  )

  const result: E.Either<never, readonly [number, readonly [string, number]]> = pipe(
    program("a")(1)
  )

  expect(result).toEqual(E.right([1, ["a", 2]]))
})
