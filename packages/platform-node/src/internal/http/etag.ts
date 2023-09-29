import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import * as Etag from "@effect/platform/Http/Etag"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const fromFileInfo = (info: FileSystem.File.Info) => {
  const mtime = info.mtime._tag === "Some"
    ? info.mtime.value.getTime().toString(16)
    : "0"
  return `${info.size.toString(16)}-${mtime}`
}

const fromFileWeb = (file: Body.Body.FileLike) => {
  return `${file.size.toString(16)}-${file.lastModified.toString(16)}`
}

/** @internal */
export const layer = Layer.succeed(
  Etag.Generator,
  Etag.Generator.of({
    [Etag.GeneratorTypeId]: Etag.GeneratorTypeId,
    fromFileInfo(info) {
      return Effect.sync(() => ({ _tag: "Strong", value: fromFileInfo(info) }))
    },
    fromFileWeb(file) {
      return Effect.sync(() => ({ _tag: "Strong", value: fromFileWeb(file) }))
    }
  })
)

/** @internal */
export const layerWeak = Layer.succeed(
  Etag.Generator,
  Etag.Generator.of({
    [Etag.GeneratorTypeId]: Etag.GeneratorTypeId,
    fromFileInfo(info) {
      return Effect.sync(() => ({ _tag: "Weak", value: fromFileInfo(info) }))
    },
    fromFileWeb(file) {
      return Effect.sync(() => ({ _tag: "Weak", value: fromFileWeb(file) }))
    }
  })
)
