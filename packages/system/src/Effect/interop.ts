import * as Async from "../Async"
import * as IO from "../IO"
import * as Sync from "../Sync"
import { accessM, effectTotal, succeed } from "./core"
import type { Effect } from "./effect"
import { effectAsyncInterrupt } from "./effectAsyncInterrupt"
import { fail } from "./fail"
import { fromEither } from "./fromEither"
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

/**
 * Lift Sync into Effect
 */
export function fromSync<R, E, A>(sync: Sync.Sync<R, E, A>): Effect<R, E, A> {
  return accessM((r: R) => fromEither(() => Sync.runEitherEnv(r)(sync)))
}
