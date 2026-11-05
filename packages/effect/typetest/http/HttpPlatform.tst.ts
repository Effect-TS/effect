import type { Path } from "effect"
import { Effect, FileSystem, Layer } from "effect"
import { type Etag, type HttpBody, HttpPlatform, type HttpServerResponse, type HttpStaticServer } from "effect/http"
import { describe, expect, it } from "tstyche"

describe("HttpPlatform", () => {
  it("accepts a synchronous fileResponse implementation", () => {
    expect<ReturnType<Parameters<typeof HttpPlatform.make>[0]["fileResponse"]>>().type.toBe<
      HttpServerResponse.HttpServerResponse
    >()
  })

  it("requires only the file system operations it calls", () => {
    expect(HttpPlatform.layer).type.toBe<
      Layer.Layer<HttpPlatform.HttpPlatform, never, "effect/FileSystem/stat" | "effect/FileSystem/stream">
    >()
    expect<Effect.Services<ReturnType<typeof HttpPlatform.make>>>().type.toBe<
      Etag.Generator | "effect/FileSystem/stat"
    >()
    expect<Effect.Services<ReturnType<typeof HttpBody.file>>>().type.toBe<
      "effect/FileSystem/stat" | "effect/FileSystem/stream"
    >()
    expect<Effect.Services<ReturnType<typeof HttpBody.fileFromInfo>>>().type.toBe<"effect/FileSystem/stream">()
    expect<Effect.Services<ReturnType<typeof HttpStaticServer.make>>>().type.toBe<
      "effect/FileSystem/stat" | Path.Path | HttpPlatform.HttpPlatform
    >()
  })

  it("is satisfied by the whole file system, or by the layers of the operations it calls", () => {
    const stat = Layer.succeed(FileSystem.stat, () => Effect.die("unused"))
    const stream = Layer.succeed(FileSystem.stream, () => Effect.die("unused") as never)
    expect(HttpPlatform.layer.pipe(Layer.provide(FileSystem.layerNoop({})))).type.toBe<
      Layer.Layer<HttpPlatform.HttpPlatform>
    >()
    expect(HttpPlatform.layer.pipe(Layer.provide(Layer.mergeAll(stat, stream)))).type.toBe<
      Layer.Layer<HttpPlatform.HttpPlatform>
    >()
    expect(HttpPlatform.layer.pipe(Layer.provide(stat))).type.toBe<
      Layer.Layer<HttpPlatform.HttpPlatform, never, "effect/FileSystem/stream">
    >()
  })
})
