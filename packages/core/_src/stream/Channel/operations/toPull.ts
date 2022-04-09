import { ChannelExecutor, readUpstream } from "@effect/core/stream/Channel/ChannelExecutor";
import type { ChannelState } from "@effect/core/stream/Channel/ChannelState";
import { concreteChannelState } from "@effect/core/stream/Channel/ChannelState";

/**
 * Interpret a `Channel` to a managed pull.
 *
 * @tsplus fluent ets/Channel toPull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect<Env & HasScope, never, Effect<Env, OutErr, Either<OutDone, OutElem>>> {
  return Effect.acquireReleaseExit(
    Effect.succeed(new ChannelExecutor(() => self, undefined, identity)),
    (exec, exit) => {
      const finalize = exec.close(exit);
      return finalize == null ? Effect.unit : finalize;
    }
  ).map((exec) => Effect.suspendSucceed(interpret(exec.run() as ChannelState<Env, OutErr>, exec)));
}

function interpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect<Env, OutErr, Either<OutDone, OutElem>> {
  concreteChannelState(channelState);
  switch (channelState._tag) {
    case "Done": {
      return exec.getDone().fold(
        (cause) => Effect.failCause(cause),
        (done): Effect<Env, OutErr, Either<OutDone, OutElem>> => Effect.succeed(Either.left(done))
      );
    }
    case "Emit": {
      return Effect.succeed(Either.right(exec.getEmit()));
    }
    case "Effect": {
      return channelState.effect.zipRight(
        interpret(exec.run() as ChannelState<Env, OutErr>, exec)
      );
    }
    case "Read": {
      return readUpstream(
        channelState,
        interpret(exec.run() as ChannelState<Env, OutErr>, exec)
      );
    }
  }
}
