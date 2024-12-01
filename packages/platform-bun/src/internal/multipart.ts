import * as Multipart from "@effect/platform/Multipart"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Mailbox from "effect/Mailbox"
import * as Stream from "effect/Stream"

/** @internal */
export const stream = (source: Request): Stream.Stream<Multipart.Part, Multipart.MultipartError> =>
  pipe(
    Effect.gen(function*() {
      const [parts, write] = yield* Multipart.makeMailbox({ headers: Object.fromEntries(source.headers.entries()) })

      async function pump(reader: ReadableStreamDefaultReader<Uint8Array>) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await write(value)
        }
      }

      yield* Effect.async<void>((resume) => {
        const reader = source.body!.getReader()
        pump(reader).then(() => resume(Effect.void), (cause) => {
          parts.unsafeDone(Exit.fail(
            new Multipart.MultipartError({
              reason: "InternalError",
              cause
            })
          ))
        })
        return Effect.sync(() => reader.cancel())
      }).pipe(Effect.forkScoped)

      return Mailbox.toStream(parts)
    }),
    Stream.unwrapScoped
  )

/** @internal */
export const persisted = (source: Request) =>
  Multipart.toPersisted(stream(source), (path, file) =>
    Effect.tryPromise({
      try: async () => {
        const mailbox = (file as any).mailbox as Mailbox.ReadonlyMailbox<Uint8Array>
        const writer = Bun.file(path).writer()
        try {
          while (true) {
            const [chunk, done] = await Effect.runPromise(mailbox.takeAll)
            for (const item of chunk) {
              writer.write(item)
            }
            await writer.flush()
            if (done) break
          }
        } finally {
          await writer.end()
        }
      },
      catch: (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })
    }))
