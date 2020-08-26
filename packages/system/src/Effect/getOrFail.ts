import { NoSuchElementException } from "../GlobalExceptions"
import * as O from "../Option"
import { succeed, suspend } from "./core"
import type { SyncE } from "./effect"
import { fail } from "./fail"

/**
 * Lifts an Option into an Effect, if the option is not defined it fails with NoSuchElementException.
 */
export function getOrFail<A>(v: () => O.Option<A>): SyncE<NoSuchElementException, A> {
  return suspend(() => O.fold_(v(), () => fail(new NoSuchElementException()), succeed))
}
