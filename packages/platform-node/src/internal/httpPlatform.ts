import * as EtagImpl from "@effect/platform/Etag"
import * as Headers from "@effect/platform/Headers"
import * as Platform from "@effect/platform/HttpPlatform"
import * as ServerResponse from "@effect/platform/HttpServerResponse"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import Mime from "mime"
import * as Fs from "node:fs"
import { Readable } from "node:stream"
import * as FileSystem from "../NodeFileSystem.js"

const getMimeTypeWithCharset = (path: string, charset = "utf-8") => {
  const mimeType = Mime.getType(path)

  if (mimeType) {
    // in case of non-text types,
    // the charset should be ignored by the client
    return `${mimeType};charset=${charset}`
  }

  return null
}

/** @internal */
export const make = Platform.make({
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    const stream = Fs.createReadStream(path, { start, end })

    return ServerResponse.raw(stream, {
      headers: {
        ...headers,
        "content-type": headers["content-type"]
          ?? getMimeTypeWithCharset(path) ?? "application/octet-stream",
        "content-length": contentLength.toString()
      },
      status,
      statusText
    })
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return ServerResponse.raw(Readable.fromWeb(file.stream() as any), {
      headers: Headers.merge(
        headers,
        Headers.unsafeFromRecord({
          "content-type": headers["content-type"]
            ?? getMimeTypeWithCharset(file.name) ?? "application/octet-stream",
          "content-length": file.size.toString()
        })
      ),
      status,
      statusText
    })
  }
})

/** @internal */
export const layer = pipe(
  Layer.effect(Platform.HttpPlatform, make),
  Layer.provide(FileSystem.layer),
  Layer.provide(EtagImpl.layer)
)
