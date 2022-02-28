import { Stack } from "../../../data/Stack"
import type { IO } from "../definition"

/**
 * Runs this computation.
 *
 * @tsplus fluent ets/IO run
 */
export function run<A>(self: IO<A>): A {
  let stack: Stack<(e: any) => IO<any>> | undefined = undefined
  let a = undefined
  let curIO = self as IO<any> | undefined

  while (curIO != null) {
    switch (curIO._tag) {
      case "FlatMap": {
        switch (curIO.value._tag) {
          case "Succeed": {
            curIO = curIO.cont(curIO.value.a())
            break
          }
          default: {
            stack = new Stack(curIO.cont, stack)
            curIO = curIO.value
          }
        }

        break
      }
      case "Suspend": {
        curIO = curIO.f()
        break
      }
      case "Succeed": {
        a = curIO.a()
        if (stack) {
          curIO = stack.value(a)
          stack = stack.previous
        } else {
          curIO = undefined
        }
        break
      }
    }
  }

  return a
}
