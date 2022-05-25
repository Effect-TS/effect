/**
 * @tsplus fluent ets/Channel contramapInEffect
 */
export function contramapInEffect_<
  Env,
  Env1,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => Effect<Env1, InErr, InElem>
): Channel<Env1 & Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(f) >> self
}

/**
 * @tsplus static ets/Channel/Aspects contramapInEffect
 */
export const contramapInEffect = Pipeable(contramapInEffect_)

function contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => Effect<Env1, InErr, InElem>
): Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) =>
      Channel.fromEffect(f(inElem)).flatMap((elem) => Channel.write(elem)) >
        contramapInEffectReader<Env1, InErr, InElem0, InElem, InDone>(f),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.succeedNow(inDone)
  )
}
