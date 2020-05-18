import { Semigroup } from "fp-ts/lib/Semigroup"

import { Cause, raise } from "../Exit"
export function getCauseSemigroup<E>(S: Semigroup<E>): Semigroup<Cause<E>> {
  return {
    concat: (ca, cb): Cause<E> => {
      if (ca._tag === "Interrupt" || cb._tag === "Interrupt") {
        return ca
      }
      if (ca._tag === "Abort") {
        return ca
      }
      if (cb._tag === "Abort") {
        return cb
      }
      return raise(S.concat(ca.error, cb.error))
    }
  }
}
