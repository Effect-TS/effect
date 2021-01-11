/* eslint-disable @typescript-eslint/no-namespace */
import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Common/Either"
import * as StateT from "../../src/Common/StateT/Parametric"
import * as DSL from "../../src/Prelude/DSL"

namespace StateStateEither {
  /**
   * StateT[string, StateT[number, Either[E, A]]]
   *
   * Note: this is safe because Parametric fixes "S" locally
   * opposed to the plain StateT (not safe to be stacked multiple times)
   * that is generic on "S"
   */
  export const MonadL0 = StateT.monad<number>()(E.Monad)
  export const MonadL1 = StateT.monad<string>()(MonadL0)

  export const chain = DSL.chainF(MonadL1)
  export const succeed = DSL.succeedF(MonadL1)
}

test("18", () => {
  pipe(
    StateStateEither.succeed(1),
    StateStateEither.chain((n) => StateStateEither.succeed(n + 1)),
    (f) => f("a")(1),
    (r) => {
      console.log(r)
    }
  )
})
