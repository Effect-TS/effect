import { asyncTotal } from "./asyncTotal"

/**
 * An IO that produces a void result when res is involed.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 *
 * Example usage:
 *
 * until((cb) => {
 *    process.on("SIGINT", () => {
 *      cb();
 *    });
 *    process.on("SIGTERM", () => {
 *      cb();
 *    });
 * })
 *
 */
export const until = (f: (res: () => void) => void) =>
  asyncTotal<void>((res) => {
    const handle = setInterval(() => {
      // keep process going
    }, 60000)
    f(() => {
      res(undefined)
      clearInterval(handle)
    })
    return (cb) => {
      clearInterval(handle)
      cb()
    }
  })
