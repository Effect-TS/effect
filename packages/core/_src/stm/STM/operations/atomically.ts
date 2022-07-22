import { tryCommitAsync, tryCommitSync } from "@effect/core/stm/STM/Journal"
import { State } from "@effect/core/stm/STM/State"
import { TxnId } from "@effect/core/stm/STM/TxnId"

/**
 * @tsplus static effect/core/stm/STM.Ops atomically
 */
export function atomically<R, E, A>(
  self: STM<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.environmentWithEffect((env: Env<R>) =>
    FiberRef.currentScheduler.getWith((scheduler) =>
      Effect.suspendSucceedWith((_, fiberId) => {
        const v = tryCommitSync(fiberId, self, env, scheduler)

        switch (v._tag) {
          case "Done": {
            throw new Effect.Error(v.exit, __tsplusTrace)
          }
          case "Suspend": {
            const txnId = TxnId()
            const state = new AtomicReference<State<E, A>>(State.running)
            const io = Effect.async(
              tryCommitAsync(v.journal, fiberId, self, txnId, state, env, scheduler)
            )
            return Effect.uninterruptibleMask(({ restore }) =>
              restore(io).catchAllCause((cause) => {
                state.compareAndSet(State.running, State.interrupted)
                const currentState = state.get
                return currentState._tag === "Done"
                  ? Effect.done(currentState.exit)
                  : Effect.failCause(cause)
              })
            )
          }
        }
      })
    )
  )
}
