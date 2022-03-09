import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps identity
 */
export function identity<Err, Elem, Done>(): Channel<
  unknown,
  Err,
  Elem,
  Done,
  Err,
  Elem,
  Done
> {
  return Channel.readWith(
    (inElem) => Channel.write(inElem) > identity<Err, Elem, Done>(),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.succeedNow(inDone)
  )
}
