// A subset record is satisfied by the full record, not the other way round: a Layer<ReadOnly> does not provide
// FileSystem, and the error names the first member it lacks.
import type * as Layer from "effect/Layer"
import type * as FileSystem from "../../src/FileSystem.ts"

declare const readOnly: Layer.Layer<FileSystem.ReadOnly>
export const notFull: Layer.Layer<FileSystem.FileSystem> = readOnly
