/**
 * @tsplus static effect/core/stream/Channel.Ops identity
 */
export function identity<Err, Elem, Done>(): Channel<
  never,
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
