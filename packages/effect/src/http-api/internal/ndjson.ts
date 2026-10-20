import type * as Arr from "../../Array.ts"
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Pull from "../../Pull.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as Stream from "../../Stream.ts"

const LF = 0x0a
const CR = 0x0d
const streamOptions = { stream: true }

/**
 * Encodes a stream of elements as newline-delimited JSON, writing `\n` after
 * every element including the last.
 *
 * @internal
 */
export const encode = <A, E, R, E2, R2>(
  self: Stream.Stream<A, E, R>,
  encodeElements: (elements: Arr.NonEmptyReadonlyArray<A>) => Effect.Effect<ReadonlyArray<unknown>, E2, R2>
): Stream.Stream<Uint8Array, E | E2, R | R2> =>
  self.pipe(
    Stream.mapArrayEffect((elements) =>
      Effect.map(encodeElements(elements), (encoded) => {
        let text = ""
        for (const element of encoded) text += JSON.stringify(element) + "\n"
        return [text] as const
      })
    ),
    Stream.encodeText
  )

/**
 * Decodes a newline-delimited JSON byte stream into elements.
 *
 * **Details**
 *
 * `\n`, `\r\n` and a bare `\r` end a line. Empty lines are skipped, a leading
 * BOM is stripped and invalid UTF-8 fails. The first bad line fails the stream
 * after every element before it has been emitted. `maxElementBytes` counts the
 * UTF-8 bytes of a line without its terminator, and a breach fails with
 * `onElementTooLarge` before the rest of the line is read.
 *
 * @internal
 */
export const decode = <A, E, R, R2, E2>(
  self: Stream.Stream<Uint8Array, E, R>,
  options: {
    readonly decodeElement: (json: unknown) => Effect.Effect<A, Schema.SchemaError, R2>
    readonly maxElementBytes: number
    readonly onElementTooLarge: () => E2
  }
): Stream.Stream<A, E | E2 | Schema.SchemaError, R | R2> =>
  Stream.suspend(() => {
    const state: DecodeState = { unterminated: false }
    const text = Stream.transformPull(self, (upstream) =>
      Effect.sync(() => makeTextPull(upstream, options.maxElementBytes, options.onElementTooLarge, state)))
    return Stream.transformPull(
      Stream.splitLines(text),
      (upstream) =>
        Effect.sync(() => makeElementPull(upstream, options.decodeElement, state))
    )
  })

interface DecodeState {
  // Set when the input ends without a terminator, before splitLines emits the
  // final line.
  unterminated: boolean
}

const invalidUtf8 = () => new Schema.SchemaError(new SchemaIssue.InvalidValue({ message: "Expected valid UTF-8" }))

const isTerminator = (byte: number) => byte === LF || byte === CR

