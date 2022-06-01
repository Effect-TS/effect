import { isChannelError } from "@effect/core/io/Cause/errors"

/**
 * @tsplus fluent ets/Channel pipeToOrFail
 */
export function pipeToOrFail_<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: LazyArg<Channel<Env2, never, OutElem, OutDone, OutErr2, OutElem2, OutDone2>>
): Channel<Env | Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  const reader: Channel<Env, OutErr, OutElem, OutDone, never, OutElem, OutDone> = Channel.readWith(
    (outElem) => Channel.write(outElem) > reader,
    (outErr) => Channel.failCause(Cause.die(new ChannelError(outErr))),
    (outDone) => Channel.succeedNow(outDone)
  )

  const writer: Channel<
    Env2,
    OutErr2,
    OutElem2,
    OutDone2,
    OutErr2,
    OutElem2,
    OutDone2
  > = Channel.readWithCause(
    (outElem) => Channel.write(outElem) > writer,
    (cause) =>
      cause.isDieType() && isChannelError(cause.value)
        ? Channel.fail(cause.value.error as OutErr2)
        : Channel.failCause(cause),
    (outDone) => Channel.succeedNow(outDone)
  )

  return ((self >> reader) >> that()) >> writer
}

/**
 * @tsplus static ets/Channel/Aspects pipeToOrFail
 */
export const pipeToOrFail = Pipeable(pipeToOrFail_)
