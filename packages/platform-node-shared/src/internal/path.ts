import { BadArgument } from "@effect/platform/Error"
import { Path } from "@effect/platform/Path"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodePath from "node:path"
import * as NodeUrl from "node:url"

const fromFileUrl = (url: URL): Effect.Effect<never, BadArgument, string> =>
  Effect.try({
    try: () => NodeUrl.fileURLToPath(url),
    catch: (error) =>
      BadArgument({
        module: "Path",
        method: "fromFileUrl",
        message: `${error}`
      })
  })

const toFileUrl = (path: string): Effect.Effect<never, BadArgument, URL> =>
  Effect.try({
    try: () => NodeUrl.pathToFileURL(path),
    catch: (error) =>
      BadArgument({
        module: "Path",
        method: "toFileUrl",
        message: `${error}`
      })
  })

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
