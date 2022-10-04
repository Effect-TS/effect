import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
 * newlines (`\n`).
 *
 * @tsplus static effect/core/stream/Stream.Ops splitLines
 */
export function splitLines<R, E>(
  self: Stream<R, E, string>
): Stream<R, E, string> {
  concreteStream(self)
  return new StreamInternal(self.channel >> next<E>(Maybe.none, false))
}

function next<E>(
  leftover: Maybe<string>,
  wasSplitCRLF: boolean
): Channel<never, E, Chunk<string>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWithCause(
    (incomingChunk: Chunk<string>) => {
      const buffer = Chunk.builder<string>()
      let inCRLF = wasSplitCRLF
      let carry = leftover.getOrElse("")

      incomingChunk.forEach((string) => {
        const concatenated = carry + string

        if (concatenated.length > 0) {
          // If we had a split CRLF, start reading from the last character of
          // the leftover, which was the '\r'. Otherwise we just skip over the
          // entire previous leftover, as it doesn't contain a newline.
          const continueFrom = inCRLF && carry.length > 0 ? carry.length - 1 : carry.length

          const [sliceStart, _, midCRLF] = Chunk.from(concatenated)
            .zipWithIndex
            .drop(continueFrom)
            .reduce(
              [0 as number, false as boolean, inCRLF] as const,
              (
                [sliceStart, skipNext, midCRLF],
                [char, index]
              ) => {
                if (skipNext) {
                  return [sliceStart, false, false] as const
                }

                switch (char) {
                  case "\n": {
                    buffer.append(concatenated.substring(sliceStart, index))
                    return [index + 1, false, midCRLF] as const
                  }
                  case "\r": {
                    if (
                      index + 1 < concatenated.length &&
                      concatenated[index + 1] === "\n"
                    ) {
                      buffer.append(concatenated.substring(sliceStart, index))
                      return [index + 2, true, false] as const
                    }
                    if (index === concatenated.length - 1) {
                      return [sliceStart, false, true] as const
                    }
                    return [sliceStart, false, false] as const
                  }
                  default: {
                    return [sliceStart, false, midCRLF] as const
                  }
                }
              }
            )

          carry = concatenated.slice(sliceStart)
          inCRLF = midCRLF
        }
      })

      return (
        Channel.write(buffer.build()).flatMap(
          () => next<E>(carry.length > 0 ? Maybe.some(carry) : Maybe.none, inCRLF)
        )
      )
    },
    (cause) =>
      leftover.fold(
        Channel.failCause(cause),
        (value) => Channel.write(Chunk.single(value)).flatMap(() => Channel.failCause(cause))
      ),
    (done) =>
      leftover.fold(
        Channel.succeed(done),
        (value) => Channel.write(Chunk.single(value)).flatMap(() => Channel.succeed(done))
      )
  )
}
