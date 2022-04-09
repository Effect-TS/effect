/**
 * @tsplus fluent ets/Channel contramap
 */
export function contramap_<
  Env,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return contramapReader<InErr, InElem, InDone0, InDone>(f) >> self;
}

/**
 * @tsplus static ets/Channel/Aspects contramap
 */
export const contramap = Pipeable(contramap_);

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): Channel<unknown, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return Channel.readWith(
    (inElem: InElem) => Channel.write(inElem) > contramapReader<InErr, InElem, InDone0, InDone>(f),
    (inErr: InErr) => Channel.fail(inErr),
    (done: InDone0) => Channel.succeedNow(f(done))
  );
}
