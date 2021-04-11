import * as T from "../../../Effect"
import * as M from "../../../Managed"
import type { ChannelState } from "./_internal/executor"
import {
  ChannelExecutor,
  ChannelStateDoneTypeId,
  ChannelStateEffectTypeId,
  ChannelStateEmitTypeId
} from "./_internal/executor"
import type * as C from "./core"

function interpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (channelState._typeId) {
      case ChannelStateEffectTypeId: {
        return T.chain_(channelState.effect, () =>
          interpret(exec.run() as ChannelState<Env, OutErr>, exec)
        )
      }
      case ChannelStateEmitTypeId: {
        channelState = exec.run() as ChannelState<Env, OutErr>
        break
      }
      case ChannelStateDoneTypeId: {
        return T.done(exec.getDone())
      }
    }
  }
  throw new Error("Bug")
}

export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): M.Managed<Env, OutErr, OutDone> {
  return M.mapM_(
    M.makeExit_(
      T.effectTotal(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => interpret(exec.run() as ChannelState<Env, OutErr>, exec))
  )
}
