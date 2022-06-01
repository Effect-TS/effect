import { ContinuationK, Read } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Reads an input and continue exposing both full error cause and completion.
 *
 * @tsplus static ets/Channel/Ops readWithCause
 */
export function readWithCause<
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
  halt: (
    e: Cause<InErr>
  ) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): Channel<
  Env | Env1 | Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return new Read<
    Env | Env1 | Env2,
    InErr,
    InElem,
    InDone,
    OutErr | OutErr1 | OutErr2,
    OutElem | OutElem1 | OutElem2,
    OutDone | OutDone1 | OutDone2,
    InErr,
    InDone
  >(
    input,
    new ContinuationK<
      Env | Env1 | Env2,
      InErr,
      InElem,
      InDone,
      InErr,
      OutErr | OutErr1 | OutErr2,
      OutElem | OutElem1 | OutElem2,
      InDone,
      OutDone | OutDone1 | OutDone2
    >(done, halt)
  )
}
