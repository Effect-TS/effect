import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import PathB from "path-browserify"
import { BadArgument } from "../Error.js"
import type * as Api from "../Path.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for("@effect/platform/Path") as Api.TypeId

/** @internal */
export const Path = GenericTag<Api.Path>("@effect/platform/Path")

/** @internal */
export const layer = Layer.succeed(
  Path,
  Path.of({
    [TypeId]: TypeId,
    ...PathB,
    fromFileUrl,
    toFileUrl,
    toNamespacedPath: identity
  })
)

/**
 * The following functions are adapted from the Node.js source code:
 * https://github.com/nodejs/node/blob/main/lib/internal/url.js
 *
 * The following license applies to these functions:
 * - MIT
 */

function fromFileUrl(url: URL): Effect.Effect<string, BadArgument> {
  if (url.protocol !== "file:") {
    return Effect.fail(BadArgument({
      module: "Path",
      method: "fromFileUrl",
      message: "URL must be of scheme file"
    }))
  } else if (url.hostname !== "") {
    return Effect.fail(BadArgument({
      module: "Path",
      method: "fromFileUrl",
      message: "Invalid file URL host"
    }))
  }
  const pathname = url.pathname
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === "%") {
      const third = pathname.codePointAt(n + 2)! | 0x20
      if (pathname[n + 1] === "2" && third === 102) {
        return Effect.fail(BadArgument({
          module: "Path",
          method: "fromFileUrl",
          message: "must not include encoded / characters"
        }))
      }
    }
  }
  return Effect.succeed(decodeURIComponent(pathname))
}

const CHAR_FORWARD_SLASH = 47

function toFileUrl(filepath: string) {
  const outURL = new URL("file://")
  let resolved = PathB.resolve(filepath)
  // path.resolve strips trailing slashes so we must add them back
  const filePathLast = filepath.charCodeAt(filepath.length - 1)
  if (
    (filePathLast === CHAR_FORWARD_SLASH) &&
    resolved[resolved.length - 1] !== "/"
  ) {
    resolved += "/"
  }
  outURL.pathname = encodePathChars(resolved)
  return Effect.succeed(outURL)
}

const percentRegEx = /%/g
const backslashRegEx = /\\/g
const newlineRegEx = /\n/g
const carriageReturnRegEx = /\r/g
const tabRegEx = /\t/g

function encodePathChars(filepath: string) {
  if (filepath.includes("%")) {
    filepath = filepath.replace(percentRegEx, "%25")
  }
  if (filepath.includes("\\")) {
    filepath = filepath.replace(backslashRegEx, "%5C")
  }
  if (filepath.includes("\n")) {
    filepath = filepath.replace(newlineRegEx, "%0A")
  }
  if (filepath.includes("\r")) {
    filepath = filepath.replace(carriageReturnRegEx, "%0D")
  }
  if (filepath.includes("\t")) {
    filepath = filepath.replace(tabRegEx, "%09")
  }
  return filepath
}
