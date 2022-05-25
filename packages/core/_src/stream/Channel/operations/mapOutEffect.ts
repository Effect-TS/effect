/**
 * @tsplus fluent ets/Channel mapOutEffect
 */
export function mapOutEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return (
    self >>
    mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(f)
  )
}

export const mapOutEffect = Pipeable(mapOutEffect_)

function mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>
): Channel<Env & Env1, OutErr, OutElem, OutDone, OutErr | OutErr1, OutElem1, OutDone> {
  return Channel.readWith(
    (outElem) =>
      Channel.fromEffect(f(outElem)).flatMap((out) => Channel.write(out)) >
        mapOutEffectReader<Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(f),
    (outErr) => Channel.fail(outErr),
    (outDone) => Channel.succeedNow(outDone)
  )
}
