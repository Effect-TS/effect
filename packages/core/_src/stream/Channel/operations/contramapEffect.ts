/**
 * @tsplus static effect/core/stream/Channel.Aspects contramapEffect
 * @tsplus pipeable effect/core/stream/Channel contramapEffect
 */
export function contramapEffect<
  Env1,
  InErr,
  InDone0,
  InDone
>(f: (i: InDone0) => Effect<Env1, InErr, InDone>) {
  return <Env, InElem, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env1 | Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> =>
    contramapMReader<Env1, InErr, InElem, InDone0, InDone>(f) >> self
}

function contramapMReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => Effect<Env1, InErr, InDone>
): Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) => Channel.write(inElem) > contramapMReader<Env1, InErr, InElem, InDone0, InDone>(f),
    (inErr) => Channel.failSync(inErr),
    (inDone) => Channel.fromEffect(f(inDone))
  )
}
