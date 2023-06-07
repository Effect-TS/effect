/**
 * @since 1.0.0
 */
import * as Brand from "@effect/data/Brand"
import type { Option } from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type { PlatformError } from "@effect/platform/Error"
import type { Size } from "@effect/platform/FileSystem"

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
  readonly stat: Effect.Effect<never, PlatformError, File.Info>
  readonly read: (
    buffer: Uint8Array,
    options?: FileReadOptions
  ) => Effect.Effect<never, PlatformError, Size>
  readonly readAlloc: (
    size: Size,
    options?: FileReadOptions
  ) => Effect.Effect<never, PlatformError, Option<Uint8Array>>
  readonly truncate: (
    length?: Size
  ) => Effect.Effect<never, PlatformError, void>
  readonly write: (
    buffer: Uint8Array
  ) => Effect.Effect<never, PlatformError, Size>
  readonly writeAll: (
    buffer: Uint8Array
  ) => Effect.Effect<never, PlatformError, void>
}

/**
 * @since 1.0.0
 * @category constructor
 */
export const make = (impl: Omit<File, FileTypeId>): File => ({
  [FileTypeId]: FileTypeId,
  ...impl
})

/**
 * @since 1.0.0
 */
export namespace File {
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
export const Descriptor = Brand.nominal<File.Descriptor>()

/**
 * @since 1.0.0
 * @category model
 */
export interface FileReadOptions {
  readonly offset?: Size
  readonly length?: Size
}
