import { unsafeForkUnstarted } from "@effect/core/io/Fiber/_internal/runtime"

/**
 * Forks this effect and the specified effect into their own fibers, and races
 * them, calling one of two specified callbacks depending on which fiber wins
 * the race. This method does not interrupt, join, or otherwise do anything
 * with the fibers. It can be considered a low-level building block for
 * higher-level operators like `race`.
 *
 * @tsplus static effect/core/io/Effect.Aspects raceFibersWith
 * @tsplus pipeable effect/core/io/Effect raceFibersWith
 */
export function raceFibersWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect<R1, E1, A1>,
  selfWins: (winner: Fiber<E, A>, loser: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  thatWins: (winner: Fiber<E1, A1>, loser: Fiber<E, A>) => Effect<R3, E3, A3>
): <R>(self: Effect<R, E, A>) => Effect<
  R | R1 | R2 | R3,
  E2 | E3,
  A2 | A3
> {
  return (self) =>
    Effect.withFiberRuntime((parentState, parentStatus) => {
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const raceIndicator = new AtomicBoolean(true)
      const leftFiber = unsafeForkUnstarted(self, parentState, parentRuntimeFlags)
      const rightFiber = unsafeForkUnstarted(that, parentState, parentRuntimeFlags)
      leftFiber.setFiberRef(FiberRef.forkScopeOverride, Maybe.some(parentState.scope))
      rightFiber.setFiberRef(FiberRef.forkScopeOverride, Maybe.some(parentState.scope))
      return Effect.asyncBlockingOn((cb) => {
        leftFiber.addObserver(() => complete(leftFiber, rightFiber, selfWins, raceIndicator, cb))
        rightFiber.addObserver(() => complete(rightFiber, leftFiber, thatWins, raceIndicator, cb))
        leftFiber.startFork(self)
        rightFiber.startFork(that)
      }, FiberId.combineAll(HashSet.from([leftFiber.id, rightFiber.id])))
    })
}

function complete<R, R1, R2, E2, A2, R3, E3, A3>(
  winner: Fiber<any, any>,
  loser: Fiber<any, any>,
  cont: (winner: Fiber<any, any>, loser: Fiber<any, any>) => Effect<any, any, any>,
  ab: AtomicReference<boolean>,
  cb: (_: Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>) => void
): void {
  if (ab.compareAndSet(true, false)) {
    cb(cont(winner, loser))
  }
}
