import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
 * newlines (`\n`).
 *
 * @tsplus static effect/core/stream/Stream.Ops splitLines
 * @category mutations
 * @since 1.0.0
 */
export function splitLines<R, E>(
  self: Stream<R, E, string>
): Stream<R, E, string> {
  concreteStream(self)
  return new StreamInternal(self.channel.pipeTo(next<E>(Option.none, false)))
}

function next<E>(
  leftover: Option.Option<string>,
  wasSplitCRLF: boolean
): Channel<never, E, Chunk.Chunk<string>, unknown, E, Chunk.Chunk<string>, unknown> {
  return Channel.readWithCause(
    (incomingChunk: Chunk.Chunk<string>) => {
      const buffer: Array<string> = []
      let inCRLF = wasSplitCRLF
      let carry = Option.isSome(leftover) ? leftover.value : ""

      pipe(
        incomingChunk,
        Chunk.forEach((string) => {
          const concatenated = carry + string

          if (concatenated.length > 0) {
            // If we had a split CRLF, start reading from the last character of
            // the leftover, which was the '\r'. Otherwise we just skip over the
            // entire previous leftover, as it doesn't contain a newline.
            const continueFrom = inCRLF && carry.length > 0 ? carry.length - 1 : carry.length

            const [sliceStart, _, midCRLF] = pipe(
              Chunk.fromIterable(concatenated),
              Chunk.zipWithIndex,
              Chunk.drop(continueFrom),
              Chunk.reduce(
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
                      buffer.push(concatenated.substring(sliceStart, index))
                      return [index + 1, false, midCRLF] as const
                    }
                    case "\r": {
                      if (
                        index + 1 < concatenated.length &&
                        concatenated[index + 1] === "\n"
                      ) {
                        buffer.push(concatenated.substring(sliceStart, index))
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
            )

            carry = concatenated.slice(sliceStart)
            inCRLF = midCRLF
          }
        })
      )

      return (
        Channel.write(Chunk.unsafeFromArray(buffer)).flatMap(
          () => next<E>(carry.length > 0 ? Option.some(carry) : Option.none, inCRLF)
        )
      )
    },
    (cause) => {
      switch (leftover._tag) {
        case "None": {
          return Channel.failCause(cause)
        }
        case "Some": {
          return Channel.write(Chunk.single(leftover.value)).flatMap(() => Channel.failCause(cause))
        }
      }
    },
    (done) => {
      switch (leftover._tag) {
        case "None": {
          return Channel.succeed(done)
        }
        case "Some": {
          return Channel.write(Chunk.single(leftover.value)).flatMap(() => Channel.succeed(done))
        }
      }
    }
  )
}
