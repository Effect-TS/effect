/**
 * Reads an input and continue exposing both error and completion.
 *
 * @tsplus static ets/Channel/Ops readWith
 */
export function readWith<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  input: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: (
    e: InErr
  ) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return Channel.readWithCause(
    input,
    (cause) => cause.failureOrCause().fold(error, (cause) => Channel.failCause(cause)),
    done
  )
}
