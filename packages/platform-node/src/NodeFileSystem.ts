/**
 * @since 1.0.0
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<FileSystem> = NodeFileSystem.layer
