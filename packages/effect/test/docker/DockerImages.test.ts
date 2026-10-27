import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerImages } from "effect/docker"
import { inspect } from "node:util"
import { makeStubEngine, ndjson, recordSpans, withPing } from "./utils/stub.ts"

describe("DockerImages", () => {
  it.effect("emits pull progress before failing on an in-band error", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () =>
        ndjson(
          { status: "Downloading", progressDetail: { current: 1, total: 2 } },
          { errorDetail: { message: "manifest unknown" }, error: "manifest unknown" }
        )))
      const seen: Array<string> = []
      const error = yield* Stream.unwrap(DockerImages.DockerImages.useSync((images) => images.pull("alpine"))).pipe(
        Stream.runForEach((message) => Effect.sync(() => seen.push(message.status ?? ""))),
        stub.provide,
        Effect.flip
      )
      assert.deepStrictEqual(seen, ["Downloading"])
      assert(error.reason._tag === "StreamFailed")
      assert.strictEqual(error.reason.message, "manifest unknown")
    }))

  it.effect("does not expose registry credentials in spans or connection errors", () =>
    Effect.gen(function*() {
      const secret = "registry-password"
      const { attributes, tracer } = recordSpans()
      const stub = makeStubEngine(withPing("1.44", () => ({ fail: true })))
      const error = yield* DockerImages.DockerImages.use((images) =>
        Stream.runDrain(
          images.pull("ghcr.io/org/app:1", { auth: { username: "user", password: Redacted.make(secret) } })
        )
      ).pipe(stub.provide, Effect.withTracer(tracer), Effect.flip)
      assert.strictEqual(error.reason._tag, "ConnectionFailed")
      assert.notInclude(inspect(error, { depth: 20 }), secret)
      assert.notInclude(JSON.stringify(error), secret)
      assert.notInclude(attributes().join("\n"), secret)
    }))

  it.effect("rejects a digest as a push reference or tag target, before sending anything", () =>
    Effect.gen(function*() {
      const digest = `sha256:${"ab".repeat(32)}`
      const stub = makeStubEngine(withPing("1.44"))
      const errors = yield* DockerImages.DockerImages.use((images) =>
        Effect.all([
          // the Engine would push every tag of the repository, or tag `latest`
          Effect.flip(images.push(`ghcr.io/org/app@${digest}`)),
          Effect.flip(images.tag("alpine", `ghcr.io/org/app@${digest}`))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(errors.map((error) => error.reason._tag), ["InvalidReference", "InvalidReference"])
      assert.strictEqual(stub.requests.length, 0)
    }))
})
