/**
 * Platform detection and mapping utilities for @effect-native/libcrsql.
 * @since 0.16.300
 */
// Platform detection and mapping

/**
 * Supported platform-arch identifiers.
 * @since 0.16.300
 */
export type Platform =
  | "darwin-aarch64"
  | "darwin-x86_64"
  | "linux-aarch64"
  | "linux-x86_64"
  | "win-x86_64"
  | "win-i686"

/**
 * List of supported platforms.
 * @since 0.16.300
 */
export const SUPPORTED_PLATFORMS: ReadonlyArray<Platform> = [
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-aarch64",
  "linux-x86_64",
  "win-x86_64",
  "win-i686"
] as const

/**
 * True if the given string is a supported platform.
 * @since 0.16.300
 */
export const isSupportedPlatform = (p: string): p is Platform =>
  (SUPPORTED_PLATFORMS as ReadonlyArray<string>).includes(p)

/**
 * Detect current platform string.
 * @since 0.16.300
 */
export const detectPlatform = (): string => {
  const platform = process.platform
  const arch = process.arch
  // Map Node.js platform/arch to our strings
  if (platform === "darwin" && arch === "arm64") return "darwin-aarch64"
  if (platform === "darwin" && arch === "x64") return "darwin-x86_64"
  if (platform === "linux" && arch === "arm64") return "linux-aarch64"
  if (platform === "linux" && arch === "x64") return "linux-x86_64"
  if (platform === "win32" && arch === "x64") return "win-x86_64"
  if (platform === "win32" && arch === "ia32") return "win-i686"
  return `${platform}-${arch}`
}

/**
 * Build relative path to the cr-sqlite binary within the package.
 * @since 0.16.300
 */
export const buildRelativeLibraryPath = (platform: Platform): string => {
  switch (platform) {
    case "darwin-aarch64":
    case "darwin-x86_64":
      return `lib/${platform}/libcrsqlite.dylib`
    case "linux-aarch64":
    case "linux-x86_64":
      return `lib/${platform}/libcrsqlite.so`
    case "win-x86_64":
    case "win-i686":
      return `lib/${platform}/crsqlite.dll`
  }
  // Exhaustiveness note: if a new Platform variant is added, TypeScript will error
  // unless it is handled above. This fallback exists only for type safety.
  return platform satisfies never
}
