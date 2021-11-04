// ets_tracing: off

import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import * as M from "../../../../Managed"
import * as Executor from "../_internal/executor"
import type * as C from "../core"

function toPullInterpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: Executor.ChannelState<Env, OutErr>,
  exec: Executor.ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, E.Either<OutDone, OutElem>> {
  switch (channelState._typeId) {
    case Executor.ChannelStateEffectTypeId: {
      return T.chain_(channelState.effect, () => toPullInterpret(exec.run(), exec))
    }
    case Executor.ChannelStateEmitTypeId: {
      return T.succeed(E.right(exec.getEmit()))
    }
    case Executor.ChannelStateDoneTypeId: {
      const done = exec.getDone()
      if (done._tag === "Success") {
        return T.succeed(E.left(done.value))
      } else {
        return T.halt(done.cause)
      }
    }
  }
}

/**
 * Interpret a channel to a managed Pull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): M.Managed<Env, never, T.Effect<Env, OutErr, E.Either<OutDone, OutElem>>> {
  return M.map_(
    M.makeExit_(
      T.succeedWith(() => new Executor.ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => toPullInterpret(exec.run(), exec))
  )
}
