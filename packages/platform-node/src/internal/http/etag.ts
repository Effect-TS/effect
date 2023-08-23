import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type * as FileSystem from "@effect/platform/FileSystem"
import * as Etag from "@effect/platform/Http/Etag"

const fromFileInfo = (info: FileSystem.File.Info) => {
  const mtime = info.mtime._tag === "Some"
    ? info.mtime.value.getTime().toString(16)
    : "0"
  return `${info.size.toString(16)}-${mtime}`
}

/** @internal */
export const layer = Layer.succeed(
  Etag.Generator,
  Etag.Generator.of({
    [Etag.GeneratorTypeId]: Etag.GeneratorTypeId,
    fromFileInfo(info) {
      return Effect.sync(() => ({ _tag: "Strong", value: fromFileInfo(info) }))
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
    }
  })
)
