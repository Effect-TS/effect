import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Channel } from "../definition"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Channel provideService
 */
export function provideService_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  T
>(
  self: Channel<Env & Has<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Channel<Erase<Env, Has<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    // @ts-expect-error
    Channel.environment<Env>().flatMap((env: Env) =>
      self.provideEnvironment(mergeEnvironments(tag, env, service()))
    )
}
