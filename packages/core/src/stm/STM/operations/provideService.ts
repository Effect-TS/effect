import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import type { STM } from "../definition"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/STM provideService
 */
export function provideService_<R, E, A, T>(self: STM<R & Has<T>, E, A>, tag: Tag<T>) {
  return (service: LazyArg<T>): STM<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    self.provideEnvironment(mergeEnvironments(tag, r, service()))
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @ets_data_first provideService
 */
export function provideService<T>(tag: Tag<T>) {
  return (service: LazyArg<T>) =>
    <R, E, A>(self: STM<R & Has<T>, E, A>): STM<Erase<R, Has<T>>, E, A> =>
      // @ts-expect-error
      self.provideService(tag)(service)
}
