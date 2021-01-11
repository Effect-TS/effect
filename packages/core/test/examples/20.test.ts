/* eslint-disable @typescript-eslint/no-namespace */
import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Common/Either"
import * as ReaderT from "../../src/Common/ReaderT"
import * as DSL from "../../src/Prelude/DSL"

namespace ReaderEither {
  export const Monad = ReaderT.monad(E.Monad)
  export const Access = ReaderT.access(E.Monad)
  export const Fail = ReaderT.fail({ ...E.Monad, ...E.Fail })
  export const Applicative = ReaderT.applicative(E.Applicative)

  export const chain = DSL.chainF(Monad)
  export const succeed = DSL.succeedF(Monad)

  export const { access } = Access
  export const { fail } = Fail

  export const tupled = DSL.tupleF(Applicative)
}

test("20", () => {
  expect(
    pipe(
      ReaderEither.tupled(
        ReaderEither.access((n: { n: number }) => n.n),
        ReaderEither.access((s: { s: string }) => s.s)
      ),
      (f) =>
        f({
          n: 1,
          s: "s"
        }),
      (e) => e
    )
  ).toEqual(E.right([1, "s"]))
})
