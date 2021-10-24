// ets_tracing: off

import * as CS from "../../../../Cause"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import * as M from "../../../../Managed"
import * as Executor from "../_internal/executor"
import type * as C from "../core"

function toPullInterpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: Executor.ChannelState<Env, OutErr>,
  exec: Executor.ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, E.Either<OutErr, OutDone>, OutElem> {
  switch (channelState._typeId) {
    case Executor.ChannelStateEffectTypeId: {
      return T.chain_(T.mapError_(channelState.effect, E.left), () =>
        toPullInterpret(exec.run(), exec)
      )
    }
    case Executor.ChannelStateEmitTypeId: {
      return T.succeed(exec.getEmit())
    }
    case Executor.ChannelStateDoneTypeId: {
      const done = exec.getDone()
      if (done._tag === "Success") {
        return T.fail(E.right(done.value))
      } else {
        return T.halt(CS.map_(done.cause, E.left))
      }
    }
  }
}

/**
 * Interpret a channel to a managed Pull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): M.Managed<Env, never, T.Effect<Env, E.Either<OutErr, OutDone>, OutElem>> {
  return M.map_(
    M.makeExit_(
      T.succeedWith(() => new Executor.ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => toPullInterpret(exec.run(), exec))
  )
}
