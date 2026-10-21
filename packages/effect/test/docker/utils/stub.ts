import { Effect, Layer, Stream } from "effect"
import { Docker, DockerConfig, DockerEngine } from "effect/docker"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"

/** A request the stub received. */
export interface Recorded {
  readonly method: string
  readonly url: URL
  readonly headers: Readonly<Record<string, string>>
  readonly body: string | undefined
}

/** What the stub answers. */
export interface Reply {
  /** Fail the request with a transport error instead of answering. */
  readonly fail?: boolean
  /** The runtime error inside that transport error (default: a connection reset). */
  readonly cause?: unknown
  readonly status?: number
  readonly headers?: Record<string, string>
  readonly body?: string
}

/**
 * A `DockerEngine` over an `HttpClient.make` stub that records requests and
 * answers with `reply`. There is no fake Engine: replies are fixtures.
 */
export const makeStubEngine = (
  reply: (request: Recorded) => Reply,
  options?: {
    readonly apiVersion?: string
    /** The rest of the configuration, over `DockerConfig.defaults`. */
    readonly config?: Partial<DockerConfig.ResolvedConfig>
  }
) => {
  const requests: Array<Recorded> = []
  const httpClient = HttpClient.make((request, url) =>
    Effect.gen(function*() {
      const bytes = request.body._tag === "Uint8Array"
        ? request.body.body
        : request.body._tag === "Stream"
        ? yield* Stream.runCollect(request.body.stream).pipe(
          Effect.map((chunks) => Uint8Array.from(chunks.flatMap((chunk) => Array.from(chunk)))),
          Effect.orDie
        )
        : undefined
      const body = bytes === undefined ? undefined : new TextDecoder().decode(bytes)
      const recorded: Recorded = { method: request.method, url, headers: request.headers, body }
      requests.push(recorded)
      const answer = reply(recorded)
      if (answer.fail === true) {
        return yield* new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({ request, cause: answer.cause ?? new Error("connection reset") })
        })
      }
      return HttpClientResponse.fromWeb(
        request,
        new Response(
          request.method === "HEAD" || answer.status === 304 || answer.status === 204 ? null : answer.body ?? "",
          { status: answer.status ?? 200, headers: answer.headers ?? {} }
        )
      )
    })
  )
  const engine = DockerEngine.make(httpClient).pipe(
    Effect.provideService(DockerConfig.DockerConfig, {
      ...DockerConfig.defaults,
      endpoint: { _tag: "Unix", path: "/test.sock" },
      apiVersion: options?.apiVersion,
      ...options?.config
    }),
    Effect.runSync
  )
  return { engine, requests, provide: provideEngine(engine) }
}

/** Provides an engine and every service over it. */
export const provideEngine = (engine: DockerEngine.DockerEngine["Service"]) =>
  Effect.provide(Docker.layer.pipe(Layer.provideMerge(Layer.succeed(DockerEngine.DockerEngine, engine))))

/** Answers `/_ping` like Docker with API `version`, and everything else with `reply`. */
export const withPing =
  (version: string, reply: (request: Recorded) => Reply = () => ({ body: "{}" })) => (request: Recorded): Reply =>
    request.url.pathname.endsWith("/_ping")
      ? { headers: { "Api-Version": version, "Ostype": "linux", "Builder-Version": "2" }, body: "OK" }
      : reply(request)

export const json = (value: unknown, status = 200): Reply => ({
  status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(value)
})
