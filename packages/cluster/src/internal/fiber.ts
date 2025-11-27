import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"

/** @internal */
export const joinAllDiscard = <A, E>(fibers: ReadonlyArray<Fiber.RuntimeFiber<A, E>>) =>
  Effect.async<void, E>((resume) => {
    let cause: Cause.Cause<E> | undefined = undefined
    let i = 0
    function loop() {
      while (i < fibers.length) {
        const fiber = fibers[i]
        const exit = fiber.unsafePoll()
        if (exit) {
          i++
          if (exit._tag === "Success") continue
          cause = cause ? Cause.parallel(cause, exit.cause) : exit.cause
          continue
        }
        fiber.addObserver(onExit)
        return
      }
      resume(cause ? Effect.failCause(cause) : Effect.void)
    }
    function onExit(exit: Exit.Exit<A, E>) {
      i++
      if (exit._tag === "Failure") {
        cause = cause ? Cause.parallel(cause, exit.cause) : exit.cause
      }
      loop()
    }
    loop()
    return Effect.sync(() => fibers[i].removeObserver(onExit))
  })
