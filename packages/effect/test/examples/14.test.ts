import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Classic/Associative"
import * as EitherT from "../../src/Classic/EitherT"
import * as DSL from "../../src/Prelude/DSL"
import * as IO from "../../src/XPure/IO"
import * as R from "../../src/XPure/Reader"
import * as ReaderT from "../../src/XPure/ReaderT"

//
// IO[Either[X, A]]
//

const IOEMonad = pipe(IO.Monad, EitherT.monad("X"))
const IOEApplicative = pipe(IO.Applicative, EitherT.applicative("X"))
const IOERun = pipe(IO.Covariant, EitherT.run("X"))
const IOEFail = pipe(IO.Monad, EitherT.fail("X"))

//
// Reader[I, IO[Either[X, A]]]
//

const Monad = pipe(IOEMonad, ReaderT.monad("I"))
const Applicative = pipe(IOEApplicative, ReaderT.applicative("I"))
const Run = pipe(IOERun, ReaderT.run("I"))
const Fail = pipe(IOEFail, ReaderT.fail("I"))
const Access = pipe(IOEMonad, ReaderT.access("I"))
const Provide = pipe(IOEMonad, ReaderT.provide("I"))

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

const StringValidation = getValidation(
  makeAssociative<string>((l) => (r) => `${l}, ${r}`)
)

const validate = DSL.sequenceSF(StringValidation)

test("14", () => {
  pipe(
    Do,
    bind("x", () => succeed("0")),
    bind("y", () => succeed("1")),
    bind("v", () =>
      validate({
        a: fail("foo"),
        b: fail("bar"),
        c: access((r: number) => r + 1)
      })
    ),
    map(({ v: { a, b, c }, x, y }) => `${a}${b}${c}${x}${y}`),
    provide(2),
    R.run,
    IO.run,
    (x) => {
      console.log(x)
    }
  )
})
