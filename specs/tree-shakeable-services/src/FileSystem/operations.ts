/**
 * The operations of the file system contract, one per export and nothing
 * else: the module `FileSystem.ts` imports as a namespace to get the member
 * list of its record service, so the list is never written by hand.
 *
 * Each operation takes its shape from one member of `Shape`, declared once in
 * `./Shape.ts`, and its key is the one call argument. Operations returning a
 * Stream are defined with `Stream.Operation`; the rest with `Context.Operation`.
 * There are no purity annotations in this file; the bundle check measures what
 * that costs (nothing a program notices) and what annotations, or the
 * published build's `annotate-pure-calls` pass, recover.
 */
import * as Context from "effect/Context"
import * as Stream from "effect/Stream"
import type { Shape } from "./Shape.ts"

export const access = Context.Operation<Shape["access"]>()("effect/FileSystem/access")

export const chmod = Context.Operation<Shape["chmod"]>()("effect/FileSystem/chmod")

export const chown = Context.Operation<Shape["chown"]>()("effect/FileSystem/chown")

export const copy = Context.Operation<Shape["copy"]>()("effect/FileSystem/copy")

export const copyFile = Context.Operation<Shape["copyFile"]>()("effect/FileSystem/copyFile")

export const exists = Context.Operation<Shape["exists"]>()("effect/FileSystem/exists")

export const glob = Stream.Operation<Shape["glob"]>()("effect/FileSystem/glob")

export const link = Context.Operation<Shape["link"]>()("effect/FileSystem/link")

export const lstat = Context.Operation<Shape["lstat"]>()("effect/FileSystem/lstat")

export const makeDirectory = Context.Operation<Shape["makeDirectory"]>()("effect/FileSystem/makeDirectory")

export const makeTempDirectory = Context.Operation<Shape["makeTempDirectory"]>()("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped = Context.Operation<Shape["makeTempDirectoryScoped"]>()(
  "effect/FileSystem/makeTempDirectoryScoped"
)

export const makeTempFile = Context.Operation<Shape["makeTempFile"]>()("effect/FileSystem/makeTempFile")

export const makeTempFileScoped = Context.Operation<Shape["makeTempFileScoped"]>()(
  "effect/FileSystem/makeTempFileScoped"
)

export const readDirectory = Context.Operation<Shape["readDirectory"]>()("effect/FileSystem/readDirectory")

export const readDirectoryEntries = Context.Operation<Shape["readDirectoryEntries"]>()(
  "effect/FileSystem/readDirectoryEntries"
)

export const readFile = Context.Operation<Shape["readFile"]>()("effect/FileSystem/readFile")

export const readFileString = Context.Operation<Shape["readFileString"]>()("effect/FileSystem/readFileString")

export const readLink = Context.Operation<Shape["readLink"]>()("effect/FileSystem/readLink")

export const realPath = Context.Operation<Shape["realPath"]>()("effect/FileSystem/realPath")

export const remove = Context.Operation<Shape["remove"]>()("effect/FileSystem/remove")

export const rename = Context.Operation<Shape["rename"]>()("effect/FileSystem/rename")

export const stat = Context.Operation<Shape["stat"]>()("effect/FileSystem/stat")

export const stream = Stream.Operation<Shape["stream"]>()("effect/FileSystem/stream")

export const symlink = Context.Operation<Shape["symlink"]>()("effect/FileSystem/symlink")

export const truncate = Context.Operation<Shape["truncate"]>()("effect/FileSystem/truncate")

export const utimes = Context.Operation<Shape["utimes"]>()("effect/FileSystem/utimes")

export const watch = Stream.Operation<Shape["watch"]>()("effect/FileSystem/watch")

export const writeFile = Context.Operation<Shape["writeFile"]>()("effect/FileSystem/writeFile")

export const writeFileString = Context.Operation<Shape["writeFileString"]>()("effect/FileSystem/writeFileString")
