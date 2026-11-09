import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { type DockerError, DockerImages } from "effect/docker"
import { makeStubEngine, ndjson, reaches, recordSpans, type Reply, withPing } from "./utils/stub.ts"

describe("DockerImages", () => {
  it.effect("emits pull progress before failing on an in-band error", () =>
    Effect.gen(function*() {
      const stub = yield* makeStubEngine(withPing("1.52", () =>
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

  it.effect("keeps registry credentials out of spans and errors, however the request fails", () =>
    Effect.gen(function*() {
      const auth = { username: "user", password: Redacted.make("registry-password") }
      const cases: ReadonlyArray<readonly [Reply, DockerError.DockerErrorReason["_tag"], issue?: string]> = [
        [{ fail: true }, "ConnectionFailed"],
        // the connection drops while the progress is read
        [{ ...ndjson({ status: "Downloading" }), failAfterBody: true }, "ConnectionFailed"],
        [ndjson({ status: "x".repeat(2 * 1024 * 1024) }), "InvalidResponse", "NDJSON line exceeds"],
        // a proxy's redirect, which `DockerApi` doesn't declare
        [{ status: 307, headers: { location: "/elsewhere" } }, "InvalidResponse", "undeclared status code (status 307)"]
      ]
      for (const [reply, tag, issue] of cases) {
        const { attributes, tracer } = recordSpans()
        const stub = yield* makeStubEngine(withPing("1.52", () => reply))
        const error = yield* DockerImages.DockerImages.use((images) =>
          Stream.runDrain(images.pull("ghcr.io/org/app:1", { auth }))
        ).pipe(stub.provide, Effect.withTracer(tracer), Effect.flip)
        assert.strictEqual(error.reason._tag, tag)
        if (issue !== undefined) {
          assert.include(String(error.reason._tag === "InvalidResponse" && error.reason.issue), issue)
        }
        // the header is base64 JSON with the password; no object reachable from the error holds either
        const header = stub.requests.find((request) => request.url.pathname.endsWith("/images/create"))!
          .headers["x-registry-auth"]
        for (const secret of [header, "registry-password"]) {
          assert.isFalse(reaches(error, secret), `${tag}: the error holds ${secret}`)
          assert.notInclude(attributes().join("\n"), secret)
        }
      }
    }))

  it.effect("rejects a digest as a push reference or tag target, before sending anything", () =>
    Effect.gen(function*() {
      const digest = `sha256:${"ab".repeat(32)}`
      const stub = yield* makeStubEngine(withPing("1.52"))
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
