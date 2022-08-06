/**
 * @tsplus static effect/core/stream/Channel.Aspects contramapIn
 * @tsplus pipeable effect/core/stream/Channel contramapIn
 */
export function contramapIn<InElem0, InElem>(f: (a: InElem0) => InElem) {
  return <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> =>
    contramapInReader<InErr, InElem0, InElem, InDone>(f) >> self
}

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): Channel<never, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) => Channel.write(f(inElem)) > contramapInReader<InErr, InElem0, InElem, InDone>(f),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.succeed(inDone)
  )
}
