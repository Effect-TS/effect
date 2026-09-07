import { assert, it } from "@effect/vitest"
import { ByteSize, Cause, Effect, FileSystem, Stream } from "effect"
import { HttpBody } from "effect/unstable/http"

for (const constructor of ["file", "fileFromInfo"] as const) {
  it.each([
    { name: "negative offset", options: { offset: -1 } },
    { name: "malformed byte count", options: { bytesToRead: "nope" } }
  ])(`${constructor} defers an invalid $name to an effect defect`, async ({ options }) => {
    const info = { size: ByteSize.bytes(6) } as FileSystem.File.Info
    // Construct outside Effect.gen so a synchronous throw fails the test.
    const body = constructor === "file"
      ? HttpBody.file("x", options)
      : HttpBody.fileFromInfo("x", info, options)

    const exit = await Effect.runPromiseExit(body.pipe(
      Effect.provideService(
        FileSystem.FileSystem,
        FileSystem.makeNoop({
          stat: () => Effect.succeed(info),
          stream: () => Stream.empty
        })
      )
    ))

    assert.strictEqual(exit._tag, "Failure")
    if (exit._tag === "Failure") {
      assert.isTrue(Cause.hasDies(exit.cause))
      assert.isFalse(Cause.hasFails(exit.cause))
    }
  })
}

it.effect("uses the selected byte count as partial file content length", () =>
  Effect.gen(function*() {
    const body = yield* HttpBody.fileFromInfo(
      "x",
      { size: ByteSize.bytes(6) } as any,
      { offset: ByteSize.bytes(2), bytesToRead: ByteSize.bytes(2) }
    ).pipe(
      Effect.provideService(FileSystem.FileSystem, {
        stream: () => Stream.succeed(new Uint8Array([3, 4]))
      } as any)
    )
    const bytes = yield* Stream.mkUint8Array(body.stream)
    assert.strictEqual(body.contentLength, bytes.length)
  }))
