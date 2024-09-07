import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Etag from "../Etag.js"
import type * as FileSystem from "../FileSystem.js"
import type * as Body from "../HttpBody.js"

/** @internal */
export const GeneratorTypeId: Etag.GeneratorTypeId = Symbol.for(
  "@effect/platform/Etag/Generator"
) as Etag.GeneratorTypeId

/** @internal */
export const tag = Context.GenericTag<Etag.Generator>("@effect/platform/Etag/Generator")

/** @internal */
export const toString = (self: Etag.Etag): string => {
  switch (self._tag) {
    case "Weak":
      return `W/"${self.value}"`
    case "Strong":
      return `"${self.value}"`
  }
}

const fromFileInfo = (info: FileSystem.File.Info) => {
  const mtime = info.mtime._tag === "Some"
    ? info.mtime.value.getTime().toString(16)
    : "0"
  return `${info.size.toString(16)}-${mtime}`
}

const fromFileWeb = (file: Body.HttpBody.FileLike) => {
  return `${file.size.toString(16)}-${file.lastModified.toString(16)}`
}

/** @internal */
export const layer = Layer.succeed(
  tag,
  tag.of({
    [GeneratorTypeId]: GeneratorTypeId,
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
  tag,
  tag.of({
    [GeneratorTypeId]: GeneratorTypeId,
    fromFileInfo(info) {
      return Effect.sync(() => ({ _tag: "Weak", value: fromFileInfo(info) }))
    },
    fromFileWeb(file) {
      return Effect.sync(() => ({ _tag: "Weak", value: fromFileWeb(file) }))
    }
  })
)
