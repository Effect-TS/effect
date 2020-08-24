/* eslint-disable @typescript-eslint/no-namespace */
import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Classic/Either"
import * as StateT from "../../src/Classic/StateT/Parametric"
import * as DSL from "../../src/Prelude/DSL"

namespace StateStateEither {
  // StateT[string, StateT[number, Either[E, A]]]
  export const Monad = pipe(E.Monad, StateT.monad<number>(), StateT.monad<string>())

  export const chain = DSL.chainF(Monad)
  export const succeed = DSL.succeedF(Monad)
}

test("16", () => {
  pipe(
    StateStateEither.succeed(1),
    (f) => f("a")(1),
    (r) => {
      console.log(r)
    }
  )
})
