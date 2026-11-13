import { TrinoClient, TrinoTypes } from "@effect/sql-trino"
import { Context, Data, Effect, Layer } from "effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import type { GenericContainer } from "testcontainers"
import { inject } from "vitest"
import { reachShared, sharedFiles, trinoContainer, type TrinoFiles, type TrinoServer } from "./coordinator.ts"

export type { TrinoFiles, TrinoServer } from "./coordinator.ts"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
}> {}

/**
 * Starts a coordinator of the suite's own, configured by `options`, for suites
 * the shared coordinator cannot serve (access control, timeouts, networks).
 */
export const startTrino = (
  options: TrinoFiles & { readonly configure?: ((container: GenericContainer) => GenericContainer) | undefined } = {}
) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => {
        const container = trinoContainer(options)
        return (options.configure ? options.configure(container) : container).start()
      },
      catch: (cause) => new ContainerError({ cause })
    }),
    (container) => Effect.promise(() => container.stop())
  )

export const coordinatorUrl = (server: TrinoServer) => `http://${server.getHost()}:${server.getMappedPort(8080)}`

/**
 * Every request the client sent, as `METHOD url [header-names]`, so suites can
 * assert which protocol paths a query took (spooled downloads, acks, cancels)
 * and which headers went where.
 */
export class RequestLog extends Context.Service<RequestLog, Array<string>>()("test/RequestLog") {}

/**
 * A `TrinoClient` for `container` on `FetchHttpClient` (the fetch-only path
 * Workers use), with every request recorded in `RequestLog`.
 */
export const layerClientFor = (server: TrinoServer, config?: Partial<TrinoClient.TrinoClientConfig>) => {
  const log: Array<string> = []
  const http = Layer.effect(HttpClient.HttpClient)(
    Effect.map(
      HttpClient.HttpClient,
      HttpClient.tapRequest((request) =>
        Effect.sync(() =>
          log.push(`${request.method} ${request.url} [${Object.keys(request.headers).sort().join(",")}]`)
        )
      )
    )
  ).pipe(Layer.provide(FetchHttpClient.layer))
  return TrinoClient.layer({ url: coordinatorUrl(server), user: "test", ...config }).pipe(
    Layer.provideMerge(http),
    Layer.merge(Layer.succeed(RequestLog, log))
  )
}

/**
 * The coordinator the integration suites share, started once per run by
 * `test/globalSetup.ts`; a run without it (a single file outside the repo's
 * vitest config) starts one for the file.
 */
export class TrinoContainer extends Context.Service<TrinoContainer, TrinoServer>()("test/TrinoContainer") {
  static readonly layer = Layer.effect(this)(Effect.suspend(() => {
    const shared = inject("trinoCoordinator")
    return shared === undefined ? startTrino(sharedFiles) : Effect.succeed(reachShared(shared))
  }))

  static readonly layerClientWith = (config?: Partial<TrinoClient.TrinoClientConfig>) =>
    Layer.unwrap(Effect.map(TrinoContainer, (container) => layerClientFor(container, config)))

  static readonly layerClient = this.layerClientWith().pipe(Layer.provideMerge(this.layer))
}

/** A layer's time budget: a JVM coordinator is shared by every suite and may be slow on a busy runner. */
export const layerTimeout = "2 minutes"

/**
 * How result values decode: `default` is the pg-style decoding, `effect` the
 * `TrinoTypes.makeEffectRegistry()` codecs.
 */
export type ValueMode = "default" | "effect"

export const valueModes: ReadonlyArray<ValueMode> = ["default", "effect"]

export const typesIn = (mode: ValueMode): TrinoTypes.Registry | undefined =>
  mode === "effect" ? TrinoTypes.makeEffectRegistry() : undefined

/** The shared coordinator with a client that decodes values in `mode`. */
export const layerClientIn = (mode: ValueMode, config?: Partial<TrinoClient.TrinoClientConfig>) =>
  TrinoContainer.layerClientWith({ types: typesIn(mode), ...config }).pipe(Layer.provideMerge(TrinoContainer.layer))
