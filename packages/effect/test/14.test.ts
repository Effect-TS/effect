import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../src/Classic/Associative"
import * as E from "../src/Classic/Either"
import * as EitherT from "../src/Classic/EitherT"
import { accessMF, getValidationF, sequenceSF } from "../src/Prelude/DSL"
import * as IO from "../src/XPure/IO"
import * as R from "../src/XPure/Reader"
import * as ReaderT from "../src/XPure/ReaderT"

/**
 * Silly example of Reader[_-, Either[_+, _+]] using transformers
 *
 * (all is already inglobated in XPure so a direct XPure interpretation would be much better)
 */

const Monad = pipe(IO.Monad, EitherT.monad("X"), ReaderT.monad("I"))
const Applicative = pipe(
  IO.Applicative,
  EitherT.applicative("X"),
  ReaderT.applicative("I")
)
const Run = pipe(IO.Covariant, EitherT.run("X"), ReaderT.run("I"))
const Fail = pipe(IO.Monad, EitherT.fail("X"), ReaderT.fail("I"))
const Access = pipe(IO.Monad, EitherT.monad("X"), ReaderT.access("I"))
const Provide = pipe(IO.Monad, EitherT.monad("X"), ReaderT.provide("I"))

export const __ = Fail.fail
export const ___ = Run.run
export const ____ = Access.access
export const _____ = Provide.provide

export const accessM = accessMF({ ...Monad, ...Access })

const getValidation = getValidationF({
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
