---
"@effect/sql-sqlite-node": minor
---

Upgrade better-sqlite3 to ^13.0.3, removing its deprecated prebuild-install dependency. This requires Node.js 22 or later; Node.js 20 is no longer supported.

Prebuilt binaries are now bundled for Linux (glibc and musl), macOS, and Windows, each on x64 and arm64. Installation no longer automatically falls back to building from source on unsupported platforms (for example, Linux armv7 or FreeBSD).
