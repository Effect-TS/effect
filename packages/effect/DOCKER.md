## Introduction

`effect/docker` is a client for the [Docker Engine API](https://docs.docker.com/reference/api/engine/): containers, exec, images and builds, networks, volumes, Swarm, and plugins, as Effect services. It speaks API 1.44 up to 1.56, the version its schemas are generated from, and negotiates with the Engine as the Docker CLI does.

The client is built in layers:

- `DockerConfig`: where the Engine is and how to talk to it, as plain data.
- `DockerEngine`: the connection, an `HttpClient` that negotiates the API version.
- `DockerApi`: the Engine API as an `HttpApi`, the contract every service is a client of.
- The services (`DockerContainers`, `DockerImages`, …), one per area of the API.
- `NodeDocker` in `@effect/platform-node`, which provides all of it on Node.js.

## Getting started

```ts
import { NodeDocker, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Stream } from "effect"
import { DockerContainers } from "effect/docker"

const program = Effect.gen(function*() {
  const containers = yield* DockerContainers.DockerContainers
  const { Id } = yield* containers.create({ Image: "alpine:3.22", Cmd: ["echo", "hello"] })
  yield* containers.start(Id)
  // the output, as frames of stdout and stderr, until the container exits
  yield* containers.logs(Id, { follow: true }).pipe(
    Stream.runForEach((frame) => Console.log(frame.stream, new TextDecoder().decode(frame.data)))
  )
  const { StatusCode } = yield* containers.wait(Id)
  yield* containers.remove(Id)
  return StatusCode
})

// configured as the Docker CLI is: DOCKER_HOST, the current context, ~/.docker/config.json
program.pipe(Effect.provide(NodeDocker.layerFromEnv()), NodeRuntime.runMain)
```

Building the layer never contacts the Engine. The first request negotiates the API version.

## Configuration

`NodeDocker.layerFromEnv()` configures the client as a bare `docker` invocation is: it reads the `DOCKER_*` variables, the current context and `~/.docker/config.json` once, when the layer is built, and never runs the `docker` CLI. Values you pass take precedence:

```ts
import { NodeDocker } from "@effect/platform-node"

const DockerLive = NodeDocker.layerFromEnv({ platform: "linux/amd64" })
```

`NodeDocker.layer` builds over a `DockerConfig` you provide instead. `DockerConfig.layer` takes static values over the defaults and reads nothing:

```ts
import { NodeDocker } from "@effect/platform-node"
import { Layer } from "effect"
import { DockerConfig } from "effect/docker"

const DockerLive = NodeDocker.layer.pipe(
  Layer.provide(DockerConfig.layer({
    endpoint: { _tag: "Tcp", host: "docker.example.com", port: 2376, tls: { verify: true } }
  }))
)
```

An endpoint is a unix socket or TCP, with TLS material as PEM contents rather than file paths. `DockerConfig.parseHost` reads a `DOCKER_HOST` string. The rest of the configuration is what changes what the client sends: a pinned `apiVersion`, where registry credentials come from, `httpHeaders` for every request, the proxy passed to builds and new containers, and the default `platform`, `builder` and `detachKeys`. Docker Desktop and rootless Docker are found through the contexts they create; nothing probes for sockets.

`ssh://` hosts aren't supported yet: they need an SSH transport, which is planned on top of Effect's SSH client. `fd://` and `npipe://` hosts aren't supported.

## Services

| Service                                                       | Covers                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `DockerSystem`                                                | ping, version, info, events, disk usage, registry login, build cache pruning |
| `DockerContainers`                                            | the container lifecycle, logs, stats, attach, archives                       |
| `DockerExec`                                                  | commands in running containers                                               |
| `DockerImages`                                                | pull, push, build, tag, save, load, import, commit, search                   |
| `DockerNetworks`, `DockerVolumes`                             | networks and volumes                                                         |
| `DockerSwarm`, `DockerNodes`, `DockerServices`, `DockerTasks` | a Swarm, its nodes, services and their tasks                                 |
| `DockerSecrets`, `DockerSwarmConfigs`                         | Swarm secrets and configs                                                    |
| `DockerPlugins`                                               | managed plugins, with `install`                                              |

Each takes and returns the Engine's own models, generated into `DockerSchema` (PascalCase, as the Engine writes them), or `DockerApi`'s where they differ, such as secrets as `Redacted`. Every Swarm object with an `update` also has `modify`, which reads the object, applies a function to its spec and writes it back at the version read, starting over while the write is out of sequence.

`NodeDocker`'s layers provide every service. With an `HttpClient` of your own, build the engine with `DockerEngine.make` and add the services with `Docker.layer`, which also needs a `DockerRegistryAuth`.

## Streams and handles

Streaming operations return a `Stream` that ends when the Engine's response does:

- Logs (`DockerContainers.logs`, `DockerServices.logs`, `DockerTasks.logs`) are frames of `stdout` and `stderr`. The Engine frames them as its response's `Content-Type` says: multiplexed without a TTY, raw with one.
- Progress (image pull, push, load and build, plugin pull and upgrade) is the Engine's messages. The Engine reports a failure as one more message after a `200`, and the stream fails with `StreamFailed` there.
- Events and stats are decoded one message at a time.

Attach and exec upgrade the connection. `DockerContainers.attach` and `DockerExec.start` return a scoped `Handle`, shaped like `effect/process`'s `ChildProcessHandle`: `stdin` is a `Sink`, `stdout`, `stderr` and `all` are streams, `exitCode` waits for the end, and `resize` sets the TTY's size. Closing the scope closes the connection.

```ts
import { Effect, Stream } from "effect"
import { DockerExec } from "effect/docker"

const program = Effect.gen(function*() {
  const exec = yield* DockerExec.DockerExec
  const { Id } = yield* exec.create("my-container", { Cmd: ["cat"], AttachStdin: true, AttachStdout: true })
  const handle = yield* exec.start(Id)
  yield* Stream.make(new TextEncoder().encode("hello")).pipe(Stream.run(handle.stdin))
  return yield* handle.exitCode
}).pipe(Effect.scoped)
```

`DockerExec.run` creates, starts and collects in one call.

## Registry credentials

Operations that talk to a registry (image pull, push, search and distribution, plugin pull, upgrade and push, and services with `registryAuth: true`) send the credential `DockerRegistryAuth` resolves for that registry, anonymous when there is none. A call's own `auth` replaces it.

`DockerRegistryAuth.layer`, which `NodeDocker` provides, resolves credentials as the Docker CLI does: `DOCKER_AUTH_CONFIG`, then the registry's credential helper (`credHelpers`, else `credsStore`), then `auths`. Helpers run as `docker-credential-<name> get` on every request, because their tokens are short-lived. To resolve credentials another way, such as from a secret store, provide the service yourself:

```ts
import { Effect, Layer, Redacted } from "effect"
import { DockerRegistryAuth } from "effect/docker"

const RegistryAuthLive = Layer.succeed(
  DockerRegistryAuth.DockerRegistryAuth,
  DockerRegistryAuth.DockerRegistryAuth.of({
    credential: (registry) =>
      Effect.succeed(registry === "ghcr.io" ? { username: "ci", password: Redacted.make("token") } : undefined)
  })
)
```

## API versions

The first request negotiates, as moby's client does: it asks the unversioned `/_ping` for the Engine's version, uses the lower of that and 1.56, and prefixes every request with `/v{version}`. An Engine that can't serve 1.44 fails with `UnsupportedApiVersion`. A pinned `apiVersion` (or `DOCKER_API_VERSION`) turns negotiation off.

Endpoints and request fields newer than 1.44 are annotated with the version they arrived in (`DockerApi.ApiVersions`). A request that uses one with an older Engine fails with `OptionNotSupported` before anything is sent, instead of being ignored or rejected by the Engine.

## Errors

Every operation fails with `DockerError`. Its `reason` says what went wrong, and its `operation` names the innermost operation that failed, as its span does (`docker.Containers.inspect`):

- An Engine response by its status, as moby maps its errors: `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `PreconditionFailed`, `TooManyRequests`, `ServerError`, `NotImplemented`, `Unavailable`, and `UnexpectedStatus` for any other. A Swarm endpoint's `503` is `SwarmUnavailable`: the node isn't a manager, or not in a Swarm.
- `ConnectionFailed`, with a hint for the common causes (no socket, permission denied, TLS mismatch).
- `InvalidResponse` for a response that doesn't decode, `StreamFailed` for a failure inside a stream.
- Client-side checks: `OptionNotSupported`, `UnsupportedApiVersion`, `InvalidReference`, `StdinNotAttached`, `CredentialsUnavailable`.

```ts
import { Effect } from "effect"
import { DockerContainers } from "effect/docker"

const exists = (id: string) =>
  DockerContainers.DockerContainers.use((containers) => containers.inspect(id)).pipe(
    Effect.as(true),
    Effect.catchReason("DockerError", "NotFound", () => Effect.succeed(false))
  )
```

`isRetryable` is `true` for `ConnectionFailed` (unless it names a misconfiguration), `TooManyRequests` and `Unavailable`. Nothing in `effect/docker` retries or times out on its own: use `Effect.retry` with a `Schedule`, and `Effect.timeout`.

## Tracing

Every operation runs in a span named `docker.<Service>.<operation>`, with the resource it acts on as `docker.resource_id` and the negotiated version as `docker.api_version`. A streaming operation's span lasts until its stream ends. Registry credentials and the query parameters that can carry secrets (build args, `changes`, import sources, remote build contexts) are redacted.

## The contract: `DockerApi`

`DockerApi` declares the Engine API as `HttpApi` endpoint groups, one per area, with every status the Engine answers: its error responses decode to the `DockerError` reason classes (`EngineErrors`, or `SwarmErrors` where Swarm serves the endpoint). A test checks it against the pinned API document. Where it differs from the document, the Engine does too.

Use it for what the services don't cover. A raw client over the engine's `HttpClient` gets the negotiated version and the configuration, and fails with the declared errors:

```ts
import { Effect } from "effect"
import { DockerApi, DockerEngine } from "effect/docker"
import { HttpApi, HttpApiClient } from "effect/http-api"

const program = Effect.gen(function*() {
  const engine = yield* DockerEngine.DockerEngine
  const client = yield* HttpApiClient.makeWith(HttpApi.make("docker").add(DockerApi.Volumes), {
    httpClient: engine.client
  })
  return yield* client.volumes.list({ query: {} })
})
```

A server can be built from it with `HttpApiBuilder`, such as a fake Engine for tests (below) or a proxy. Three operations are split into endpoints on one route (container stats, `/build`, `/images/create`), which `HttpApi` can't serve or document together, so serve the groups or endpoints you need.

## Testing your own code

Provide the services over a fake Engine: `DockerApi` groups served by your handlers with `HttpApiBuilder`, reached in memory through `FetchHttpClient`. Pin the API version, so the fake needn't answer `/_ping`. The Engine also serves unversioned paths, so drop the `/v1.xx` prefix:

```ts
import { Effect, FileSystem, Layer, Path } from "effect"
import { Docker, DockerApi, DockerConfig, DockerEngine, DockerError, DockerRegistryAuth } from "effect/docker"
import { Etag, FetchHttpClient, HttpClient, HttpPlatform, HttpRouter } from "effect/http"
import { HttpApi, HttpApiBuilder } from "effect/http-api"

const Api = HttpApi.make("docker").add(DockerApi.Volumes)

const VolumesLive = HttpApiBuilder.group(Api, "volumes", (handlers) =>
  handlers
    .handle("inspect", ({ params }) =>
      Effect.fail(new DockerError.NotFound({ message: `no such volume: ${params.name}` })))
    .handle("list", () =>
      Effect.succeed({ Volumes: [], Warnings: [] }))
    .handle("create", () => Effect.die("unused"))
    .handle("update", () => Effect.die("unused"))
    .handle("remove", () => Effect.void)
    .handle("prune", () => Effect.succeed({ VolumesDeleted: [], SpaceReclaimed: 0 })))

const FakeDocker = Layer.unwrap(Effect.gen(function*() {
  const { handler } = yield* Effect.acquireRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(
        HttpApiBuilder.layer(Api).pipe(
          Layer.provide(VolumesLive),
          // the error middlewares only declare errors
          Layer.provide(Layer.succeed(DockerApi.EngineErrors, (effect) => effect)),
          Layer.provide(Layer.succeed(DockerApi.SwarmErrors, (effect) => effect)),
          Layer.provide(
            Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
              Layer.provideMerge(FileSystem.layerNoop({}))
            )
          )
        ),
        { disableLogger: true }
      )
    ),
    ({ dispose }) => Effect.promise(dispose)
  )
  const fetch: typeof globalThis.fetch = Object.assign((input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    url.pathname = url.pathname.replace(/^\/v\d+\.\d+\//, "/")
    return handler(new Request(url, request))
  }, { preconnect() {} })
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.Fetch, fetch)
  )
  return Docker.layer.pipe(Layer.provideMerge(Layer.mergeAll(
    Layer.effect(DockerEngine.DockerEngine, DockerEngine.make(httpClient)).pipe(
      Layer.provide(DockerConfig.layer({ apiVersion: "1.56" }))
    ),
    Layer.succeed(DockerRegistryAuth.DockerRegistryAuth, { credential: () => Effect.succeed(undefined) })
  )))
}))
```

Attach and exec upgrade the connection, which `fetch` can't, so test them against a real Engine.

To check what your code sends rather than what it gets back, a stub `HttpClient` that records requests and answers them is enough:

```ts
import { Effect, Layer } from "effect"
import { Docker, DockerConfig, DockerEngine, DockerRegistryAuth } from "effect/docker"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/http"

const requests: Array<HttpClientRequest.HttpClientRequest> = []
const httpClient = HttpClient.make((request) => {
  requests.push(request)
  return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({ Volumes: [], Warnings: [] })))
})

const StubDocker = Docker.layer.pipe(Layer.provideMerge(Layer.mergeAll(
  Layer.effect(DockerEngine.DockerEngine, DockerEngine.make(httpClient)).pipe(
    Layer.provide(DockerConfig.layer({ apiVersion: "1.56" }))
  ),
  Layer.succeed(DockerRegistryAuth.DockerRegistryAuth, { credential: () => Effect.succeed(undefined) })
)))
// after `volumes.list()`, `requests` holds `GET http://localhost/v1.56/volumes`
```
