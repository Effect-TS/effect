/**
 * @tsplus static effect/core/stream/Channel.Ops identity
 * @category constructors
 * @since 1.0.0
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
    (inElem) => Channel.write(inElem).flatMap(() => identity<Err, Elem, Done>()),
    (inErr) => Channel.fail(inErr),
    (inDone) => Channel.succeed(inDone)
  )
}
