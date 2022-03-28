import { identity } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Managed } from "../../../io/Managed"
import { ChannelExecutor, readUpstream } from "../ChannelExecutor"
import type { ChannelState } from "../ChannelState"
import { concreteChannelState } from "../ChannelState"
import type { Channel } from "../definition"

/**
 * Runs a channel until the end is received.
 *
 * @tsplus fluent ets/Channel runManaged
 */
export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Managed<Env, OutErr, OutDone> {
  return Managed.acquireReleaseExitWith(
    Effect.succeed(new ChannelExecutor(() => self, undefined, identity)),
    (exec, exit) => {
      const finalize = exec.close(exit)
      return finalize != null ? finalize : Effect.unit
    }
  ).mapEffect((exec) =>
    Effect.suspendSucceed(interpret(exec.run() as ChannelState<Env, OutErr>, exec))
  )
}

function interpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    concreteChannelState(channelState)
    switch (channelState._tag) {
      case "Effect": {
        return channelState.effect.zipRight(
          interpret(exec.run() as ChannelState<Env, OutErr>, exec)
        )
      }
      case "Emit": {
        channelState = exec.run() as ChannelState<Env, OutErr>
        break
      }
      case "Done": {
        return Effect.done(exec.getDone())
      }
      case "Read": {
        return readUpstream(
          channelState,
          interpret(exec.run() as ChannelState<Env, OutErr>, exec)
        )
      }
    }
  }
  throw new Error("Bug")
}
