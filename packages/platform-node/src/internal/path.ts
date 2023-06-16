import { Tag } from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { BadArgument } from "@effect/platform/Error"
import type { Path as _Path } from "@effect/platform/Path"
import * as NodePath from "node:path"
import * as NodeUrl from "node:url"

/** @internal */
export const Path = Tag<_Path>()

const fromFileUrl = (url: URL): Effect.Effect<never, BadArgument, string> =>
  Effect.tryCatch(
    () => NodeUrl.fileURLToPath(url),
    (error) =>
      BadArgument({
        module: "Path",
        method: "fromFileUrl",
        message: `${error}`
      })
  )

const toFileUrl = (path: string): Effect.Effect<never, BadArgument, URL> =>
  Effect.tryCatch(
    () => NodeUrl.pathToFileURL(path),
    (error) =>
      BadArgument({
        module: "Path",
        method: "toFileUrl",
        message: `${error}`
      })
  )

/** @internal */
export const layerPosix = Layer.succeed(
  Path,
  Path.of({
    ...NodePath.posix,
    fromFileUrl,
    toFileUrl
  })
)

/** @internal */
export const layerWin32 = Layer.succeed(
  Path,
  Path.of({
    ...NodePath.win32,
    fromFileUrl,
    toFileUrl
  })
)

/** @internal */
export const layer = Layer.succeed(
  Path,
  Path.of({
    ...NodePath,
    fromFileUrl,
    toFileUrl
  })
)
