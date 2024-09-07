import * as FileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Etag from "@effect/platform/Etag"
import * as Platform from "@effect/platform/HttpPlatform"
import * as ServerResponse from "@effect/platform/HttpServerResponse"
import * as Layer from "effect/Layer"

/** @internal */
export const make = Platform.make({
  fileResponse(path, status, statusText, headers, start, end, _contentLength) {
    let file = Bun.file(path)
    if (start > 0 || end !== undefined) {
      file = file.slice(start, end)
    }
    return ServerResponse.raw(file, { headers, status, statusText })
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return ServerResponse.raw(file, { headers, status, statusText })
  }
})

/** @internal */
export const layer = Layer.effect(Platform.HttpPlatform, make).pipe(
  Layer.provide(FileSystem.layer),
  Layer.provide(Etag.layer)
)
