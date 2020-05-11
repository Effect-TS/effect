import type { Alt2C } from "fp-ts/lib/Alt"
import type { ChainRec2C } from "fp-ts/lib/ChainRec"
import type { Monad2C } from "fp-ts/lib/Monad"

import type { Semigroup } from "../Semigroup"

import { URI } from "./URI"
import { eitherMonad } from "./eitherMonad"
import { isLeft } from "./isLeft"
import { isRight } from "./isRight"
import { left } from "./left"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export function getValidation<E>(
  S: Semigroup<E>
): Monad2C<URI, E> & Alt2C<URI, E> & ChainRec2C<URI, E> {
  return {
    ...eitherMonad,
    _E: undefined as any,
    ap: (mab, ma) =>
      isLeft(mab)
        ? isLeft(ma)
          ? left(S.concat(mab.left, ma.left))
          : mab
        : isLeft(ma)
        ? ma
        : right(mab.right(ma.right)),
    alt: (fx, f) => {
      if (isRight(fx)) {
        return fx
      }
      const fy = f()
      return isLeft(fy) ? left(S.concat(fx.left, fy.left)) : fy
    }
  }
}
