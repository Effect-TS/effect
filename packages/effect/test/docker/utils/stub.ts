import { Effect, Layer, PlatformError, Sink, Stream, Tracer } from "effect"
import { Docker, DockerConfig, DockerEngine, DockerRegistryAuth } from "effect/docker"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"
import { ChildProcessSpawner } from "effect/process"
import { Socket } from "effect/socket"

/** A request the stub received. */
export interface Recorded {
  readonly method: string
  readonly url: URL
  readonly headers: Readonly<Record<string, string>>
  readonly body: string | undefined
  readonly bytes: Uint8Array | undefined
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
    /** Runs credential helpers; see {@link helpers}. */
    readonly spawner?: ChildProcessSpawner.ChildProcessSpawner["Service"]
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
      const recorded: Recorded = { method: request.method, url, headers: request.headers, body, bytes }
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
  const [engine, registryAuth] = Effect.all([DockerEngine.make(httpClient), DockerRegistryAuth.make]).pipe(
    Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, options?.spawner ?? helpers({})),
    Effect.provideService(DockerConfig.DockerConfig, {
      ...DockerConfig.defaults,
      endpoint: { _tag: "Unix", path: "/test.sock" },
      apiVersion: options?.apiVersion,
      ...options?.config
    }),
    Effect.runSync
  )
  return { engine, registryAuth, requests, provide: provideEngine(engine, registryAuth) }
}

/** Provides an engine, registry credentials and every service over them. */
export const provideEngine = (
  engine: DockerEngine.DockerEngine["Service"],
  registryAuth: DockerRegistryAuth.DockerRegistryAuth["Service"]
) =>
  Effect.provide(Docker.layer.pipe(Layer.provideMerge(Layer.mergeAll(
    Layer.succeed(DockerEngine.DockerEngine, engine),
    Layer.succeed(DockerRegistryAuth.DockerRegistryAuth, registryAuth)
  ))))

/** Answers `/_ping` like Docker with API `version`, and everything else with `reply`. */
export const withPing =
  (version: string, reply: (request: Recorded) => Reply = () => ({ body: "{}" })) => (request: Recorded): Reply =>
    request.url.pathname.endsWith("/_ping")
      ? { headers: { "Api-Version": version, "Ostype": "linux", "Builder-Version": "2" }, body: "OK" }
      : reply(request)

/** A progress stream: one JSON message per line. */
export const ndjson = (...messages: ReadonlyArray<unknown>): Reply => ({
  headers: { "content-type": "application/json" },
  body: messages.map((message) => JSON.stringify(message)).join("\r\n") + "\r\n"
})

/** A tracer that records spans, and their attributes as `<span> <key>=<value>` lines. */
export const recordSpans = () => {
  const spans: Array<Tracer.NativeSpan> = []
  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    }
  })
  const attributes = () =>
    spans.flatMap((span) => Array.from(span.attributes, ([key, value]) => `${span.name} ${key}=${String(value)}`))
  /** Whether the span `name` has started and not yet ended. */
  const isOpen = (name: string) => spans.some((span) => span.name === name && span.status._tag === "Started")
  return { tracer, attributes, isOpen }
}

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

/** What a fake credential helper does when it runs. */
export interface Helper {
  readonly stdout?: string
  readonly stderr?: string
  readonly exitCode?: number
  /** Never exit. */
  readonly hang?: boolean
}

/**
 * A `ChildProcessSpawner` with fake `docker-credential-<name>` programs,
 * keyed by name. `runs` records each run as `<program> <args>: <stdin>`; a
 * program that isn't there fails to spawn.
 */
export const helpers = (programs: Readonly<Record<string, (stdin: string) => Helper>>) => {
  const runs: Array<string> = []
  const spawner = ChildProcessSpawner.make((command) =>
    Effect.gen(function*() {
      if (command._tag !== "StandardCommand") return yield* Effect.die("not supported")
      const program = programs[command.command.replace(/^docker-credential-/, "")]
      if (program === undefined) {
        return yield* Effect.fail(
          PlatformError.systemError({ _tag: "NotFound", module: "ChildProcess", method: "spawn" })
        )
      }
      const input = command.options.stdin
      const stdin = Stream.isStream(input)
        ? new TextDecoder().decode(concat(...yield* Stream.runCollect(input as Stream.Stream<Uint8Array>)))
        : ""
      runs.push(`${command.command} ${command.args.join(" ")}: ${stdin}`)
      const helper = program(stdin)
      const text = (value: string | undefined) => Stream.make(new TextEncoder().encode(value ?? ""))
      return ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(1),
        exitCode: helper.hang === true
          ? Effect.never
          : Effect.succeed(ChildProcessSpawner.ExitCode(helper.exitCode ?? 0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: Sink.drain,
        stdout: text(helper.stdout),
        stderr: text(helper.stderr),
        all: Stream.concat(text(helper.stdout), text(helper.stderr)),
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void)
      })
    })
  )
  return Object.assign(spawner, { runs })
}
