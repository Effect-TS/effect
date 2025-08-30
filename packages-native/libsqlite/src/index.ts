/**
 * Root API: simple, zero‑deps exports for resolving the libsqlite3 path.
 * Resolves the correct `.dylib`/`.so` based on the current OS/arch.
 *
 * Notes
 * - No runtime dependencies; uses `process.platform` / `process.arch` only.
 * - Musl is not supported in v1; an informative error is thrown with guidance.
 *
 * @since 0.0.0
 */

/**
 * Supported platforms for this package.
 * @since 0.0.0
 * @category Types
 */
export type Platform = "darwin-aarch64" | "darwin-x86_64" | "linux-x86_64" | "linux-aarch64"

const paths: Record<Platform, string> = {
  "darwin-aarch64": new URL("../lib/darwin-aarch64/libsqlite3.dylib", import.meta.url).pathname,
  "darwin-x86_64": new URL("../lib/darwin-x86_64/libsqlite3.dylib", import.meta.url).pathname,
  "linux-x86_64": new URL("../lib/linux-x86_64/libsqlite3.so", import.meta.url).pathname,
  "linux-aarch64": new URL("../lib/linux-aarch64/libsqlite3.so", import.meta.url).pathname
} as const

function isMusl(): boolean {
  // Heuristic: prefer explicit glibc version from process.report; else scan sharedObjects for "musl".
  // We avoid type assertions and guard all dynamic accesses.
  try {
    const reportGetter = process.report?.getReport
    const report = typeof reportGetter === "function" ? reportGetter.call(process.report) : undefined
    let text: string | undefined
    if (typeof report === "string") {
      text = report
    } else if (report && typeof report === "object") {
      try {
        text = JSON.stringify(report)
      } catch {
        // noop
      }
    }
    if (typeof text === "string" && text.includes("musl")) return true
  } catch {
    // ignore detection errors
  }
  return false
}

function detect(): Platform {
  const p = process.platform
  const a = process.arch
  const logDebug = (message: string) => {
    if (process.env.EFFECT_NATIVE_LIBSQLITE_DEBUG) {
      console.warn(`[libsqlite] ${message}`)
    }
  }
  if (p === "darwin" && a === "arm64") return "darwin-aarch64"
  if (p === "darwin" && a === "x64") return "darwin-x86_64"
  if (p === "linux" && a === "x64") {
    if (isMusl()) {
      logDebug("musl detected on linux-x64; throwing unsupported error")
      throw new Error(
        [
          "Linux musl detected; v1 supports glibc only.",
          "If you'd like musl support, please open an issue and we'll prioritize it.",
          "We actively want to support platforms you care about."
        ].join(" ")
      )
    }
    return "linux-x86_64"
  }
  if (p === "linux" && a === "arm64") {
    if (isMusl()) {
      logDebug("musl detected on linux-arm64; throwing unsupported error")
      throw new Error(
        [
          "Linux musl detected; v1 supports glibc only.",
          "If you'd like musl support, please open an issue and we'll prioritize it.",
          "We actively want to support platforms you care about."
        ].join(" ")
      )
    }
    return "linux-aarch64"
  }
  logDebug(`unsupported platform detected: ${p}-${a}`)
  throw new Error(
    [
      `Unsupported platform: ${p}-${a}.`,
      "Supported: darwin-aarch64, darwin-x86_64, linux-x86_64 (glibc), linux-aarch64 (glibc).",
      "If you'd like support for this platform, please open an issue and we'll prioritize it.",
      "We aim to support platforms you actually use."
    ].join(" ")
  )
}

/**
 * Auto-detected absolute path to libsqlite3 for the current platform.
 * @since 0.0.0
 * @example
 * import { pathToLibSqlite } from "@effect-native/libsqlite"
 * console.log(pathToLibSqlite.includes("libsqlite3")) // true
 */
export const pathToLibSqlite: string = paths[detect()]

/**
 * Get absolute path to libsqlite3 for a specific platform.
 * @since 0.0.0
 * @example
 * import { getLibSqlitePathSync } from "@effect-native/libsqlite"
 * const p = getLibSqlitePathSync("darwin-x86_64")
 * console.log(p.endsWith("libsqlite3.dylib"))
 */
export function getLibSqlitePathSync(platform?: Platform): string {
  return platform ? paths[platform] : pathToLibSqlite
}
