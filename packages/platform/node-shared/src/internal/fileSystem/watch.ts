import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Error from "effect/PlatformError"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as NFS from "node:fs"
import * as Path from "node:path"
import { statFactory } from "./shared.ts"

const stat = statFactory("stat", NFS.stat)

const watchNode = (path: string, info: FileSystem.File.Info, options?: FileSystem.WatchOptions) =>
  Stream.callback<FileSystem.WatchEvent, Error.PlatformError>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const directory = info.type === "Directory" ? path : Path.dirname(path)
        const watcher = NFS.watch(path, {
          recursive: options?.recursive ?? false
        }, (event, path) => {
          if (!path) return
          switch (event) {
            case "rename": {
              Effect.runFork(Effect.matchEffect(stat(Path.resolve(directory, path)), {
                onSuccess: (_) => Queue.offer(queue, { _tag: "Create", path }),
                onFailure: (_) => Queue.offer(queue, { _tag: "Remove", path })
              }))
              return
            }
            case "change": {
              Queue.offerUnsafe(queue, { _tag: "Update", path })
              return
            }
          }
        })
        watcher.on("error", (error) => {
          Queue.failCauseUnsafe(
            queue,
            Cause.fail(
              Error.systemError({
                module: "FileSystem",
                _tag: "Unknown",
                method: "watch",
                pathOrDescriptor: path,
                cause: error
              })
            )
          )
        })
        watcher.on("close", () => {
          Queue.endUnsafe(queue)
        })
        return watcher
      }),
      (watcher) => Effect.sync(() => watcher.close())
    ).pipe(Effect.tap(() => Effect.sync(() => options?.onReady?.())))
  )

const watch = (
  backend: Option.Option<FileSystem.WatchBackend["Service"]>,
  path: string,
  options?: FileSystem.WatchOptions
) =>
  Effect.all([stat(path), Effect.serviceOption(FileSystem.WatchBackend)]).pipe(
    Effect.map(([stat, callerBackend]) =>
      Option.orElse(callerBackend, () => backend).pipe(
        Option.flatMap((_) => _.register(path, stat, options)),
        Option.getOrElse(() => watchNode(path, stat, options))
      )
    ),
    Stream.unwrap
  )

/** @internal */
export const layer = Layer.effect(
  FileSystem.watch,
  Effect.map(
    Effect.serviceOption(FileSystem.WatchBackend),
    (backend): FileSystem.Shape["watch"] => (path, options) => watch(backend, path, options)
  )
)
