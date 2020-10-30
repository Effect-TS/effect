import * as O from "../Option"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified partial function and
 * returns the old value.
 * If the function is undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = <A>(f: (a: A) => O.Option<A>) =>
  modify<A, A>((v) => [v, O.getOrElse_(f(v), () => v)])
