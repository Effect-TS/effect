/**
 * Build contexts: the tar that `DockerImages.build` and `buildStream` send,
 * made from a directory as `docker build <directory>` makes it.
 *
 * {@link DockerBuildContext} reads the directory through the `FileSystem` and
 * `Path` its {@link layer} is built with; `NodeDocker` provides it on Node.js.
 * A build that already has its tar, or builds from a URL, doesn't need it.
 *
 * **Example** (Building a directory)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerBuildContext, DockerImages } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const contexts = yield* DockerBuildContext.DockerBuildContext
 *   const images = yield* DockerImages.DockerImages
 *   const dockerfile = "docker/app.Dockerfile"
 *   const context = yield* contexts.fromDirectory("./app", { dockerfile })
 *   const { id } = yield* images.build(context, { dockerfile, tags: ["my-app:dev"] })
 *   return id
 * })
 * ```
 *
 * @stability unstable
 * @since 4.2.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Tar from "../encoding/Tar.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Glob from "../Glob.ts"
import * as IgnoreFile from "../IgnoreFile.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Path from "../Path.ts"
import * as PathFilter from "../PathFilter.ts"
import type * as PlatformError from "../PlatformError.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as Stream from "../Stream.ts"
import { DockerError, InvalidBuildContext, isDockerError } from "./DockerError.ts"

/**
 * Makes build contexts from directories.
 *
 * @stability unstable
 * @category services
 * @since 4.2.0
 */
export class DockerBuildContext extends Context.Service<DockerBuildContext, {
  /**
   * Makes a directory a build context, as `docker build <directory>` sends
   * one: the tar that `DockerImages.build` and `buildStream` take, without the
   * paths the directory's ignore file excludes.
   *
   * **Details**
   *
   * The ignore file is `<dockerfile>.dockerignore` next to the Dockerfile if
   * it exists, else `.dockerignore` at the root of the directory; it is read
   * as `IgnoreFile.dockerignore` reads it. The Dockerfile and the ignore file
   * are always sent, as the Docker CLI sends them, even when the patterns
   * exclude them. `dockerfile` is a `/`-separated path inside the directory
   * (`Dockerfile` by default, `./` and empty segments ignored); pass the same
   * one to `build`. A path outside the directory fails with
   * `InvalidBuildContext`.
   *
   * The context holds the directory's files, directories and symbolic links
   * (never followed), owned by uid and gid 0, with their permission bits and
   * mtimes; other kinds of file are left out. The Dockerfile comes first, as
   * BuildKit needs. A directory the patterns exclude gets no entry even when
   * an exception keeps paths inside it: the Engine creates it.
   *
   * The effect reads the ignore file and finds the paths, so a malformed
   * ignore file or an unreadable directory fails before anything is sent.
   * The stream reads each file as it is sent. Both fail with
   * `InvalidBuildContext`, naming the file: a file that can't be read, or
   * that changes size while it is sent, fails the stream.
   *
   * **Gotchas**
   *
   * - The Dockerfile must be inside the directory.
   * - A hard link is sent as a file of its own.
   * - The context isn't compressed; pipe it through a compressor for a
   *   remote Engine.
   */
  readonly fromDirectory: (
    directory: string,
    options?: {
      /** The Dockerfile's path inside the directory, `Dockerfile` by default. */
      readonly dockerfile?: string | undefined
    }
  ) => Effect.Effect<Stream.Stream<Uint8Array, DockerError>, DockerError>
}>()("effect/docker/DockerBuildContext") {}

/**
 * Builds the {@link DockerBuildContext} service over the `FileSystem` and
 * `Path` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.2.0
 */
