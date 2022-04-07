import { Provide } from "@effect/core/stream/Channel/definition/primitives";

/**
 * Provides the channel with its required environment, which eliminates its
 * dependency on `Env`.
 *
 * @tsplus fluent ets/Channel provideEnvironment
 */
export function provideEnvironment_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: LazyArg<Env>
): Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Provide(env, self);
}

/**
 * Provides the channel with its required environment, which eliminates its
 * dependency on `Env`.
 *
 * @tsplus static ets/Channel/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
