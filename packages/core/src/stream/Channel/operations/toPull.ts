import { ChannelExecutor, readUpstream } from "@effect/core/stream/Channel/ChannelExecutor"
import type { ChannelState } from "@effect/core/stream/Channel/ChannelState"
import { concreteChannelState } from "@effect/core/stream/Channel/ChannelState"
import * as Either from "@fp-ts/data/Either"
import { identity } from "@fp-ts/data/Function"

/**
 * Interpret a `Channel` to a managed pull.
 *
 * @tsplus getter effect/core/stream/Channel toPull
 * @tsplus static effect/core/stream/Channel.Ops toPull
 * @category conversions
 * @since 1.0.0
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect<Env | Scope, never, Effect<Env, OutErr, Either.Either<OutDone, OutElem>>> {
  return Effect.acquireReleaseExit(
    Effect.sync(new ChannelExecutor(() => self, undefined, identity)),
    (exec, exit) => {
      const finalize = exec.close(exit)
      return finalize == null ? Effect.unit : finalize
    }
  ).map((exec) => Effect.suspendSucceed(interpret(exec.run() as ChannelState<Env, OutErr>, exec)))
}

function interpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, Either.Either<OutDone, OutElem>> {
  concreteChannelState(channelState)
  switch (channelState._tag) {
    case "Done": {
      return exec.getDone().fold(
        (cause) => Effect.failCause(cause),
        (done): Effect<Env, OutErr, Either.Either<OutDone, OutElem>> =>
          Effect.sync(Either.left(done))
      )
    }
    case "Emit": {
      return Effect.sync(Either.right(exec.getEmit()))
    }
    case "Effect": {
      return channelState.effect.flatMap(() =>
        interpret(exec.run() as ChannelState<Env, OutErr>, exec)
      )
    }
    case "Read": {
      return readUpstream(
        channelState,
        interpret(exec.run() as ChannelState<Env, OutErr>, exec)
      )
    }
  }
}
