/**
 * Maps the output of this channel using the specified function.
 *
 * @tsplus static effect/core/stream/Channel.Aspects mapOut
 * @tsplus pipeable effect/core/stream/Channel mapOut
 * @category mapping
 * @since 1.0.0
 */
export function mapOut<OutElem, OutElem2>(f: (o: OutElem) => OutElem2) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> => {
    const reader: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = Channel
      .readWith(
        (outElem) => Channel.write(f(outElem)).flatMap(() => reader),
        (outErr) => Channel.fail(outErr),
        (outDone) => Channel.succeed(outDone)
      )
    return self >> reader
  }
}
