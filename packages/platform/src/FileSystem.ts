/**
 * @since 1.0.0
 */
import * as Brand from "effect/Brand"
import type { Tag } from "effect/Context"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Option } from "effect/Option"
import type { Scope } from "effect/Scope"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type { PlatformError } from "./Error.js"
import * as internal from "./internal/fileSystem.js"

/**
 * @since 1.0.0
 * @category model
 */
export interface FileSystem {
  /**
   * Check if a file can be accessed.
   * You can optionally specify the level of access to check for.
   */
  readonly access: (
    path: string,
    options?: AccessFileOptions
  ) => Effect.Effect<void, PlatformError>
  /**
   * Copy a file or directory from `fromPath` to `toPath`.
   *
   * Equivalent to `cp -r`.
   */
  readonly copy: (
    fromPath: string,
    toPath: string,
    options?: CopyOptions
  ) => Effect.Effect<void, PlatformError>
  /**
   * Copy a file from `fromPath` to `toPath`.
   */
  readonly copyFile: (
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, PlatformError>
  /**
   * Change the permissions of a file.
   */
  readonly chmod: (
    path: string,
    mode: number
  ) => Effect.Effect<void, PlatformError>
  /**
   * Change the owner and group of a file.
   */
  readonly chown: (
    path: string,
    uid: number,
    gid: number
  ) => Effect.Effect<void, PlatformError>
  /**
   * Check if a path exists.
   */
  readonly exists: (
    path: string
  ) => Effect.Effect<boolean, PlatformError>
  /**
   * Create a hard link from `fromPath` to `toPath`.
   */
  readonly link: (
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, PlatformError>
  /**
   * Create a directory at `path`. You can optionally specify the mode and
   * whether to recursively create nested directories.
   */
  readonly makeDirectory: (
    path: string,
    options?: MakeDirectoryOptions
  ) => Effect.Effect<void, PlatformError>
  /**
   * Create a temporary directory.
   *
   * By default the directory will be created inside the system's default
   * temporary directory, but you can specify a different location by setting
   * the `directory` option.
   *
   * You can also specify a prefix for the directory name by setting the
   * `prefix` option.
   */
  readonly makeTempDirectory: (
    options?: MakeTempDirectoryOptions
  ) => Effect.Effect<string, PlatformError>
  /**
   * Create a temporary directory inside a scope.
   *
   * Functionally equivalent to `makeTempDirectory`, but the directory will be
   * automatically deleted when the scope is closed.
   */
  readonly makeTempDirectoryScoped: (
    options?: MakeTempDirectoryOptions
  ) => Effect.Effect<string, PlatformError, Scope>
  /**
   * Create a temporary file.
   * The directory creation is functionally equivalent to `makeTempDirectory`.
   * The file name will be a randomly generated string.
   */
  readonly makeTempFile: (
    options?: MakeTempFileOptions
  ) => Effect.Effect<string, PlatformError>
  /**
   * Create a temporary file inside a scope.
   *
   * Functionally equivalent to `makeTempFile`, but the file will be
   * automatically deleted when the scope is closed.
   */
  readonly makeTempFileScoped: (
    options?: MakeTempFileOptions
  ) => Effect.Effect<string, PlatformError, Scope>
  /**
   * Open a file at `path` with the specified `options`.
   *
   * The file handle will be automatically closed when the scope is closed.
   */
  readonly open: (
    path: string,
    options?: OpenFileOptions
  ) => Effect.Effect<File, PlatformError, Scope>
  /**
   * List the contents of a directory.
   *
   * You can recursively list the contents of nested directories by setting the
   * `recursive` option.
   */
  readonly readDirectory: (
    path: string,
    options?: ReadDirectoryOptions
  ) => Effect.Effect<Array<string>, PlatformError>
  /**
   * Read the contents of a file.
   */
  readonly readFile: (
    path: string
  ) => Effect.Effect<Uint8Array, PlatformError>
  /**
   * Read the contents of a file.
   */
  readonly readFileString: (
    path: string,
    encoding?: string
  ) => Effect.Effect<string, PlatformError>
  /**
   * Read the destination of a symbolic link.
   */
  readonly readLink: (
    path: string
  ) => Effect.Effect<string, PlatformError>
  /**
   * Resolve a path to its canonicalized absolute pathname.
   */
  readonly realPath: (
    path: string
  ) => Effect.Effect<string, PlatformError>
  /**
   * Remove a file or directory.
   */
  readonly remove: (
    path: string,
    options?: RemoveOptions
  ) => Effect.Effect<void, PlatformError>
  /**
   * Rename a file or directory.
   */
  readonly rename: (
    oldPath: string,
    newPath: string
  ) => Effect.Effect<void, PlatformError>
  /**
   * Create a writable `Sink` for the specified `path`.
   */
  readonly sink: (
    path: string,
    options?: SinkOptions
  ) => Sink<void, Uint8Array, never, PlatformError>
  /**
   * Get information about a file at `path`.
   */
  readonly stat: (
    path: string
  ) => Effect.Effect<File.Info, PlatformError>
  /**
   * Create a readable `Stream` for the specified `path`.
   *
   * Changing the `bufferSize` option will change the internal buffer size of
   * the stream. It defaults to `4`.
   *
   * The `chunkSize` option will change the size of the chunks emitted by the
   * stream. It defaults to 64kb.
   *
   * Changing `offset` and `bytesToRead` will change the offset and the number
   * of bytes to read from the file.
   */
  readonly stream: (
    path: string,
    options?: StreamOptions
  ) => Stream<Uint8Array, PlatformError>
  /**
   * Create a symbolic link from `fromPath` to `toPath`.
   */
  readonly symlink: (
    fromPath: string,
    toPath: string
  ) => Effect.Effect<void, PlatformError>
  /**
   * Truncate a file to a specified length. If the `length` is not specified,
   * the file will be truncated to length `0`.
   */
  readonly truncate: (
    path: string,
    length?: SizeInput
  ) => Effect.Effect<void, PlatformError>
  /**
   * Change the file system timestamps of the file at `path`.
   */
  readonly utimes: (
    path: string,
    atime: Date | number,
    mtime: Date | number
  ) => Effect.Effect<void, PlatformError>
  /**
   * Watch a directory or file for changes.
   *
   * By default, only changes to the direct children of the directory are reported.
   * Set the `recursive` option to `true` to watch for changes in subdirectories as well.
   *
   * Note: The `recursive` option behavior depends on the backend implementation:
   * - When using the default Node.js `fs.watch()` backend: The `recursive`
   *   option is supported on all platforms (Node.js v20+).
   * - When using `@parcel/watcher` (via `NodeFileSystem/ParcelWatcher` layer):
   *   Watching is always recursive on all platforms. This option is ignored.
   */
  readonly watch: (path: string, options?: WatchOptions) => Stream<WatchEvent, PlatformError>
  /**
   * Write data to a file at `path`.
   */
  readonly writeFile: (
    path: string,
    data: Uint8Array,
    options?: WriteFileOptions
  ) => Effect.Effect<void, PlatformError>
  /**
   * Write a string to a file at `path`.
   */
  readonly writeFileString: (
    path: string,
    data: string,
    options?: WriteFileStringOptions
  ) => Effect.Effect<void, PlatformError>
}

/**
 * Represents a size in bytes.
 *
 * @since 1.0.0
 * @category sizes
 */
export type Size = Brand.Branded<bigint, "Size">

/**
 * Represents a size in bytes.
 *
 * @since 1.0.0
 * @category sizes
 */
export type SizeInput = bigint | number | Size

/**
 * @since 1.0.0
 * @category sizes
 */
export const Size: (bytes: SizeInput) => Size = internal.Size

/**
 * @since 1.0.0
 * @category sizes
 */
export const KiB: (n: number) => Size = internal.KiB

/**
 * @since 1.0.0
 * @category sizes
 */
export const MiB: (n: number) => Size = internal.MiB

/**
 * @since 1.0.0
 * @category sizes
 */
export const GiB: (n: number) => Size = internal.GiB

/**
 * @since 1.0.0
 * @category sizes
 */
export const TiB: (n: number) => Size = internal.TiB

/**
 * @since 1.0.0
 * @category sizes
 */
export const PiB: (n: number) => Size = internal.PiB

/**
 * @since 1.0.0
 * @category model
 */
export type OpenFlag =
  | "r"
  | "r+"
  | "w"
  | "wx"
  | "w+"
  | "wx+"
  | "a"
  | "ax"
  | "a+"
  | "ax+"

/**
 * @since 1.0.0
 * @category options
 */
export interface AccessFileOptions {
  readonly ok?: boolean
  readonly readable?: boolean
  readonly writable?: boolean
}

/**
 * @since 1.0.0
 * @category options
 */
export interface MakeDirectoryOptions {
  readonly recursive?: boolean
  readonly mode?: number
}

/**
 * @since 1.0.0
 * @category options
 */
export interface CopyOptions {
  readonly overwrite?: boolean
  readonly preserveTimestamps?: boolean
}

/**
 * @since 1.0.0
 * @category options
 */
export interface MakeTempDirectoryOptions {
  readonly directory?: string
  readonly prefix?: string
}

/**
 * @since 1.0.0
 * @category options
 */
export interface MakeTempFileOptions {
  readonly directory?: string
  readonly prefix?: string
  readonly suffix?: string
}

/**
 * @since 1.0.0
 * @category options
 */
export interface OpenFileOptions {
  readonly flag?: OpenFlag
  readonly mode?: number
}

/**
 * @since 1.0.0
 * @category options
 */
export interface ReadDirectoryOptions {
  readonly recursive?: boolean
}

/**
 * @since 1.0.0
 * @category options
 */
export interface RemoveOptions {
  /**
   * When `true`, you can recursively remove nested directories.
   */
  readonly recursive?: boolean
  /**
   * When `true`, exceptions will be ignored if `path` does not exist.
   */
  readonly force?: boolean
}

/**
 * @since 1.0.0
 * @category options
 */
export interface SinkOptions extends OpenFileOptions {}

/**
 * @since 1.0.0
 * @category options
 */
export interface StreamOptions {
  readonly bufferSize?: number
  readonly bytesToRead?: SizeInput
  readonly chunkSize?: SizeInput
  readonly offset?: SizeInput
}

/**
 * @since 1.0.0
 * @category options
 */
export interface WriteFileOptions {
  readonly flag?: OpenFlag
  readonly mode?: number
}

/**
 * @since 1.0.0
 * @category options
 */
export interface WriteFileStringOptions {
  readonly flag?: OpenFlag
  readonly mode?: number
}

/**
 * @since 1.0.0
 * @category options
 */
export interface WatchOptions {
  /**
   * When `true`, the watcher will also watch for changes in subdirectories.
   */
  readonly recursive?: boolean
}

/**
 * @since 1.0.0
 * @category tag
 */
export const FileSystem: Tag<FileSystem, FileSystem> = internal.tag

/**
 * @since 1.0.0
 * @category constructor
 */
export const make: (
  impl: Omit<FileSystem, "exists" | "readFileString" | "stream" | "sink" | "writeFileString">
) => FileSystem = internal.make

/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category constructor
 */
export const makeNoop: (fileSystem: Partial<FileSystem>) => FileSystem = internal.makeNoop

/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: (fileSystem: Partial<FileSystem>) => Layer<FileSystem> = internal.layerNoop

/**
 * @since 1.0.0
 * @category type id
 */
export const FileTypeId: unique symbol = Symbol.for(
  "@effect/platform/FileSystem/File"
)

/**
 * @since 1.0.0
 * @category type id
 */
export type FileTypeId = typeof FileTypeId

/**
 * @since 1.0.0
 * @category guard
 */
export const isFile = (u: unknown): u is File => typeof u === "object" && u !== null && FileTypeId in u

/**
 * @since 1.0.0
 * @category model
 */
export interface File {
  readonly [FileTypeId]: FileTypeId
  readonly fd: File.Descriptor
  readonly stat: Effect.Effect<File.Info, PlatformError>
  readonly seek: (offset: SizeInput, from: SeekMode) => Effect.Effect<void>
  readonly sync: Effect.Effect<void, PlatformError>
  readonly read: (buffer: Uint8Array) => Effect.Effect<Size, PlatformError>
  readonly readAlloc: (size: SizeInput) => Effect.Effect<Option<Uint8Array>, PlatformError>
  readonly truncate: (length?: SizeInput) => Effect.Effect<void, PlatformError>
  readonly write: (buffer: Uint8Array) => Effect.Effect<Size, PlatformError>
  readonly writeAll: (buffer: Uint8Array) => Effect.Effect<void, PlatformError>
}

/**
 * @since 1.0.0
 */
export declare namespace File {
  /**
   * @since 1.0.0
   * @category model
   */
  export type Descriptor = Brand.Branded<number, "FileDescriptor">

  /**
   * @since 1.0.0
   * @category model
   */
  export type Type =
    | "File"
    | "Directory"
    | "SymbolicLink"
    | "BlockDevice"
    | "CharacterDevice"
    | "FIFO"
    | "Socket"
    | "Unknown"

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Info {
    readonly type: Type
    readonly mtime: Option<Date>
    readonly atime: Option<Date>
    readonly birthtime: Option<Date>
    readonly dev: number
    readonly ino: Option<number>
    readonly mode: number
    readonly nlink: Option<number>
    readonly uid: Option<number>
    readonly gid: Option<number>
    readonly rdev: Option<number>
    readonly size: Size
    readonly blksize: Option<Size>
    readonly blocks: Option<number>
  }
}

/**
 * @since 1.0.0
 * @category constructor
 */
export const FileDescriptor = Brand.nominal<File.Descriptor>()

/**
 * @since 1.0.0
 * @category model
 */
export type SeekMode = "start" | "current"

/**
 * @since 1.0.0
 * @category model
 */
export type WatchEvent = WatchEvent.Create | WatchEvent.Update | WatchEvent.Remove

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace WatchEvent {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Create {
    readonly _tag: "Create"
    readonly path: string
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Update {
    readonly _tag: "Update"
    readonly path: string
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Remove {
    readonly _tag: "Remove"
    readonly path: string
  }
}

/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventCreate: Data.Case.Constructor<WatchEvent.Create, "_tag"> = Data.tagged<WatchEvent.Create>(
  "Create"
)

/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventUpdate: Data.Case.Constructor<WatchEvent.Update, "_tag"> = Data.tagged<WatchEvent.Update>(
  "Update"
)

/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventRemove: Data.Case.Constructor<WatchEvent.Remove, "_tag"> = Data.tagged<WatchEvent.Remove>(
  "Remove"
)

/**
 * @since 1.0.0
 * @category file watcher
 */
export class WatchBackend extends Context.Tag("@effect/platform/FileSystem/WatchBackend")<
  WatchBackend,
  {
    readonly register: (
      path: string,
      stat: File.Info,
      options?: WatchOptions
    ) => Option<Stream<WatchEvent, PlatformError>>
  }
>() {
}