export const make: Effect.Effect<DockerBuildContext["Service"], never, FileSystem.FileSystem | Path.Path> = Effect
  .gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const fromDirectory: DockerBuildContext["Service"]["fromDirectory"] = Effect.fnUntraced(
      function*(directory, options) {
        const at = (relative: string) => path.join(directory, ...relative.split("/"))
        const invalid = (file: string, issue: string, cause?: unknown) =>
          new DockerError({ reason: new InvalidBuildContext({ path: file, issue, cause }) })
        // as `fs.glob` reports paths: `/`-separated, relative, without `.` segments
        const given = options?.dockerfile ?? "Dockerfile"
        const segments = given.split("/").filter((segment) => segment !== "" && segment !== ".")
        if (given.startsWith("/") || segments.length === 0 || segments.includes("..")) {
          return yield* invalid(given, "the Dockerfile must be a /-separated path inside the directory")
        }
        const dockerfile = segments.join("/")
        const unreadable = (file: string) => (cause: PlatformError.PlatformError) => invalid(file, cause.message, cause)
        const exists = (relative: string) => fs.exists(at(relative)).pipe(Effect.mapError(unreadable(at(relative))))

        // BuildKit's choice: the Dockerfile's own ignore file, else the context's
        const ignoreFile = (yield* exists(`${dockerfile}.dockerignore`))
          ? `${dockerfile}.dockerignore`
          : (yield* exists(".dockerignore"))
          ? ".dockerignore"
          : undefined
        let filter = PathFilter.empty
        if (ignoreFile !== undefined) {
          const source = yield* fs.readFileString(at(ignoreFile)).pipe(Effect.mapError(unreadable(at(ignoreFile))))
          const parsed = IgnoreFile.dockerignore(source)
          if (Result.isFailure(parsed)) {
            const { line, message } = parsed.failure
            return yield* invalid(at(ignoreFile), `line ${line}: ${message}`, parsed.failure)
          }
          // the Docker CLI sends both even when the patterns exclude them
          filter = PathFilter.concat(
            parsed.success,
            PathFilter.make([PathFilter.include(Glob.escape(dockerfile)), PathFilter.include(Glob.escape(ignoreFile))])
          )
        }
        const paths = yield* fs.glob(filter, { root: directory }).pipe(Effect.mapError(unreadable(directory)))
        // BuildKit only recognizes a context whose first header is a plain one: the Dockerfile's
        const ordered = paths.includes(dockerfile) ? [dockerfile, ...paths.filter((p) => p !== dockerfile)] : paths

        const entry = Effect.fnUntraced(function*(relative: string) {
          const file = at(relative)
          const info = yield* fs.lstat(file).pipe(Effect.mapError(unreadable(file)))
          const entryOptions = { mode: info.mode & 0o7777, mtime: Option.getOrUndefined(info.mtime) }
          switch (info.type) {
            case "File":
              return Tar.fileStream(
                relative,
                Number(info.size),
                fs.stream(file).pipe(Stream.mapError(unreadable(file))),
                entryOptions
              )
            case "Directory":
              return Tar.directory(relative, entryOptions)
            case "SymbolicLink":
              return Tar.symlink(
                relative,
                yield* fs.readLink(file).pipe(Effect.mapError(unreadable(file))),
                entryOptions
              )
            default:
              return undefined
          }
        })
        return Stream.suspend(() => {
          // the encoder takes the next entry once the previous one is written: a Tar error is the current one's
          let current = directory
          return Stream.fromIterable(ordered).pipe(
            Stream.mapEffect((relative) => {
              current = at(relative)
              return entry(relative)
            }),
            Stream.filter(Predicate.isNotUndefined),
            Stream.pipeThroughChannel(Tar.encode()),
            Stream.mapError((error) => isDockerError(error) ? error : invalid(current, error.message, error))
          )
        })
      }
    )

    return DockerBuildContext.of({ fromDirectory })
  })

/**
 * Provides {@link DockerBuildContext} over the `FileSystem` and `Path` in
 * context, built with {@link make}.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<DockerBuildContext, never, FileSystem.FileSystem | Path.Path> = Layer.effect(
  DockerBuildContext,
  make
)
