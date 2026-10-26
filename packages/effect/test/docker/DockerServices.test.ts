import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerApi, DockerServices } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("services").add(
    DockerApi.Services.endpoints.create,
    DockerApi.Services.endpoints.inspect,
    DockerApi.Services.endpoints.update,
    DockerApi.Services.endpoints.logs
  ).middleware(DockerApi.SwarmErrors)
)

const received: Array<unknown> = []

const Handlers = HttpApiBuilder.group(Served, "services", (handlers) =>
  handlers
    .handle("create", ({ payload }) =>
      Effect.sync(() => {
        received.push(payload)
        return { ID: "s1", Warnings: [] }
      }))
    .handle("inspect", ({ params }) =>
      Effect.succeed({ ID: params.id, Version: { Index: 9 }, Spec: { Name: "web", Labels: { rev: "2" } } }))
    .handle("update", ({ payload, query }) =>
      Effect.sync(() => {
        received.push({ query, payload })
        return { Warnings: [] }
      }))
    .handle("logs", () =>
      Effect.succeed(HttpApiSchema.withHeaders({
        body: Stream.make(new TextEncoder().encode("tty\r\n")),
        headers: { "content-type": "application/vnd.docker.raw-stream" as const }
      }))))

describe("DockerServices", () => {
  it.effect("round-trips DockerApi: create with Redacted env, rollback from the current spec, raw logs", () =>
    Effect.gen(function*() {
      const services = yield* DockerServices.DockerServices
      const created = yield* services.create({
        Name: "web",
        TaskTemplate: { ContainerSpec: { Image: "alpine", Env: [Redacted.make("TOKEN=t")] } }
      })
      assert.deepStrictEqual(created, { ID: "s1", Warnings: [] })
      yield* services.rollback("web")
      // a rollback sends the current spec, which the Engine checks
      assert.deepStrictEqual(received, [
        { Name: "web", TaskTemplate: { ContainerSpec: { Image: "alpine", Env: ["TOKEN=t"] } } },
        { query: { version: 9, rollback: "previous" }, payload: { Name: "web", Labels: { rev: "2" } } }
      ])
      const frames = yield* Stream.runCollect(services.logs("web"))
      assert.deepStrictEqual(
        frames.map((frame) => `${frame.stream}:${new TextDecoder().decode(frame.data)}`),
        ["stdout:tty\r\n"]
      )
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
