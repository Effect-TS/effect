import { ChannelExecutor, readUpstream } from "@effect/core/stream/Channel/ChannelExecutor"
import type { ChannelState } from "@effect/core/stream/Channel/ChannelState"
import { concreteChannelState } from "@effect/core/stream/Channel/ChannelState"

/**
 * Runs a channel until the end is received.
 *
 * @tsplus getter ets/Channel runScoped
 */
export function runScoped<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect<Env | Scope, OutErr, OutDone> {
  return Effect.acquireReleaseExit(
    Effect.succeed(new ChannelExecutor(() => self, undefined, identity)),
    (exec, exit) => {
      const finalize = exec.close(exit)
      return finalize != null ? finalize : Effect.unit
    }
  ).flatMap((exec) => Effect.suspendSucceed(interpret(exec.run() as ChannelState<Env, OutErr>, exec)))
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
