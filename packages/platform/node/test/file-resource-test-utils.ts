import { assert } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"

const [major, minor] = process.versions.node.split(".").map(Number)
export const resourceTestsSupported = process.versions.bun === undefined && process.versions.deno === undefined &&
  (process.platform === "linux" || process.platform === "darwin") &&
  (major >= 24 || (major === 22 && minor >= 18))

export const testFileResources = async (mode: "head" | "disconnect", context: { skip: (reason: string) => void }) => {
  const probe = spawnSync("bash", ["-c", "ulimit -n 128"], { timeout: 5_000 })
  if (probe.error || probe.status !== 0) {
    context.skip("bash and a 128-descriptor limit are required")
    return
  }
  const root = await mkdtemp(Path.join(tmpdir(), "effect-node-file-resources-"))
  try {
    await writeFile(Path.join(root, "large.bin"), new Uint8Array(8 * 1024 * 1024).fill(97))
    const child = spawnSync("bash", [
      "-c",
      "ulimit -n 128 && exec \"$@\"",
      "node-file-resources",
      process.execPath,
      fileURLToPath(new URL("./fixtures/node-file-resources.ts", import.meta.url)),
      root,
      mode
    ], { encoding: "utf8", timeout: 20_000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 })
    // exec removes the intermediate shell; spawnSync waits for child exit even
    // after a timeout kill, before the temporary file is removed.
    assert.ifError(child.error)
    assert.strictEqual(child.signal, null, child.stderr)
    assert.strictEqual(child.status, 0, child.stderr)
    assert.strictEqual(child.stdout.trim(), "completed 256 requests")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
