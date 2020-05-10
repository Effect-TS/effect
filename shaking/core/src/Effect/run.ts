import type { Exit } from "../Exit"
import type { FunctionN } from "../Function"
import type { AsyncRE } from "../Support/Common/effect"
import { DriverImpl } from "../Support/Driver/driver"

/**
 * Run the given IO with the provided environment.
 * @param io
 * @param r
 * @param callback
 */

export function run<E, A>(
  io: AsyncRE<{}, E, A>,
  callback?: FunctionN<[Exit<E, A>], void>
): (cb?: (exit: Exit<E, A>) => void) => void {
  const driver = new DriverImpl<E, A>()
  if (callback) {
    driver.onExit(callback)
  }
  driver.start(io)
  return (cb) => {
    driver.interrupt()
    if (cb) {
      driver.onExit(cb)
    }
  }
}
