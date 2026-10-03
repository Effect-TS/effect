import { assert, describe, it } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as NodePath from "node:path"
import { fileURLToPath } from "node:url"

const [major, minor] = process.versions.node.split(".").map(Number)
const supported = process.versions.bun === undefined && process.versions.deno === undefined &&
  (process.platform === "linux" || process.platform === "darwin") &&
  (major >= 24 || (major === 22 && minor >= 18))
const fixture = fileURLToPath(new URL("./fixtures/if-range-resources.ts", import.meta.url))

describe("HttpStaticServer resource lifetime", () => {
  for (const range of ["bytes=0-3", "bytes=100-200"]) {
    it.skipIf(!supported)(
      `keeps serving requests after repeated matching If-Range with ${range}`,
      async (context) => {
        // Lower only the child limit, never the test runner limit. A failed probe
        // means this environment cannot provide the isolation this test needs.
        const probe = spawnSync("bash", ["-c", "ulimit -n 128"], { timeout: 5_000 })
        if (probe.error || probe.status !== 0) {
          context.skip("bash and a 128-descriptor limit are required")
          return
        }
        const root = await mkdtemp(NodePath.join(tmpdir(), "effect-if-range-resources-"))
        try {
          await writeFile(NodePath.join(root, "range.txt"), "0123456789abcdef")
          // Ordinary Range is the control: the same workload must fit the budget
          // before testing the matching If-Range path in a fresh process.
          for (const mode of ["ordinary", "if-range"]) {
            const child = spawnSync(
              "bash",
              [
                "-c",
                "ulimit -n 128 && exec \"$@\"",
                "if-range-resources",
                process.execPath,
                fixture,
                root,
                range,
                mode
              ],
              { encoding: "utf8", timeout: 20_000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 }
            )
            // spawnSync waits for exit, including after a timeout kill. exec leaves
            // no intermediate shell or descendant to outlive the test.
            assert.ifError(child.error)
            assert.strictEqual(child.signal, null, child.stderr)
            assert.strictEqual(child.status, 0, child.stderr)
            assert.strictEqual(child.stdout.trim(), "completed 256 requests")
          }
        } finally {
          await rm(root, { recursive: true, force: true })
        }
      },
      50_000
    )
  }
})
