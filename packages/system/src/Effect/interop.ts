import * as Async from "../Async"
import * as IO from "../IO"
import { accessM, effectTotal, succeed } from "./core"
import type { Effect } from "./effect"
import { effectAsyncInterrupt } from "./effectAsyncInterrupt"
import { fail } from "./fail"
import { interrupt } from "./interruption"

/**
 * Lift Async into Effect
 */
export function fromAsync<R, E, A>(async: Async.Async<R, E, A>): Effect<R, E, A> {
  return accessM((r: R) =>
    effectAsyncInterrupt((cb) => {
      const cancel = Async.runAsyncEnv(async, r, (exit) => {
        switch (exit._tag) {
          case "Success": {
            cb(succeed(exit.a))
            break
          }
          case "Interrupt": {
            cb(interrupt)
            break
          }
          case "Failure": {
            cb(fail(exit.e))
            break
          }
        }
      })
      return effectTotal(() => {
        cancel()
      })
    })
  )
}

/**
 * Lift IO into Effect
 */
export function fromIO<A>(io: IO.IO<A>): Effect<unknown, never, A> {
  return effectTotal(() => IO.run(io))
}
