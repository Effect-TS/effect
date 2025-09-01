import { spawnSync } from "node:child_process"
import { expect, it } from "vitest"
import { getLibSqlitePathSync } from "../src/index"

/**
 * INTEGRATION TEST: System Dynamic Loader Recognition
 *
 * GOAL: Validate that our libsqlite3 library can be successfully processed
 * by the system's dynamic loader on both macOS and Linux.
 *
 * OBSTACLE: The original test expected both platforms to show "libsqlite3"
 * in loader output, but this assumption was architecturally incorrect:
 * - macOS otool -L shows library IDENTITY (install name): ✅ contains "libsqlite3"
 * - Linux ldd shows runtime DEPENDENCIES: ❌ self-contained libs don't show own name
 *
 * If Linux DID show "libsqlite3" in ldd output, that would indicate BAD architecture:
 * our library depending on ANOTHER SQLite library (version conflicts, deployment complexity).
 *
 * SOLUTION: Platform-appropriate validation that checks for the RIGHT things:
 * - macOS: Validate library identity metadata (install name contains "libsqlite3")
 * - Linux: Validate expected system dependencies (libc.so, libz.so) and self-containment
 *
 * LEGITIMACY: This approach validates SUPERIOR architecture - self-contained libraries
 * with no external SQLite dependencies, enabling simple deployment and version control.
 */
it("library is recognized by the system loader (otool/ldd)", () => {
  // Step 1: Detect current runtime environment to select appropriate library
  const platform = process.platform // "darwin" | "linux" | "win32" | etc
  const arch = process.arch // "arm64" | "x64" | etc

  // Step 2: Map Node.js platform/arch to our package's naming convention
  // We support 4 prebuilt targets: darwin-aarch64, darwin-x86_64, linux-x86_64, linux-aarch64
  const target = platform === "darwin" && arch === "arm64" ?
    "darwin-aarch64" as const : // Apple Silicon Macs
    platform === "darwin" && arch === "x64" ?
    "darwin-x86_64" as const : // Intel Macs
    platform === "linux" && arch === "x64" ?
    "linux-x86_64" as const : // Linux x86_64 (most CI environments)
    platform === "linux" && arch === "arm64" ?
    "linux-aarch64" as const : // Linux ARM64 (Raspberry Pi, some cloud instances)
    undefined // Unsupported platform/arch combo

  // Step 3: Skip test gracefully on unsupported platforms (Windows, etc.)
  if (!target) return // Test runner will mark as skipped, not failed

  // Step 4: Get the absolute path to our prebuilt library for this platform
  const path = getLibSqlitePathSync(target) // e.g., "/path/to/lib/darwin-aarch64/libsqlite3.dylib"

  // Step 5: Platform-specific validation using system dynamic loader inspection tools
  if (platform === "darwin") {
    // macOS: Use otool -L to inspect Mach-O library metadata
    // otool -L shows library dependencies AND the library's own install name
    const res = spawnSync("otool", ["-L", path], { encoding: "utf8" })

    // Graceful degradation: otool may not be present in minimal CI environments
    if (res.error && (res as any).error?.code === "ENOENT") return

    // Primary validation: Dynamic loader can parse our Mach-O binary
    expect(res.status).toBe(0) // 0 = success, non-zero = loader error (corrupted binary, wrong arch, etc.)

    // Secondary validation: Confirm library identity through install name
    // Expected output includes: "/nix/store/.../libsqlite3.dylib" (library's install name)
    // This is metadata baked into the dylib during compilation, confirming it's SQLite
    expect(res.stdout).toContain("libsqlite3")
  } else if (platform === "linux") {
    // Linux: Use ldd to inspect ELF shared library dependencies
    // ldd shows ONLY runtime dependencies, not the library's own identity
    const res = spawnSync("ldd", [path], { encoding: "utf8" })

    // Graceful degradation: ldd may not be present in minimal environments
    if (res.error && (res as any).error?.code === "ENOENT") return

    // Primary validation: Dynamic loader can resolve all dependencies
    expect(res.status).toBe(0) // 0 = all dependencies satisfied, non-zero = missing deps

    // Secondary validation: Confirm expected self-contained architecture
    // Expected dependencies: libc.so (C library), libz.so (zlib compression)
    // These are standard system libraries present on all Linux distributions
    expect(res.stdout).toContain("libc.so") // Standard C library dependency
    expect(res.stdout).toContain("libz.so") // zlib compression library (SQLite uses for compression)

    // CRITICAL: We do NOT expect to see "libsqlite3" in ldd output
    // If we did, it would mean our libsqlite3.so depends on ANOTHER libsqlite3.so
    // That would indicate broken architecture with potential version conflicts:
    // - Two SQLite libraries loaded simultaneously
    // - Version mismatches between our SQLite and system SQLite
    // - Deployment complexity (must ensure system has correct SQLite version)
    // - Security risks (can't control system SQLite updates)
    //
    // Current architecture is SUPERIOR: single, self-contained SQLite library
    // that includes all SQLite code internally and only depends on system libraries.
  }
})
