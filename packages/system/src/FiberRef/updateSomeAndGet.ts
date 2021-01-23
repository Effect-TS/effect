import type { Option } from "../Option"
import { getOrElse_ } from "../Option"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified partial function.
 * If the function is undefined on the current value it returns the old value
 * without changing it.
 */
export const updateSomeAndGet = <A>(f: (a: A) => Option<A>) =>
  modify<A, A>((v) => {
    const result = getOrElse_(f(v), () => v)
    return [result, result]
  })
