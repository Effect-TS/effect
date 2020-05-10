import { Async } from "../Support/Common/effect"

import { asyncTotal } from "./asyncTotal"

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Async<never> = asyncTotal(() => {
  const handle = setInterval(() => {
    //
  }, 60000)
  /* istanbul ignore next */
  return (cb) => {
    clearInterval(handle)
    cb()
  }
})
