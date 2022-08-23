import { tryCommitAsync, tryCommitSync } from "@effect/core/stm/STM/Journal"
import { State } from "@effect/core/stm/STM/State"
import { TxnId } from "@effect/core/stm/STM/TxnId"

/**
 * @tsplus static effect/core/stm/STM.Ops atomically
 */
export function atomically<R, E, A>(self: STM<R, E, A>): Effect<R, E, A> {
  return Effect.withFiberRuntime((state) => {
    const fiberId = state.id
    const env = state.getFiberRef(FiberRef.currentEnvironment)
    const scheduler = state.getFiberRef(FiberRef.currentScheduler)
    const commitResult = tryCommitSync(fiberId, self, env, scheduler)
    switch (commitResult._tag) {
      case "Done": {
        return Effect.done(commitResult.exit)
      }
      case "Suspend": {
        const txnId = TxnId()
        const state = new AtomicReference<State<E, A>>(State.running)
        const io = Effect.async(
          tryCommitAsync(commitResult.journal, fiberId, self, txnId, state, env, scheduler)
        )
        return Effect.uninterruptibleMask(({ restore }) =>
          restore(io).catchAllCause((cause) => {
            state.compareAndSet(State.running, State.interrupted)
            const currentState = state.get
            return currentState._tag === "Done"
              ? Effect.done(currentState.exit)
              : Effect.failCauseSync(cause)
          })
        )
      }
    }
  })
}
