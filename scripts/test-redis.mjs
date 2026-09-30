import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

// Keep this manifest explicit: discovered unit tests must not hide an omitted
// integration suite or infrastructure-derived skip.
const suites = [
  "packages/redis/test/RedisProtocol.test.ts",
  "packages/redis/test/RedisCommand.test.ts",
  "packages/redis/test/RedisConnection.test.ts",
  "packages/redis/test/RedisClient.test.ts",
  "packages/redis/test/RedisSubscription.test.ts",
  "packages/redis/test/RedisTransaction.test.ts",
  "packages/redis/test/RedisClient.integration.test.ts",
  "packages/redis/test/RedisSubscription.integration.test.ts",
  "packages/redis/test/RedisTransaction.integration.test.ts",
  "packages/platform/node/test/NodeRedis.test.ts",
  "packages/platform/node/test/NodeRedis.integration.test.ts"
]

const directory = await mkdtemp(join(tmpdir(), "effect-redis-results-"))
const reportPath = join(directory, "results.json")
try {
  const child = spawn("pnpm", [
    "test", "--run", "--project", "@effect/redis", "--project", "@effect/platform-node",
    "--passWithNoTests=false", "--reporter=default", "--reporter=json",
    `--outputFile.json=${reportPath}`, ...suites
  ], { stdio: "inherit", env: { ...process.env, EFFECT_INTEGRATION_TESTS: "1" } })
  const status = await new Promise((accept, reject) => {
    child.once("error", reject)
    child.once("exit", (code) => accept(code ?? 1))
  })
  if (status !== 0) throw new Error(`Redis tests failed with exit code ${status}`)
  const report = JSON.parse(await readFile(reportPath, "utf8"))
  for (const path of suites) {
    const suite = report.testResults.find((result) => resolve(result.name) === resolve(path))
    if (suite?.status !== "passed" || suite.assertionResults.length === 0 || suite.assertionResults.some((test) => test.status !== "passed")) {
      throw new Error(`Required Redis suite missing, failed, or skipped: ${path}`)
    }
  }
  if (report.numPendingTests !== 0 || report.numFailedTests !== 0) throw new Error("Redis gate contains failed or skipped tests")
  console.log(`Verified ${suites.length} required Redis suites and ${report.numPassedTests} executed tests.`)
} finally {
  await rm(directory, { recursive: true, force: true })
}
