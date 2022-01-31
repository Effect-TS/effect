// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import { identity } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as Executor from "../_internal/executor.js"
import type * as C from "../core.js"

function runManagedInterpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: Executor.ChannelState<Env, OutErr>,
  exec: Executor.ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (channelState._typeId) {
      case Executor.ChannelStateEffectTypeId: {
        return T.chain_(channelState.effect, () =>
          runManagedInterpret(exec.run(), exec)
        )
      }
      case Executor.ChannelStateEmitTypeId: {
        channelState = exec.run()
        break
      }
      case Executor.ChannelStateDoneTypeId: {
        return T.done(exec.getDone())
      }
    }
  }
  throw new Error("Bug")
}

/**
 * Runs a channel until the end is received
 */
export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): M.Managed<Env, OutErr, OutDone> {
  return M.mapM_(
    M.makeExit_(
      T.succeedWith(
        () => new Executor.ChannelExecutor(() => self, undefined, identity)
      ),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => runManagedInterpret(exec.run(), exec))
  )
}
