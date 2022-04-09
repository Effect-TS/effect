/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel
 * will simply passthrough its input as output. However, when the buffer is
 * non-empty, the value inside the buffer will be passed along as output.
 *
 * @tsplus static ets/Channel/Ops buffer
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref<InElem>
): Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return Channel.suspend(bufferInternal(empty, isEmpty, ref));
}

function bufferInternal<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref<InElem>
): Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return Channel.unwrap(
    ref.modify((value) =>
      isEmpty(value)
        ? Tuple(
          Channel.readWith(
            (inElem) =>
              Channel.write(inElem) >
                bufferInternal<InElem, InErr, InDone>(empty, isEmpty, ref),
            (inErr) => Channel.fail(inErr),
            (inDone) => Channel.succeedNow(inDone)
          ),
          value
        )
        : Tuple(
          Channel.write(value) >
            bufferInternal<InElem, InErr, InDone>(empty, isEmpty, ref),
          empty
        )
    )
  );
}
