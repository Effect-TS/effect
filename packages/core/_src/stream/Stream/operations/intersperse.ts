import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Intersperse stream with provided element.
 *
 * @tsplus fluent ets/Stream intersperse
 */
export function intersperse_<R, E, A, A2>(
  self: Stream<R, E, A>,
  middle: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  concreteStream(self);
  return new StreamInternal(self.channel >> writer<R, E, A, A2>(middle(), true));
}

/**
 * Intersperse stream with provided element.
 *
 * @tsplus static ets/Stream/Aspects intersperse
 */
export const intersperse = Pipeable(intersperse_);

function writer<R, E, A, A2>(
  middle: A2,
  isFirst: boolean
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A | A2>, void> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const builder = Chunk.builder<A | A2>();
      let flagResult = isFirst;

      chunk.forEach((value) => {
        if (flagResult) {
          flagResult = false;
          builder.append(value);
        } else {
          builder.append(middle);
          builder.append(value);
        }
      });

      return Channel.write(builder.build()) > writer<R, E, A, A2>(middle, flagResult);
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  );
}
