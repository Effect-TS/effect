/**
 * @since 1.0.0
 */
import * as ParcelWatcher from "@effect/platform-node-shared/NodeFileSystem/ParcelWatcher"
import type { WatchBackend } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<WatchBackend> = ParcelWatcher.layer
