import { ChannelExecutor, readUpstream } from "@effect/core/stream/Channel/ChannelExecutor"
import type { ChannelState } from "@effect/core/stream/Channel/ChannelState"
import { concreteChannelState } from "@effect/core/stream/Channel/ChannelState"

/**
 * Runs a channel until the end is received.
 *
 * @tsplus getter effect/core/stream/Channel runScoped
 */
export function runScoped<Env, InErr, InDone, OutErr, OutDone>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect<Env | Scope, OutErr, OutDone> {
  return Effect.acquireReleaseExit(
    Effect.sync(new ChannelExecutor(() => self, undefined, identity)),
    (exec, exit) => {
      const finalize = exec.close(exit)
      return finalize != null ? finalize : Effect.unit
    }
  ).flatMap((exec) =>
    Effect.suspendSucceed(interpret(exec.run() as ChannelState<Env, OutErr>, exec))
  )
}

function interpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect<Env, OutErr, OutDone> {
  concreteChannelState(channelState)
  switch (channelState._tag) {
    case "Effect": {
      return channelState.effect.flatMap(() =>
        interpret(exec.run() as ChannelState<Env, OutErr>, exec)
      )
    }
    case "Emit": {
      // Can't really happen because Out <:< Nothing. So just skip ahead.
      return interpret<Env, InErr, InDone, OutErr, OutDone>(
        exec.run() as ChannelState<Env, OutErr>,
        exec
      )
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
