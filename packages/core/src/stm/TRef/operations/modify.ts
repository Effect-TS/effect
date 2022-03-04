import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import type { STM } from "../../STM"
import { STMEffect } from "../../STM"
import type { XTRef } from "../definition"
import { concreteId } from "../definition"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/XTRef modify
 */
export function modify_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, A>,
  f: (a: A) => Tuple<[B, A]>
): STM<unknown, EA | EB, B> {
  concreteId(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) =>
        self.getOrMakeEntry(journal).use((entry) => {
          const oldValue = entry.unsafeGet<A>()
          const {
            tuple: [retValue, newValue]
          } = f(oldValue)
          entry.unsafeSet(newValue)
          return retValue
        })
      )
    }
    case "Derived": {
      return self.value
        .modify((s) =>
          self.getEither(s).fold(
            (e) => Tuple(Either.leftW<EA | EB, B>(e), s),
            (a1) => {
              const {
                tuple: [b, a2]
              } = f(a1)
              return self.setEither(a2).fold(
                (e) => Tuple(Either.left(e), s),
                (s) => Tuple(Either.right(b), s)
              )
            }
          )
        )
        .absolve()
    }
    case "DerivedAll": {
      return self.value
        .modify((s) =>
          self.getEither(s).fold(
            (e) => Tuple(Either.leftW<EA | EB, B>(e), s),
            (a1) => {
              const {
                tuple: [b, a2]
              } = f(a1)
              return self
                .setEither(a2)(s)
                .fold(
                  (e) => Tuple(Either.left(e), s),
                  (s) => Tuple(Either.right(b), s)
                )
            }
          )
        )
        .absolve()
    }
  }
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>) {
  return <EA, EB>(self: XTRef<EA, EB, A, A>): STM<unknown, EA | EB, B> => self.modify(f)
}
