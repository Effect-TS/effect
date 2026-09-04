import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Path, Stream } from "effect"
import { Multipart } from "effect/unstable/http"

const boundary = "owned-part-guard-boundary"
const encoder = new TextEncoder()
const body = encoder.encode(
  `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\n` +
    "owned field\r\n" +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="upload"; filename="owned.txt"\r\n` +
    "Content-Type: text/plain\r\n\r\n" +
    "owned bytes\r\n" +
    `--${boundary}--\r\n`
)

const parts = () =>
  Stream.make(body).pipe(
    Stream.pipeThroughChannel(Multipart.makeChannel({ "content-type": `multipart/form-data; boundary=${boundary}` }))
  )

const classify = (value: unknown) => {
  if (!Multipart.isPart(value)) return "not-streamed-part"
  if (Multipart.isField(value)) return "field"
  // The existing public guards narrow unknown to File here without a cast.
  return value.content === undefined ? "missing-file-content" : "file"
}

const fixtures = Effect.gen(function*() {
  const parsedContents: Array<string> = []
  const parsed = yield* parts().pipe(
    Stream.tap((part) =>
      part._tag === "File"
        ? Stream.mkString(Stream.decodeText(part.content)).pipe(
          Effect.tap((text) => Effect.sync(() => parsedContents.push(text)))
        )
        : Effect.void
    ),
    Stream.runCollect
  )
  assert.strictEqual(parsed.length, 2)
  const [field, file] = parsed
  if (field?._tag !== "Field" || file?._tag !== "File") {
    return yield* Effect.die("expected an actual parsed Field followed by File")
  }
  assert.deepStrictEqual(
    [field.key, field.value, file.key, file.name, file.contentType, parsedContents],
    ["description", "owned field", "upload", "owned.txt", "text/plain", ["owned bytes"]]
  )

  const writes: Array<{ path: string; key: string; text: string }> = []
  // This seam drains owned bytes only. No file or directory is created on disk.
  const persisted = yield* Multipart.toPersisted(
    parts(),
    (path, part) =>
      Stream.mkString(Stream.decodeText(part.content)).pipe(
        Effect.tap((text) => Effect.sync(() => writes.push({ path, key: part.key, text }))),
        Effect.asVoid
      )
  ).pipe(
    Effect.provideService(
      FileSystem.FileSystem,
      FileSystem.makeNoop({ makeTempDirectoryScoped: () => Effect.succeed("/owned-multipart-guard") })
    ),
    Effect.provide(Path.layer)
  )
  const uploads = persisted.upload
  if (!Array.isArray(uploads) || uploads.length !== 1) {
    return yield* Effect.die("expected one toPersisted output file")
  }
  const saved = uploads[0]
  if (saved === undefined || typeof saved === "string") {
    return yield* Effect.die("expected the library-produced persisted file")
  }
  assert.deepStrictEqual(
    [persisted.description, saved._tag, saved.key, saved.name, saved.contentType, saved.path, writes],
    [
      "owned field",
      "PersistedFile",
      "upload",
      "owned.txt",
      "text/plain",
      "/owned-multipart-guard/owned.txt",
      [{ path: "/owned-multipart-guard/owned.txt", key: "upload", text: "owned bytes" }]
    ]
  )
  return { field, file, saved }
})

describe("Multipart.isPart", () => {
  it.effect("persisted_file_is_not_streamed_part", () =>
    Effect.gen(function*() {
      const { saved } = yield* fixtures
      assert.strictEqual(Multipart.isPart(saved), false)
    }))

  it.effect("persisted_value_does_not_enter_file_consumer_branch", () =>
    Effect.gen(function*() {
      const { saved } = yield* fixtures
      assert.strictEqual(classify(saved), "not-streamed-part")
    }))

  it.effect("parsed_field_is_part", () =>
    Effect.gen(function*() {
      const { field } = yield* fixtures
      assert.deepStrictEqual([Multipart.isPart(field), classify(field)], [true, "field"])
    }))

  it.effect("parsed_file_is_part", () =>
    Effect.gen(function*() {
      const { file } = yield* fixtures
      assert.deepStrictEqual([Multipart.isPart(file), classify(file)], [true, "file"])
    }))

  it.effect("field_and_file_specific_guards_preserved", () =>
    Effect.gen(function*() {
      const { field, file } = yield* fixtures
      assert.deepStrictEqual(
        [
          [Multipart.isField(field), Multipart.isFile(field), Multipart.isPersistedFile(field)],
          [Multipart.isField(file), Multipart.isFile(file), Multipart.isPersistedFile(file)]
        ],
        [[true, false, false], [false, true, false]]
      )
    }))

  it.effect("persisted_file_specific_guard_preserved", () =>
    Effect.gen(function*() {
      const { saved } = yield* fixtures
      assert.deepStrictEqual(
        [Multipart.isPersistedFile(saved), Multipart.isField(saved), Multipart.isFile(saved)],
        [true, false, false]
      )
    }))

  it("unrelated_values_are_not_parts", () => {
    const unbranded = { _tag: "File", key: "upload", name: "owned.txt" }
    assert.deepStrictEqual(
      [null, undefined, unbranded].map((value) => [
        Multipart.isPart(value),
        Multipart.isField(value),
        Multipart.isFile(value),
        Multipart.isPersistedFile(value),
        classify(value)
      ]),
      [
        [false, false, false, false, "not-streamed-part"],
        [false, false, false, false, "not-streamed-part"],
        [false, false, false, false, "not-streamed-part"]
      ]
    )
  })
})
