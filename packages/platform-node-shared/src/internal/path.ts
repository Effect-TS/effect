import { BadArgument } from "@effect/platform/Error"
import { Path, TypeId } from "@effect/platform/Path"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodePath from "node:path"
import * as NodeUrl from "node:url"

const fromFileUrl = (url: URL): Effect.Effect<string, BadArgument> =>
  Effect.try({
    try: () => NodeUrl.fileURLToPath(url),
    catch: (error) =>
      new BadArgument({
        module: "Path",
        method: "fromFileUrl",
        description: `Invalid file URL: ${url}`,
        cause: error
      })
  })

const toFileUrl = (path: string): Effect.Effect<URL, BadArgument> =>
  Effect.try({
    try: () => NodeUrl.pathToFileURL(path),
    catch: (error) =>
      new BadArgument({
        module: "Path",
        method: "toFileUrl",
        description: `Invalid path: ${path}`,
        cause: error
      })
  })

/** @internal */
export const layerPosix = Layer.succeed(
  Path,
  Path.of({
    [TypeId]: TypeId,
    ...NodePath.posix,
    fromFileUrl,
    toFileUrl
  })
)

/** @internal */
export const layerWin32 = Layer.succeed(
  Path,
  Path.of({
    [TypeId]: TypeId,
    ...NodePath.win32,
    fromFileUrl,
    toFileUrl
  })
)

/** @internal */
export const layer = Layer.succeed(
  Path,
  Path.of({
    [TypeId]: TypeId,
    ...NodePath,
    fromFileUrl,
    toFileUrl
  })
)
