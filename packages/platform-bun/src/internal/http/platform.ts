import * as Etag from "@effect/platform-node/Http/Etag"
import * as Platform from "@effect/platform/Http/Platform"
import * as ServerResponse from "@effect/platform/Http/ServerResponse"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as FileSystem from "../../FileSystem.js"

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
export const layer = pipe(
  Layer.effect(Platform.Platform, make),
  Layer.provide(FileSystem.layer),
  Layer.provide(Etag.layer)
)
