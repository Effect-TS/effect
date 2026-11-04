/**
 * Every operation of the Node file system in one layer.
 *
 * This is the coarse-grained form: providing it is the same as providing a
 * record service today, and it bundles every implementation. A program that
 * only needs two operations provides those two layers instead.
 *
 * The annotation is the point: merging the thirty operation layers is a
 * `Layer<FileSystem>`, the type a record provider has, because the identity
 * of the record service is the union of its operations' keys. No helper is
 * needed to go from the per-operation form to the whole-service form.
 */
import * as Layer from "effect/Layer"
import type * as FileSystem from "../FileSystem.ts"
import { access } from "./access.ts"
import { chmod } from "./chmod.ts"
import { chown } from "./chown.ts"
import { copy } from "./copy.ts"
import { copyFile } from "./copyFile.ts"
import { exists } from "./exists.ts"
import { glob } from "./glob.ts"
import { link } from "./link.ts"
import { lstat } from "./lstat.ts"
import { makeDirectory } from "./makeDirectory.ts"
import { makeTempDirectory } from "./makeTempDirectory.ts"
import { makeTempDirectoryScoped } from "./makeTempDirectoryScoped.ts"
import { makeTempFile } from "./makeTempFile.ts"
import { makeTempFileScoped } from "./makeTempFileScoped.ts"
import { readDirectory } from "./readDirectory.ts"
import { readDirectoryEntries } from "./readDirectoryEntries.ts"
import { readFile } from "./readFile.ts"
import { readFileString } from "./readFileString.ts"
import { readLink } from "./readLink.ts"
import { realPath } from "./realPath.ts"
import { remove } from "./remove.ts"
import { rename } from "./rename.ts"
import { stat } from "./stat.ts"
import { stream } from "./stream.ts"
import { symlink } from "./symlink.ts"
import { truncate } from "./truncate.ts"
import { utimes } from "./utimes.ts"
import { watch } from "./watch.ts"
import { writeFile } from "./writeFile.ts"
import { writeFileString } from "./writeFileString.ts"

export const layer: Layer.Layer<FileSystem.FileSystem> = Layer.mergeAll(
  access,
  chmod,
  chown,
  copy,
  copyFile,
  exists,
  glob,
  link,
  lstat,
  makeDirectory,
  makeTempDirectory,
  makeTempDirectoryScoped,
  makeTempFile,
  makeTempFileScoped,
  readDirectory,
  readDirectoryEntries,
  readFile,
  readFileString,
  readLink,
  realPath,
  remove,
  rename,
  stat,
  stream,
  symlink,
  truncate,
  utimes,
  watch,
  writeFile,
  writeFileString
)
