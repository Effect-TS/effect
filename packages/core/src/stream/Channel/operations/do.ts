import { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel bind
 */
export function bind_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  K,
  N extends string
>(
  self: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  K & { [k in N]: OutDone }
> {
  return self.flatMap((k) =>
    f(k).map((a): K & { [k in N]: OutDone } => ({ ...k, [tag]: a } as any))
  )
}

export const bind = Pipeable(bind_)

/**
 * @tsplus fluent ets/Channel bindValue
 */
export function bindValue_<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone,
  K,
  N extends string
>(
  self: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => OutDone
): Channel<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  K & { [k in N]: OutDone }
> {
  return self.map((k): K & { [k in N]: OutDone } => ({ ...k, [tag]: f(k) } as any))
}

export const bindValue = Pipeable(bindValue_)

/**
 * @tsplus static ets/ChannelOps Do
 */
export function Do(): Channel<unknown, unknown, unknown, unknown, never, never, {}> {
  return Channel.fromEffect(Effect.succeedNow({}))
}
