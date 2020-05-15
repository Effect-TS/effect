/**
 * @since 1.6.0
 */
import { Prism } from "../"

import { Either, right, left, fold } from "@matechs/core/Either"
import { fromEither, none, some } from "@matechs/core/Option"

const r = new Prism<Either<any, any>, any>(fromEither, right)

/**
 * @since 1.6.0
 */
export const _right = <L, A>(): Prism<Either<L, A>, A> => r

const l = new Prism<Either<any, any>, any>(
  fold(some, () => none),
  left
)

/**
 * @since 1.6.0
 */
export const _left = <L, A>(): Prism<Either<L, A>, L> => l
