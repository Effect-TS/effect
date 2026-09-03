import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import { HttpEffect, HttpPlatform, HttpServerResponse, HttpStaticServer } from "effect/unstable/http"

const services = Layer.mergeAll(
  Path.layer,
  FileSystem.layerNoop({
    stat: () => Effect.succeed({ type: "File", size: FileSystem.Size(10) } as FileSystem.File.Info)
  }),
  Layer.succeed(
    HttpPlatform.HttpPlatform,
    HttpPlatform.HttpPlatform.of({
      platform: "web",
      compression: { algorithms: new Set(), compressResponse: Effect.succeed },
      fileResponse: () => Effect.succeed(HttpServerResponse.text("0123456789")),
      fileWebResponse: () => Effect.die("unused")
    })
  )
)

describe("HttpStaticServer", () => {
  it.effect("ignores Range on HEAD requests", () =>
    Effect.gen(function*() {
      const app = yield* HttpStaticServer.make({ root: "/root" })
      const response = yield* Effect.promise(() =>
        HttpEffect.toWebHandler(app)(
          new Request("http://localhost/file.txt", {
            method: "HEAD",
            headers: { Range: "bytes=20-24" }
          })
        )
      )

      assert.strictEqual(response.status, 200)
      assert.strictEqual(response.headers.get("content-length"), "10")
      assert.strictEqual(response.headers.get("content-range"), null)
    }).pipe(Effect.provide(services)))
})
