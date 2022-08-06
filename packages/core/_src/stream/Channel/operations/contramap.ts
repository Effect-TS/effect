/**
 * @tsplus static effect/core/stream/Channel.Aspects contramap
 * @tsplus pipeable effect/core/stream/Channel.Aspects contramap
 */
export function contramap<InDone0, InDone>(f: (a: InDone0) => InDone) {
  return <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> =>
    contramapReader<InErr, InElem, InDone0, InDone>(f) >> self
}

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): Channel<never, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem: InElem) => Channel.write(inElem) > contramapReader<InErr, InElem, InDone0, InDone>(f),
    (inErr: InErr) => Channel.fail(inErr),
    (done: InDone0) => Channel.succeed(f(done))
  )
}
