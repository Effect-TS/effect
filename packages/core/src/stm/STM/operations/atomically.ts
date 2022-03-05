import { Effect, EffectError } from "../../../io/Effect/definition"
import { AtomicReference } from "../../../support/AtomicReference"
import type { STM } from "../definition"
import { tryCommitAsync, tryCommitSync } from "../Journal"
import { State } from "../State"
import { DoneTypeId, SuspendTypeId } from "../TryCommit"
import { TxnId } from "../TxnId"

/**
 * @tsplus static ets/STMOps atomically
 */
export function atomically<R, E, A>(
  self: STM<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.environmentWithEffect((r: R) =>
    Effect.suspendSucceedWith((_, fiberId) => {
      const v = tryCommitSync(fiberId, self, r)
      switch (v._typeId) {
        case DoneTypeId: {
          throw new EffectError(v.exit, __tsplusTrace)
        }
        case SuspendTypeId: {
          const txnId = TxnId()
          const state = new AtomicReference<State<E, A>>(State.Running)
          const io = Effect.async(
            tryCommitAsync(v.journal, fiberId, self, txnId, state, r)
          )
          return Effect.uninterruptibleMask(({ restore }) =>
            restore(io).catchAllCause((cause) => {
              state.compareAndSet(State.Running, State.Interrupted)
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
}
