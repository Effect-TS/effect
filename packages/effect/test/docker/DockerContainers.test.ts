import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerContainers, DockerError } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerContainers", () => {
  it.effect("rejects options newer than the negotiated API before sending", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ Id: "c", Warnings: [] }, 201)))
      const error = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.create({ Image: "alpine", HostConfig: { Umask: 18 } })
      ).pipe(stub.provide, Effect.flip)
      assert.deepStrictEqual(
        error.reason,
        new DockerError.OptionNotSupported({
          option: "HostConfig.Umask",
          requiredVersion: "1.56",
          negotiatedVersion: "1.44"
        })
      )
      assert.isFalse(stub.requests.some((request) => request.url.pathname.endsWith("/create")))
    }))
})
