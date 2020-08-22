// NOTE: namespaces are used to scope things in the demo, in real usage don't use namespaces!

/* eslint-disable @typescript-eslint/no-namespace */

import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Classic/Associative"
import * as EitherT from "../../src/Classic/EitherT"
import * as DSL from "../../src/Prelude/DSL"
import * as S from "../../src/Prelude/Selective"
import * as IO from "../../src/XPure/IO"
import * as Reader from "../../src/XPure/Reader"
import * as ReaderT from "../../src/XPure/ReaderT"

//
// IO[Either[X, A]]
//

namespace IOEither {
  export const Monad = pipe(IO.Monad, EitherT.monad("X"))
  export const Applicative = pipe(IO.Applicative, EitherT.applicative("X"))
  export const Run = pipe(IO.Covariant, EitherT.run("X"))
  export const Fail = pipe(IO.Monad, EitherT.fail("X"))
}

//
// Reader[I, IO[Either[X, A]]]
//

namespace ReaderIOEither {
  export const Monad = pipe(IOEither.Monad, ReaderT.monad("I"))
  export const Applicative = pipe(IOEither.Applicative, ReaderT.applicative("I"))
  export const Run = pipe(IOEither.Run, ReaderT.run("I"))
  export const Fail = pipe(IOEither.Fail, ReaderT.fail("I"))
  export const Access = pipe(IOEither.Monad, ReaderT.access("I"))
  export const Provide = pipe(IOEither.Monad, ReaderT.provide("I"))

  export const { access, any, both, fail, flatten, map, provide, run } = {
    ...Monad,
    ...Applicative,
    ...Run,
    ...Fail,
    ...Access,
    ...Provide
  }

  export const succeed = DSL.succeedF(Monad)
  export const accessM = DSL.accessMF({ ...Monad, ...Access })

  export const Do = DSL.doF(Monad)()
  export const bind = DSL.bindF(Monad)

  export const provideSome = DSL.provideSomeF({
    ...Monad,
    ...Access,
    ...Provide
  })

  export const getValidation = DSL.getValidationF({
    ...Monad,
    ...Applicative,
    ...Run,
    ...Fail
  })

  export const StringValidation = getValidation(
    makeAssociative<string>((l) => (r) => `${l}, ${r}`)
  )

  export const validate = DSL.sequenceSF(StringValidation)
}

//
// Reader[I, IO[A]]
//

namespace ReaderIO {
  export const RIOMonad = pipe(IO.Monad, ReaderT.monad("I"))
  export const RIOApplicative = pipe(IO.Applicative, ReaderT.applicative("I"))
  export const RIOSelective = S.getSelectMonad({ ...RIOMonad, ...RIOApplicative })

  export const succeed = DSL.succeedF(RIOMonad)

  export const branch = S.getBranch(RIOSelective)
}

test("14", () => {
  pipe(
    ReaderIOEither.Do,
    ReaderIOEither.bind("x", () => ReaderIOEither.succeed("0")),
    ReaderIOEither.bind("y", () => ReaderIOEither.succeed("1")),
    ReaderIOEither.bind("v", () =>
      ReaderIOEither.validate({
        a: ReaderIOEither.fail("foo"),
        b: ReaderIOEither.fail("bar"),
        c: ReaderIOEither.access((r: number) => r + 1)
      })
    ),
    ReaderIOEither.map(({ v: { a, b, c }, x, y }) => `${a}${b}${c}${x}${y}`),
    ReaderIO.branch(
      ReaderIO.succeed((s) => `error: ${s}`),
      ReaderIO.succeed((s) => `success: ${s}`)
    ),
    Reader.runEnv(2),
    IO.run,
    (x) => {
      console.log(x)
    }
  )
})
