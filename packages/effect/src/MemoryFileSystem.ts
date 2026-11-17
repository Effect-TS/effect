/**
 * Provides an in-memory FileSystem service backed by VirtualFileSystem.
 *
 * Each construction creates a fresh bounded POSIX filesystem with an empty `/tmp` directory.
 * Filesystem state belongs to VFS; this adapter translates the FileSystem contract and errors.
 *
 * @stability experimental
 * @since 4.2.0
 */
import type * as Effect from "./Effect.ts"
import type * as FileSystem from "./FileSystem.ts"
import * as internal from "./internal/memoryFileSystem.ts"
import type * as Layer from "./Layer.ts"
import type * as PlatformError from "./PlatformError.ts"
import type * as Scope from "./Scope.ts"

/**
 * Creates an isolated in-memory filesystem whose caller is released with the current scope.
 *
 * **Gotchas**
 *
 * Keep the acquisition scope open while using the service. Open files and watches have their own acquisition scopes.
 *
 * @see {@link layer}
 * @stability experimental
 * @category constructors
 * @since 4.2.0
 */
export const make: Effect.Effect<FileSystem.FileSystem, never, Scope.Scope> = internal.make

/**
 * Provides a fresh in-memory FileSystem service for the layer's lifetime.
 *
 * **Gotchas**
 *
 * Reusing this layer in one layer graph shares a filesystem through memoization. Use `Layer.fresh` for separate volumes.
 *
 * @see {@link make}
 * @stability experimental
 * @category layers
 * @since 4.2.0
 */
export const layer: Layer.Layer<FileSystem.FileSystem> = internal.layer

/**
 * Returns whether a watch failed because its bounded event queue lost changes.
 *
 * **Details**
 *
 * Open a new watch before rescanning the watched path. Repeat recovery if the new subscription also overflows.
 *
 * @stability experimental
 * @category guards
 * @since 4.2.0
 */
export const isWatchOverflow: (error: PlatformError.PlatformError) => boolean = internal.isWatchOverflow
