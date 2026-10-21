import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerError, DockerNetworks } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerNetworks", () => {
  it.effect("sends each request, and gates body fields newer than the negotiated version", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.47", (request) =>
        request.url.pathname.endsWith("/create")
          ? json({ Id: "n", Warning: "" }, 201)
          : request.method === "DELETE"
          ? { status: 204 }
          : { status: 200 }))
      const networks = DockerNetworks.DockerNetworks
      const { Id } = yield* networks.use((networks) => networks.create({ Name: "app", Labels: { app: "demo" } })).pipe(
        stub.provide
      )
      yield* networks.use((networks) =>
        Effect.all([
          networks.connect(Id, { Container: "db", EndpointConfig: { Aliases: ["database"] } }),
          networks.disconnect(Id, { Container: "db", Force: true }),
          networks.remove(Id)
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname} ${request.body ?? ""}`),
        [
          `POST /v1.47/networks/create {"Name":"app","Labels":{"app":"demo"}}`,
          `POST /v1.47/networks/n/connect {"Container":"db","EndpointConfig":{"Aliases":["database"]}}`,
          `POST /v1.47/networks/n/disconnect {"Container":"db","Force":true}`,
          "DELETE /v1.47/networks/n "
        ]
      )
      const gated = yield* networks.use((networks) =>
        Effect.all([
          Effect.flip(networks.create({ Name: "v4", EnableIPv4: true })),
          Effect.flip(networks.connect(Id, { Container: "db", EndpointConfig: { GwPriority: 1 } }))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(gated.map((error) => error.reason), [
        new DockerError.OptionNotSupported({
          option: "EnableIPv4",
          requiredVersion: "1.48",
          negotiatedVersion: "1.47"
        }),
        new DockerError.OptionNotSupported({
          option: "EndpointConfig.GwPriority",
          requiredVersion: "1.48",
          negotiatedVersion: "1.47"
        })
      ])
    }))
})
