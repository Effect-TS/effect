/**
 * The data types of the file system contract: its error and the values its
 * operations return. The operations are in `./operations.ts`, each with its
 * own shape, and `Shape`, the record of implementations, is derived from them
 * in `../FileSystem.ts`.
 */
import * as Data from "effect/Data"

export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  readonly operation: string
  readonly cause: unknown
}> {}

export interface Info {
  readonly type: "File" | "Directory" | "SymbolicLink" | "Other"
  readonly size: number
  readonly mtime: Date
}

export interface DirectoryEntry {
  readonly name: string
  readonly type: Info["type"]
}

export interface WatchEvent {
  readonly kind: "Create" | "Update" | "Remove"
  readonly path: string
}
