import type { Cause } from "../../../io/Cause"
import { Channel } from "../definition"

/**
 * A more powerful version of `mapError` which also surfaces the `Cause`
 * of the channel failure.
 *
 * @tsplus fluent ets/Channel mapErrorCause
 */
export function mapErrorCause_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (cause: Cause<OutErr>) => Cause<OutErr2>
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return self.catchAllCause((cause) => Channel.failCause(f(cause)))
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause`
 * of the channel failure.
 */
export const mapErrorCause = Pipeable(mapErrorCause_)
