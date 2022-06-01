/**
 * @tsplus fluent ets/Channel contramapIn
 */
export function contramapIn_<
  Env,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return contramapInReader<InErr, InElem0, InElem, InDone>(f) >> self
}

/**
 * @tsplus static ets/Channel/Aspects contramapIn
 */
export const contramapIn = Pipeable(contramapIn_)

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): Channel<never, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem) => Channel.write(f(inElem)) > contramapInReader<InErr, InElem0, InElem, InDone>(f),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.succeedNow(inDone)
  )
}
