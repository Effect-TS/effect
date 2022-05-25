/**
 * Maps the output of this channel using the specified function.
 *
 * @tsplus fluent ets/Channel mapOut
 */
export function mapOut_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutElem2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const reader: Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = Channel.readWith(
    (outElem) => Channel.write(f(outElem)) > reader,
    (outErr) => Channel.fail(outErr),
    (outDone) => Channel.succeedNow(outDone)
  )

  return self >> reader
}

/**
 * Maps the output of this channel using the specified function.
 *
 * @tsplus static ets/Channel/Aspects mapOut
 */
export const mapOut = Pipeable(mapOut_)
