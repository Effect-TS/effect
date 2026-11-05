import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Access from "./access.ts"
import * as Chmod from "./chmod.ts"
import * as Chown from "./chown.ts"
import * as Copy from "./copy.ts"
import * as CopyFile from "./copyFile.ts"
import * as Exists from "./exists.ts"
import * as Glob from "./glob.ts"
import * as Link from "./link.ts"
import * as Lstat from "./lstat.ts"
import * as MakeDirectory from "./makeDirectory.ts"
import * as MakeTempDirectory from "./makeTempDirectory.ts"
import * as MakeTempDirectoryScoped from "./makeTempDirectoryScoped.ts"
import * as MakeTempFile from "./makeTempFile.ts"
import * as MakeTempFileScoped from "./makeTempFileScoped.ts"
import * as Open from "./open.ts"
import * as ReadDirectory from "./readDirectory.ts"
import * as ReadDirectoryEntries from "./readDirectoryEntries.ts"
import * as ReadFile from "./readFile.ts"
import * as ReadFileString from "./readFileString.ts"
import * as ReadLink from "./readLink.ts"
import * as RealPath from "./realPath.ts"
import * as Remove from "./remove.ts"
import * as Rename from "./rename.ts"
import * as Sink from "./sink.ts"
import * as Stat from "./stat.ts"
import * as Stream from "./stream.ts"
import * as Symlink from "./symlink.ts"
import * as Truncate from "./truncate.ts"
import * as Utimes from "./utimes.ts"
import * as Watch from "./watch.ts"
import * as WriteFile from "./writeFile.ts"
import * as WriteFileString from "./writeFileString.ts"

/** @internal */
export const layer: Layer.Layer<FileSystem.FileSystem> = Layer.mergeAll(
  Access.layer,
  Chmod.layer,
  Chown.layer,
  Copy.layer,
  CopyFile.layer,
  Exists.layer,
  Glob.layer,
  Link.layer,
  Lstat.layer,
  MakeDirectory.layer,
  MakeTempDirectory.layer,
  MakeTempDirectoryScoped.layer,
  MakeTempFile.layer,
  MakeTempFileScoped.layer,
  Open.layer,
  ReadDirectory.layer,
  ReadDirectoryEntries.layer,
  ReadFile.layer,
  ReadFileString.layer,
  ReadLink.layer,
  RealPath.layer,
  Remove.layer,
  Rename.layer,
  Sink.layer,
  Stat.layer,
  Stream.layer,
  Symlink.layer,
  Truncate.layer,
  Utimes.layer,
  Watch.layer,
  WriteFile.layer,
  WriteFileString.layer
)
