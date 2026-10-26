import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerError, DockerSystem } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerSystem", () => {
  it.effect("sends build-cache sizes under the Engine's names, and gates them", () =>
    Effect.gen(function*() {
      const prune = (
        apiVersion: string,
        options: Parameters<DockerSystem.DockerSystem["Service"]["pruneBuildCache"]>[0]
      ) => {
        const stub = makeStubEngine(withPing(apiVersion, () => json({ SpaceReclaimed: 1 })))
        return DockerSystem.DockerSystem.use((system) => system.pruneBuildCache(options)).pipe(
          stub.provide,
          Effect.map(() => Object.fromEntries(stub.requests.at(-1)!.url.searchParams))
        )
      }
      assert.deepStrictEqual(yield* prune("1.48", { all: true, reservedSpace: 1, maxUsedSpace: 2, minFreeSpace: 3 }), {
        "all": "true",
        "reserved-space": "1",
        "max-used-space": "2",
        "min-free-space": "3"
      })
      // `keep-storage` is `reserved-space` before API 1.48
      assert.deepStrictEqual(yield* prune("1.44", { all: true, reservedSpace: 1 }), {
        "all": "true",
        "keep-storage": "1"
      })
      const gated = yield* Effect.flip(prune("1.47", { reservedSpace: 1, maxUsedSpace: 2 }))
      assert.deepStrictEqual(
        gated.reason,
        new DockerError.OptionNotSupported({
          option: "maxUsedSpace",
          requiredVersion: "1.48",
          negotiatedVersion: "1.47"
        })
      )
    }))
})
