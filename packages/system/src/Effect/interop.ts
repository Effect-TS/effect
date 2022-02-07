// ets_tracing: off

import * as Async from "../Async/index.js"
import * as IO from "../IO/index.js"
import { accessM, succeed, succeedWith } from "./core.js"
import type { Effect } from "./effect.js"
import { effectAsyncInterrupt } from "./effectAsyncInterrupt.js"
import { fail } from "./fail.js"
import { interrupt } from "./interruption.js"

/**
 * Lift Async into Effect
 */
export function fromAsync<R, E, A>(
  async: Async.Async<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
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
      return succeedWith(() => {
        cancel()
      })
    }, __trace)
  )
}

/**
 * Lift IO into Effect
 */
export function fromIO<A>(io: IO.IO<A>, __trace?: string): Effect<unknown, never, A> {
  return succeedWith(() => IO.run(io), __trace)
}
