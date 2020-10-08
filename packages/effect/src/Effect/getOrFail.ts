import { NoSuchElementException } from "../GlobalExceptions"
import * as O from "../Option"
import { chain_, effectTotal, succeed, suspend } from "./core"
import type { IO } from "./effect"
import { fail } from "./fail"

/**
 * Lifts an Option into an Effect, if the option is not defined it fails with NoSuchElementException.
 */
export function getOrFail<A>(v: () => O.Option<A>): IO<NoSuchElementException, A> {
  return suspend(() => O.fold_(v(), () => fail(new NoSuchElementException()), succeed))
}

/**
 * Lifts an Option into a IO, if the option is not defined it fails with Unit.
 */
export function getOrFailUnit<A>(v: () => O.Option<A>): IO<void, A> {
  return chain_(
    effectTotal(v),
    O.fold(
      () => fail(undefined),
      (a) => succeed(a)
    )
  )
}
