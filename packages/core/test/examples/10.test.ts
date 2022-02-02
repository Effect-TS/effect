import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Collections/Immutable/Array"
import * as E from "../../src/Either"
import * as EitherT from "../../src/EitherT"
import { chainF } from "../../src/Prelude/DSL"
import * as R from "../../src/XPure/XReader"
import * as ReaderT from "../../src/XPure/XReaderT"

test("10", () => {
  const M = pipe(A.Monad, EitherT.monad, ReaderT.monad)

  pipe(
    R.access((k: number) => A.range(0, 10).map((n) => E.right(n + k))),
    chainF(M)((n) => R.succeed([E.right(n + 1)])),
    R.runEnv(10),
    (x) => {
      console.log(x)
    }
  )
})
