import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function and returns
 * the result.
 */
export const updateAndGet = <A>(f: (a: A) => A) =>
  modify<A, A>((v) => {
    const result = f(v)
    return [result, result]
  })