function makeTextPull<E, E2>(
  upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<Uint8Array>, E, void>,
  maxElementBytes: number,
  onElementTooLarge: () => E2,
  state: DecodeState
): Pull.Pull<Arr.NonEmptyReadonlyArray<string>, E | E2 | Schema.SchemaError, void> {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  // UTF-8 bytes since the last line terminator
  let lineBytes = 0
  // Text decoded before a failure is emitted first, then the failure
  let failure: E2 | Schema.SchemaError | undefined

  // Line terminators are ASCII, so a segment that ends with one leaves no
  // partial character in the decoder. A fresh decoder can then find the valid
  // lines in front of an invalid byte.
  function recover(bytes: Uint8Array, out: Array<string>): Schema.SchemaError {
    const fresh = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    let start = 0
    for (let i = 0; i < bytes.length; i++) {
      if (!isTerminator(bytes[i])) continue
      try {
        out.push(fresh.decode(bytes.subarray(start, i + 1), streamOptions))
      } catch {
        break
      }
      start = i + 1
    }
    return invalidUtf8()
  }

  function decodeBytes(bytes: Uint8Array, firstTerminator: number, out: Array<string>): Schema.SchemaError | undefined {
    if (bytes.length === 0) return
    // Decode the line that continues from the previous chunk on its own, so a
    // failure in the rest of the chunk can be recovered line by line.
    const split = firstTerminator + 1
    if (split === 0 || split === bytes.length) {
      try {
        out.push(decoder.decode(bytes, streamOptions))
        return
      } catch {
        return invalidUtf8()
      }
    }
    try {
      out.push(decoder.decode(bytes.subarray(0, split), streamOptions))
    } catch {
      return invalidUtf8()
    }
    try {
      out.push(decoder.decode(bytes.subarray(split), streamOptions))
    } catch {
      return recover(bytes.subarray(split), out)
    }
  }

  function decodeChunk(chunk: Uint8Array, out: Array<string>): E2 | Schema.SchemaError | undefined {
    let firstTerminator = -1
    let lastTerminator = -1
    for (let i = 0; i < chunk.length; i++) {
      if (isTerminator(chunk[i])) {
        lineBytes = 0
        lastTerminator = i
        if (firstTerminator === -1) firstTerminator = i
      } else if (++lineBytes > maxElementBytes) {
        return decodeBytes(chunk.subarray(0, lastTerminator + 1), firstTerminator, out) ?? onElementTooLarge()
      }
    }
    return decodeBytes(chunk, firstTerminator, out)
  }

  const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<string>, E | E2 | Schema.SchemaError, void> = Effect.suspend(() => {
    if (failure !== undefined) return Effect.fail(failure)
    return Pull.matchEffect(upstream, {
      onSuccess: (chunks) => {
        const out: Array<string> = []
        for (const chunk of chunks) {
          failure = decodeChunk(chunk, out)
          if (failure !== undefined) break
        }
        if (out.length > 0) return Effect.succeed(out as unknown as Arr.NonEmptyReadonlyArray<string>)
        return failure !== undefined ? Effect.fail(failure) : pull
      },
      onFailure: Effect.failCause,
      onDone: (): Effect.Effect<never, Schema.SchemaError | Cause.Done> => {
        state.unterminated = lineBytes > 0
        try {
          // A fatal decoder flushes to "" or throws on a partial character
          decoder.decode()
        } catch {
          return Effect.fail(invalidUtf8())
        }
        return Cause.done()
      }
    })
  })
  return pull
}

function makeElementPull<A, E, R2>(
  upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<string>, E, void>,
  decodeElement: (json: unknown) => Effect.Effect<A, Schema.SchemaError, R2>,
  state: DecodeState
): Pull.Pull<Arr.NonEmptyReadonlyArray<A>, E | Schema.SchemaError, void, R2> {
  // Elements decoded before a failure are emitted first, then the failure
  let failure: Cause.Cause<Schema.SchemaError> | undefined

  const decodeLine = (line: string): Effect.Effect<A, Schema.SchemaError, R2> => {
    let json: unknown
    try {
      json = JSON.parse(line)
    } catch {
      return Effect.fail(
        new Schema.SchemaError(
          new SchemaIssue.InvalidValue({
            message: state.unterminated
              ? "Expected a valid JSON line, got an unterminated final line"
              : "Expected a valid JSON line"
          })
        )
      )
    }
    return decodeElement(json)
  }

  const decodeLines = Effect.fnUntraced(function*(lines: Arr.NonEmptyReadonlyArray<string>) {
    const out: Array<A> = []
    for (const line of lines) {
      if (line.length === 0) continue
      const exit = yield* Effect.exit(decodeLine(line))
      if (Exit.isFailure(exit)) {
        if (out.length === 0) return yield* Effect.failCause(exit.cause)
        failure = exit.cause
        break
      }
      out.push(exit.value)
    }
    return out
  })

  const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<A>, E | Schema.SchemaError, void, R2> = Effect.suspend(() => {
    if (failure !== undefined) return Effect.failCause(failure)
    return Effect.flatMap(
      upstream,
      (lines) =>
        Effect.flatMap(
          decodeLines(lines),
          (elements) => elements.length > 0 ? Effect.succeed(elements as unknown as Arr.NonEmptyReadonlyArray<A>) : pull
        )
    )
  })
  return pull
}
