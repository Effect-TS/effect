/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel
 * will simply passthrough its input as output. However, when the buffer is
 * non-empty, the value inside the buffer will be passed along as output.
 *
 * @tsplus static effect/core/stream/Channel.Ops buffer
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref<InElem>
): Channel<never, InErr, InElem, InDone, InErr, InElem, InDone> {
  return Channel.suspend(bufferInternal<InElem, InErr, InDone>(empty, isEmpty, ref))
}

function bufferInternal<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref<InElem>
): Channel<never, InErr, InElem, InDone, InErr, InElem, InDone> {
  return Channel.unwrap(
    ref.modify((
      value
    ): Tuple<[Channel<never, InErr, InElem, InDone, InErr, InElem, InDone>, InElem]> =>
      isEmpty(value)
        ? Tuple(
          Channel.readWith(
            (inElem) =>
              Channel.write(inElem).flatMap(() =>
                bufferInternal<InElem, InErr, InDone>(empty, isEmpty, ref)
              ),
            (inErr) => Channel.fail(inErr),
            (inDone) => Channel.succeed(inDone)
          ),
          value
        )
        : Tuple(
          Channel.write(value).flatMap(() =>
            bufferInternal<InElem, InErr, InDone>(empty, isEmpty, ref)
          ),
          empty
        )
    )
  )
}
