import { spawnSync } from "node:child_process"
import { expect, it } from "vitest"
import { getLibSqlitePathSync } from "../src/index"

it("library is recognized by the system loader (otool/ldd)", () => {
  const platform = process.platform
  const arch = process.arch
  const target = platform === "darwin" && arch === "arm64" ?
    "darwin-aarch64" as const :
    platform === "darwin" && arch === "x64" ?
    "darwin-x86_64" as const :
    platform === "linux" && arch === "x64" ?
    "linux-x86_64" as const :
    platform === "linux" && arch === "arm64" ?
    "linux-aarch64" as const :
    undefined

  if (!target) return // unsupported test host

  const path = getLibSqlitePathSync(target)
  if (platform === "darwin") {
    const res = spawnSync("otool", ["-L", path], { encoding: "utf8" })
    // otool may not be present in all CI envs; skip if missing
    if (res.error && (res as any).error?.code === "ENOENT") return
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("libsqlite3")
  } else if (platform === "linux") {
    const res = spawnSync("ldd", [path], { encoding: "utf8" })
    if (res.error && (res as any).error?.code === "ENOENT") return
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("libsqlite3")
  }
})
