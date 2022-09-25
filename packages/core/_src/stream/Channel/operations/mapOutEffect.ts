/**
 * @tsplus static effect/core/stream/Channel.Aspects mapOutEffect
 * @tsplus pipeable effect/core/stream/Channel mapOutEffect
 */
export function mapOutEffect<OutElem, Env1, OutErr1, OutElem1>(
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> =>
    self >>
    mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(f)
}

function mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
): Channel<Env | Env1, OutErr, OutElem, OutDone, OutErr | OutErr1, OutElem1, OutDone> {
  return Channel.readWith(
    (outElem) =>
      Channel.fromEffect(f(outElem)).flatMap((out) => Channel.write(out)).flatMap(() =>
        mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(f)
      ),
    (outErr) => Channel.fail(outErr),
    (outDone) => Channel.succeed(outDone)
  )
}
