import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../src/Classic/Associative"
import * as E from "../src/Classic/Either"
import * as EitherT from "../src/Classic/EitherT"
import { accessMF, getValidationF, sequenceSF } from "../src/Prelude/DSL"
import * as IO from "../src/XPure/IO"
import * as R from "../src/XPure/Reader"
import * as ReaderT from "../src/XPure/ReaderT"

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

export const fail = Fail.fail
export const run = Run.run
export const access = Access.access
export const provide = Provide.provide

export const accessM = accessMF({ ...Monad, ...Access })

export const getValidation = getValidationF({
  ...Monad,
  ...Applicative,
  ...Run,
  ...Fail
})

const StringValidation = getValidation(
  makeAssociative<string>((l) => (r) => `${l}, ${r}`)
)

const validate = sequenceSF(StringValidation)

export const result = validate({
  a: R.succeed(IO.succeed(E.left("foo"))),
  b: R.succeed(IO.succeed(E.left("bar"))),
  c: Access.access((r: number) => r + 1)
})

test("14", () => {
  pipe(result, Provide.provide(2), R.run, IO.run, (x) => {
    console.log(x)
  })
})
