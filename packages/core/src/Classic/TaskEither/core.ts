import {
  chainF,
  doF,
  genF,
  getValidationF,
  matchers,
  structF,
  succeedF
} from "../../Prelude/DSL"
import type { Either } from "../Either"
import * as ET from "../EitherT"
import * as T from "../Task"

export type TaskEither<E, A> = T.Task<Either<E, A>>

export const Monad = ET.monad(T.Monad)

export const Applicative = ET.applicative(T.Applicative)

export const ApplicativePar = ET.applicative(T.ApplicativePar)

export const Fail = ET.fail(T.Applicative)

export const Run = ET.run(T.Applicative)

export const { any, flatten, map } = Monad

export const { both: zip } = Applicative

export const { both: zipPar } = ApplicativePar

export const { fail } = Fail

export const { either } = Run

export const getValidation = getValidationF({
  ...Monad,
  ...Applicative,
  ...Fail,
  ...Run
})

export const chain = chainF(Monad)

const do_ = doF(Monad)

export { do_ as do }

export const struct = structF(Applicative)

export const structPar = structF(ApplicativePar)

export const succeed = succeedF(Monad)

export const gen_ = genF(Monad)

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = matchers(Monad)
