import { Exit } from "../Exit"
import { AsyncRE } from "../Support/Common/effect"

import { run } from "./run"

/**
 * Run an IO returning a promise of an Exit.
 *
 * The Promise will not reject.
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromiseExit<E, A>(io: AsyncRE<{}, E, A>): Promise<Exit<E, A>> {
  return new Promise((result) => run(io, result))
}
