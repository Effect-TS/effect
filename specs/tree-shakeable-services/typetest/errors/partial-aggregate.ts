// Merging some of the operation layers is not a Layer<FileSystem>: the error names what is missing.
import * as Layer from "effect/Layer"
import type * as FileSystem from "../../src/FileSystem.ts"
import { readFile, writeFile } from "../../src/NodeFileSystem.ts"

export const partial: Layer.Layer<FileSystem.FileSystem> = Layer.mergeAll(readFile, writeFile)
