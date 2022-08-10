/**
 * @tsplus static effect/core/stream/Channel.Aspects contramapInEffect
 * @tsplus pipeable effect/core/stream/Channel contramapInEffect
 */
export function contramapInEffect<
  Env1,
  InErr,
  InElem0,
  InElem
>(f: (a: InElem0) => Effect<Env1, InErr, InElem>) {
  return <Env, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env1 | Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> =>
    contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(f) >> self
}

function contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => Effect<Env1, InErr, InElem>
): Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) =>
      Channel.fromEffect(f(inElem)).flatMap((elem) => Channel.write(elem)) >
        contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(f),
    (inErr) => Channel.failSync(inErr),
    (inDone) => Channel.succeed(inDone)
  )
}
