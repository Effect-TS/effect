/* eslint-disable @typescript-eslint/no-namespace */
import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Either/index.js"
import * as DSL from "../../src/PreludeV2/DSL/index.js"
import type * as R from "../../src/Reader"
import * as ReaderT from "../../src/ReaderT/index.js"

namespace ReaderEither {
  export const Monad = ReaderT.Monad(E.Monad)
  export const Access = ReaderT.Access(E.Monad)
  export const Fail = ReaderT.Fail({ ...E.Monad, ...E.Fail })

  export const chain = DSL.chainF(Monad)
  export const succeed = DSL.succeedF(Monad)

  export const { access } = Access
  export const { fail } = Fail
}

test("16", () => {
  const program: R.Reader<number, E.Either<string, number>> = pipe(
    ReaderEither.access((n: number) => n + 1),
    ReaderEither.chain((n) =>
      n > 2 ? ReaderEither.fail("bad") : ReaderEither.succeed(n)
    )
  )

  expect(pipe(program(1))).toEqual(E.right(2))
})
