import { AsyncRE } from "../Support/Common/effect"

import { run } from "./run"

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromise<E, A>(io: AsyncRE<{}, E, A>): Promise<A> {
  return new Promise((resolve, reject) =>
    run(io, (exit) => {
      switch (exit._tag) {
        case "Done":
          resolve(exit.value)
          return
        case "Abort":
          reject(exit.abortedWith)
          return
        case "Raise":
          reject(exit.error)
          return
        case "Interrupt":
          reject()
          return
      }
    })
  )
}
