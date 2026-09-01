import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import * as path from "node:path"

const makeMiniflare = Effect.acquireRelease(
  Effect.promise(async () => {
    const bundle = await esbuild.build({
      entryPoints: [path.join(import.meta.dirname, "fixtures", "worker-runtime.ts")],
      bundle: true,
      format: "esm",
      write: false,
      external: ["cloudflare:workers"],
      alias: {
        "@effect/platform-cloudflare": path.join(import.meta.dirname, "..", "src")
      }
    })
    return new Miniflare({
      modules: [{ type: "ESModule", path: "worker.mjs", contents: bundle.outputFiles[0].text }],
      compatibilityDate: "2026-08-01",
      bindings: {
        CLUSTER_SINGLETON_TRIGGERS: {}
      },
      durableObjects: {
        CLUSTER_ENTITY: { className: "ClusterEntity", useSQLite: true },
        CLUSTER_WORKFLOW: { className: "ClusterWorkflow", useSQLite: true },
        CLUSTER_QUEUE: { className: "ClusterDurableQueue", useSQLite: true },
        CLUSTER_SINGLETON: { className: "ClusterSingleton", useSQLite: true }
      }
    })
  }),
  (miniflare) => Effect.promise(() => miniflare.dispose())
)

describe("CloudflareWorker", () => {
  it.effect("shares a lazily initialized runtime across Worker requests", () =>
    Effect.gen(function*() {
      const miniflare = yield* makeMiniflare
      for (let request = 0; request < 2; request++) {
        const response = yield* Effect.promise(() => miniflare.dispatchFetch("http://placeholder"))
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(yield* Effect.promise(() => response.json()), { status: "ready" })
      }
    }), 60_000)
})
