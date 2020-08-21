import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Classic/Array"
import { chainF } from "../../src/Prelude/DSL"
import * as R from "../../src/XPure/Reader"
import * as ReaderT from "../../src/XPure/ReaderT"

test("12", () => {
  const M = pipe(A.Monad, ReaderT.monad("X"), ReaderT.monad("I"))

  const result = pipe(
    R.access((h: string) =>
      R.access((k: number) => A.range(0, 10).map((n) => n + k + h.length))
    ),
    chainF(M)((n) => R.succeed(R.succeed([n + 1]))),
    R.runEnv("hello"),
    R.runEnv(10)
  )

  expect(result).toEqual(expect.anything())
})
