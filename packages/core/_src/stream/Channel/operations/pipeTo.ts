import { PipeTo } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Pipe the output of a channel into the input of another.
 *
 * @tsplus pipeable-operator effect/core/stream/Channel >>
 * @tsplus static effect/core/stream/Channel.Aspects pipeTo
 * @tsplus pipeable effect/core/stream/Channel pipeTo
 */
export function pipeTo<
  Env2,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(that: Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>) {
  return <Env, InErr, InElem, InDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> =>
    new PipeTo<
      Env | Env2,
      InErr,
      InElem,
      InDone,
      OutErr2,
      OutElem2,
      OutDone2,
      OutErr,
      OutElem,
      OutDone
    >(() => self, () => that)
}
