import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Collections/Immutable/Array/index.js"
import * as E from "../../src/Either/index.js"
import * as EitherT from "../../src/EitherT/index.js"
import { chainF } from "../../src/Prelude/DSL/index.js"
import * as R from "../../src/XPure/XReader/index.js"
import * as ReaderT from "../../src/XPure/XReaderT/index.js"

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
