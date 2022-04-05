/**
 * @tsplus fluent ets/Channel contramapEffect
 */
export function contramapEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => Effect<Env1, InErr, InDone>
): Channel<Env1 & Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return contramapMReader<Env1, InErr, InElem, InDone0, InDone>(f) >> self;
}

/**
 * @tsplus static ets/Channel/Aspects contramapEffect
 */
export const contramapEffect = Pipeable(contramapEffect_);

function contramapMReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => Effect<Env1, InErr, InDone>
): Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) => Channel.write(inElem) > contramapMReader<Env1, InErr, InElem, InDone0, InDone>(f),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.fromEffect(f(inDone))
  );
}
