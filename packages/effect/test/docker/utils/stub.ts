import { Effect, Layer, Stream } from "effect"
import { Docker, DockerConfig, DockerEngine } from "effect/docker"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"
import { Socket } from "effect/socket"

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
  readonly body?: string | Uint8Array
  /** Switch protocols (101) and hand over this connection. */
  readonly upgrade?: Connection
}

/** An upgraded connection: what the Engine sends, and what it received. */
export interface Connection {
  /** The reads the Engine's side yields, in order. */
  readonly output: ReadonlyArray<Uint8Array>
  /** After the output: the Engine closes its side, keeps it open, or the connection breaks. */
  readonly after: "end" | "hold" | "error"
  /** What the client wrote. */
  readonly written: Array<Uint8Array>
  /** Whether the client half-closed the connection. */
  halfClosed: boolean
}

/** A {@link Connection} for a reply's `upgrade`. */
export const connection = (output: ReadonlyArray<Uint8Array>, after: Connection["after"] = "end"): Connection => ({
  output,
  after,
  written: [],
  halfClosed: false
})

const toSocket = (connection: Connection): Socket.Socket =>
  Socket.make({
    reader: Effect.sync(() => {
      let next = 0
      return {
        pull: Effect.suspend(() =>
          next < connection.output.length
            ? Effect.succeed([connection.output[next++]] as const)
            : connection.after === "hold"
            ? Effect.never
            : Effect.fail(
              new Socket.SocketError({
                reason: connection.after === "end"
                  ? new Socket.SocketCloseError({ code: 1000 })
                  : new Socket.SocketReadError({ cause: new Error("connection reset") })
              })
            )
        ),
        upgrade: () => Effect.die("not supported")
      }
    }),
    writer: Effect.acquireRelease(
      Effect.succeed({
        write: (chunk: Uint8Array | string | Socket.CloseEvent) =>
          Effect.sync(() => {
            if (chunk instanceof Uint8Array) connection.written.push(chunk)
          }),
        writeAll: (chunks: ReadonlyArray<Uint8Array | string>) =>
          Effect.sync(() => {
            for (const chunk of chunks) if (chunk instanceof Uint8Array) connection.written.push(chunk)
          })
      }),
      () =>
        Effect.sync(() => {
          connection.halfClosed = true
        })
    )
  })

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
          // as Node's client reports a body stream's failure
          Effect.mapError((cause) =>
            new HttpClientError.HttpClientError({ reason: new HttpClientError.EncodeError({ request, cause }) })
          )
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
      if (answer.upgrade !== undefined) {
        // a web `Response` can't have status 101
        const response = HttpClientResponse.fromWeb(request, new Response(null, { headers: answer.headers ?? {} }))
        return Object.create(response, {
          status: { value: 101 },
          upgrade: { value: Effect.succeed(toSocket(answer.upgrade)) }
        }) as HttpClientResponse.HttpClientResponse
      }
      return HttpClientResponse.fromWeb(
        request,
        new Response(
          request.method === "HEAD" || answer.status === 304 || answer.status === 204
            ? null
            : (answer.body ?? "") as BodyInit,
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

/** A multiplexed frame: stream type 1 is stdout, 2 stderr, 3 systemerr. */
export const frame = (type: number, text: string): Uint8Array => {
  const data = new TextEncoder().encode(text)
  const header = new Uint8Array(8)
  header[0] = type
  new DataView(header.buffer).setUint32(4, data.length)
  return new Uint8Array([...header, ...data])
}

/** Concatenates byte arrays. */
export const concat = (...parts: ReadonlyArray<Uint8Array>): Uint8Array =>
  Uint8Array.from(parts.flatMap((part) => Array.from(part)))
