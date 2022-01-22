import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Collections/Immutable/Array/index.js"
import * as E from "../../src/Either/index.js"
import * as EitherT from "../../src/EitherT/index.js"
import { chainF } from "../../src/PreludeV2/DSL/index.js"
import * as R from "../../src/XPure/XReader/index.js"
import * as ReaderT from "../../src/XPure/XReaderT/index.js"

test("10", () => {
  const M = pipe(A.Monad, EitherT.monad, ReaderT.monad)

  const program: R.XReader<number, A.Array<E.Either<never, number>>> = pipe(
    R.access((k: number) => A.range(0, 5).map((n) => E.right(n + k))),
    chainF(M)((n) => R.succeed([E.right(n + 1)]))
  )

  expect(pipe(program, R.runEnv(10))).toEqual([
    E.right(11),
    E.right(12),
    E.right(13),
    E.right(14),
    E.right(15),
    E.right(16)
  ])
})
