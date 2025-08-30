/**
 * Absolute paths per-platform. These are computed from this module location
 * using Node built-ins only (no external dependencies, no I/O).
 *
 * @since 0.16.300
 */
import { fileURLToPath } from "node:url"

/**
 * Absolute path to darwin-aarch64 cr-sqlite dylib.
 * @since 0.16.300
 */
export const darwin_aarch64 = fileURLToPath(new URL("../lib/darwin-aarch64/libcrsqlite.dylib", import.meta.url))
/**
 * Absolute path to darwin-x86_64 cr-sqlite dylib.
 * @since 0.16.300
 */
export const darwin_x86_64 = fileURLToPath(new URL("../lib/darwin-x86_64/libcrsqlite.dylib", import.meta.url))
/**
 * Absolute path to linux-aarch64 cr-sqlite so.
 * @since 0.16.300
 */
export const linux_aarch64 = fileURLToPath(new URL("../lib/linux-aarch64/libcrsqlite.so", import.meta.url))
/**
 * Absolute path to linux-x86_64 cr-sqlite so.
 * @since 0.16.300
 */
export const linux_x86_64 = fileURLToPath(new URL("../lib/linux-x86_64/libcrsqlite.so", import.meta.url))
/**
 * Absolute path to win-x86_64 cr-sqlite dll.
 * @since 0.16.300
 */
export const win_x86_64 = fileURLToPath(new URL("../lib/win-x86_64/crsqlite.dll", import.meta.url))
/**
 * Absolute path to win-i686 cr-sqlite dll.
 * @since 0.16.300
 */
export const win_i686 = fileURLToPath(new URL("../lib/win-i686/crsqlite.dll", import.meta.url))

/**
 * Map of platform name to absolute path.
 * @since 0.16.300
 */
export type Paths = {
  readonly [K in "darwin_aarch64" | "darwin_x86_64" | "linux_aarch64" | "linux_x86_64" | "win_x86_64" | "win_i686"]:
    string
}
