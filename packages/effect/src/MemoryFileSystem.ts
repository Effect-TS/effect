/**
 * In-memory implementation of Effect's `FileSystem` service.
 *
 * This module provides an isolated virtual POSIX filesystem for tests and
 * programs that need filesystem behavior without host filesystem I/O. It
 * supports files, directories, links, descriptors, temporary resources, globbing,
 * and file watching through the standard `FileSystem` service.
 *
 * @since 4.0.0
 */
import type * as Effect from "./Effect.ts"
import type * as FileSystem from "./FileSystem.ts"
import * as internal from "./internal/memoryFileSystem.ts"
import type * as Layer from "./Layer.ts"

/**
 * Creates a `FileSystem` service backed by a fresh in-memory volume.
 *
 * **When to use**
 *
 * Use when you need to construct and provide an isolated filesystem explicitly.
 *
 * @see {@link layer} for providing the service as a Layer.
 * @category constructors
 * @since 4.0.0
 */
export const make: Effect.Effect<FileSystem.FileSystem> = internal.make

/**
 * Provides an isolated in-memory implementation of `FileSystem.FileSystem`.
 *
 * **When to use**
 *
 * Use when you need an in-memory filesystem as a dependency for a test or program.
 *
 * **Gotchas**
 *
 * Reusing this layer value shares one volume through layer memoization. Construct
 * a new layer or make the layer fresh when each consumer needs an isolated volume.
 *
 * @see {@link make} for constructing the service directly.
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<FileSystem.FileSystem> = internal.layer
