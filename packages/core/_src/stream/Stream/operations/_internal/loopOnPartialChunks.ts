import { loopOnChunks } from "@effect-ts/core/stream/Stream/operations/_internal/loopOnChunks";

export function loopOnPartialChunks<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (a: Chunk<A>, emit: (a: A1) => UIO<void>) => Effect<R1, E1, boolean>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A1> {
  return loopOnChunks(self, (chunk) =>
    Channel.unwrap(
      Effect.suspendSucceed(() => {
        const outputChunk = Chunk.builder<A1>();
        const emit = (a: A1) =>
          Effect.succeed(() => {
            outputChunk.append(a);
          }).asUnit();
        return f(chunk, emit)
          .map((cont) => Channel.write(outputChunk.build()) > Channel.succeedNow(cont))
          .catchAll((failure) =>
            Effect.succeed(() => {
              const partialResult = outputChunk.build();
              return partialResult.isNonEmpty()
                ? Channel.write(partialResult) > Channel.fail(failure)
                : Channel.fail(failure);
            })
          );
      })
    ));
}
