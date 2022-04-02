/* eslint-disable @typescript-eslint/no-namespace */
import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Either/index.js"
import * as DSL from "../../src/Prelude/DSL/index.js"
import type { Reader } from "../../src/Reader"
import * as ReaderT from "../../src/ReaderT/index.js"

namespace ReaderEither {
  export const Monad = ReaderT.monad(E.Monad)
  export const Access = ReaderT.access(E.Monad)
  export const Fail = ReaderT.fail({ ...E.Monad, ...E.Fail })
  export const Applicative = ReaderT.applicative(E.Applicative)

  export const chain = DSL.chainF(Monad)
  export const succeed = DSL.succeedF(Monad)

  export const { access } = Access
  export const { fail } = Fail

  export const tuple = DSL.tupleF(Applicative)
  export const struct = DSL.structF(Applicative)
}

test("20", () => {
  const program: Reader<
    { n: number } & { s: string },
    E.Either<never, [number, string]>
  > = pipe(
    ReaderEither.tuple(
      ReaderEither.access((n: { n: number }) => n.n),
      ReaderEither.access((s: { s: string }) => s.s)
    )
  )

  expect(pipe({ n: 1, s: "s" }, program)).toEqual(E.right([1, "s"]))
})
