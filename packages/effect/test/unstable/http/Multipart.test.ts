import { describe, it } from "@effect/vitest"
import { Effect, ErrorReporter, FileSystem, identity, Path, Schema, Stream, Unify } from "effect"
import { HttpClientRequest, HttpServerRequest, Multipart, MultipartParser } from "effect/unstable/http"
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable"
import { deepStrictEqual, notStrictEqual, strictEqual } from "node:assert"

describe("Multipart", () => {
  it.effect("parses fields and streams file content", () =>
    Effect.gen(function*() {
      const data = new globalThis.FormData()
      data.append("foo", "bar")
      data.append("test", "ing")
      data.append("file", new globalThis.File(["A".repeat(1024 * 1024)], "foo.txt", { type: "text/plain" }))
      const response = new Response(data)

      const parts = yield* Stream.fromReadableStream({
        evaluate: () => response.body!,
        onError: identity
      }).pipe(
        Stream.pipeThroughChannel(Multipart.makeChannel(Object.fromEntries(response.headers))),
        Stream.mapEffect((part) => {
          return Unify.unify(
            part._tag === "File" ?
              Effect.zip(
                Effect.succeed(part.name),
                Stream.mkString(Stream.decodeText(part.content))
              ) :
              Effect.succeed([part.key, part.value] as const)
          )
        }),
        Stream.runCollect
      )

      deepStrictEqual(parts, [
        ["foo", "bar"],
        ["test", "ing"],
        ["foo.txt", "A".repeat(1024 * 1024)]
      ])
    }))

  it.effect("parses non-Latin-1 filenames", () =>
    Effect.gen(function*() {
      const data = new globalThis.FormData()
      data.append("file", new globalThis.File(["content"], "日本語.txt", { type: "text/plain" }))
      const response = new Response(data)

      const parts = yield* Stream.fromReadableStream({
        evaluate: () => response.body!,
        onError: identity
      }).pipe(
        Stream.pipeThroughChannel(Multipart.makeChannel(Object.fromEntries(response.headers))),
        Stream.mapEffect((part) =>
          Unify.unify(
            part._tag === "File"
              ? Stream.runDrain(part.content).pipe(Effect.as([part.key, part.name] as const))
              : Effect.succeed([part.key, part.value] as const)
          )
        ),
        Stream.runCollect
      )

      deepStrictEqual(parts, [["file", "日本語.txt"]])
    }))

  it.effect("fails when a limit is exceeded even if the whole body arrives in one chunk", () =>
    Effect.gen(function*() {
      const boundary = "----testboundary"
      const part = (name: string) =>
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"; filename="${name}.txt"\r\n` +
        `Content-Type: text/plain\r\n\r\n${name}\r\n`
      const body = part("a") + part("b") + part("c") + `--${boundary}--\r\n`

      const error = yield* Stream.make(new TextEncoder().encode(body)).pipe(
        Stream.pipeThroughChannel(
          Multipart.makeChannel({ "content-type": `multipart/form-data; boundary=${boundary}` })
        ),
        Stream.runCollect,
        Effect.provideService(Multipart.MaxParts, 2),
        Effect.flip
      )

      strictEqual(error._tag, "MultipartError")
      strictEqual(error.reason._tag, "TooManyParts")
    }))

  it.each<{
    description: string
    options: {
      readonly maxParts?: number
      readonly maxFieldSize?: number
      readonly maxPartSize?: number
    }
    limit: "MaxParts" | "MaxFieldSize" | "MaxPartSize"
    expectedFields: Array<string>
  }>([
    {
      description: "maxParts",
      options: { maxParts: 2 },
      limit: "MaxParts",
      expectedFields: ["a", "b"]
    },
    {
      description: "maxFieldSize",
      options: { maxFieldSize: 1 },
      limit: "MaxFieldSize",
      expectedFields: []
    },
    {
      description: "maxPartSize",
      options: { maxPartSize: 1 },
      limit: "MaxPartSize",
      expectedFields: []
    }
  ])("stops delivering fields when $description is exceeded", ({ expectedFields, limit, options }) => {
    const boundary = "----testboundary"
    const encoder = new TextEncoder()
    const fields: Array<string> = []
    const errors: Array<MultipartParser.MultipartError> = []
    const parser = MultipartParser.make({
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      ...options,
      onField(info) {
        fields.push(info.name)
      },
      onFile: () => () => {},
      onError(error) {
        errors.push(error)
      },
      onDone() {}
    })
    const part = (name: string) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\nvalue\r\n`

    parser.write(encoder.encode(part("a") + part("b") + part("c") + part("d") + `--${boundary}--\r\n`))
    parser.end()

    deepStrictEqual(errors, [{ _tag: "ReachedLimit", limit }])
    deepStrictEqual(fields, expectedFields)
  })

  it("handles the final boundary delimiter split between the trailing hyphens", () => {
    const boundary = "----testboundary"
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const errors: Array<MultipartParser.MultipartError> = []
    const fields: Array<readonly [string, string]> = []
    let done = false
    const parser = MultipartParser.make({
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      onField(info, value) {
        fields.push([info.name, decoder.decode(value)])
      },
      onFile: () => () => {},
      onError(error) {
        errors.push(error)
      },
      onDone() {
        done = true
      }
    })
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="field"\r\n\r\nvalue`

    parser.write(encoder.encode(`${body}\r\n--${boundary}-`))
    parser.write(encoder.encode("-\r\n"))
    strictEqual(done, true)
    parser.end()

    deepStrictEqual(fields, [["field", "value"]])
    deepStrictEqual(errors, [])
  })

  it.effect("returns distinct persisted file paths for files with the same client filename", () =>
    Effect.gen(function*() {
      const formData = new FormData()
      formData.append("first", new File(["one"], "same.txt"))
      formData.append("second", new File(["two"], "same.txt"))
      const request = HttpServerRequest.fromClientRequest(
        HttpClientRequest.bodyFormData(HttpClientRequest.post("https://example.com"), formData)
      )
      const writes: Array<string> = []
      const persisted = yield* Multipart.toPersisted(
        request.multipartStream,
        (path) => Effect.sync(() => writes.push(path))
      ).pipe(
        Effect.provideService(
          FileSystem.FileSystem,
          FileSystem.makeNoop({
            makeTempDirectoryScoped: () => Effect.succeed("/tmp/audit")
          })
        ),
        Effect.provide(Path.layer)
      )
      const first = (persisted.first as Array<Multipart.PersistedFile>)[0]
      const second = (persisted.second as Array<Multipart.PersistedFile>)[0]
      strictEqual(first.path, "/tmp/audit/same.txt")
      notStrictEqual(first.path, second.path)
      deepStrictEqual(writes, [first.path, second.path])
    }))

  it.effect("responds based on the reason and is ignored by the ErrorReporter", () =>
    Effect.gen(function*() {
      const cases = [
        ["FileTooLarge", 413],
        ["FieldTooLarge", 413],
        ["BodyTooLarge", 413],
        ["TooManyParts", 413],
        ["InternalError", 500],
        ["Parse", 400]
      ] as const

      for (const [reason, status] of cases) {
        const error = Multipart.MultipartError.fromReason(reason)
        const response = yield* HttpServerRespondable.toResponse(error)

        strictEqual(response.status, status)
        strictEqual(ErrorReporter.isIgnored(error), true)
      }
    }))

  describe("FileSchema", () => {
    it("toJsonSchema", () => {
      const document = Schema.toJsonSchemaDocument(Multipart.PersistedFileSchema)
      deepStrictEqual(document, {
        dialect: "draft-2020-12",
        schema: {
          "type": "object",
          "properties": {
            "key": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "contentType": {
              "type": "string",
              "contentEncoding": "binary"
            },
            "path": {
              "type": "string"
            }
          },
          "required": ["key", "name", "contentType", "path"],
          "additionalProperties": false
        },
        definitions: {}
      })
    })
  })
})
