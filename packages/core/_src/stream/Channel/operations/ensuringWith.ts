import { Ensuring } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Returns a new channel with an attached finalizer. The finalizer is
 * guaranteed to be executed so long as the channel begins execution (and
 * regardless of whether or not it completes).
 *
 * @tsplus static effect/core/stream/Channel.Aspects ensuringWith
 * @tsplus pipeable effect/core/stream/Channel ensuringWith
 */
export function ensuringWith<Env2, OutErr, OutDone>(
  finalizer: (e: Exit<OutErr, OutDone>) => Effect<Env2, never, unknown>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    new Ensuring<Env | Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
      self,
      finalizer
    )
}
