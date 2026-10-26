import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Context, Effect, FileSystem, Layer, Path, Redacted, Result } from "effect"
import { DockerConfig } from "effect/docker"
import { createHash } from "node:crypto"

const withEnv = (env: Record<string, string>) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env }))

const sha256 = (name: string) => createHash("sha256").update(name).digest("hex")

/** The whole configuration a layer provides. */
const readAll = <E, R>(layer: Layer.Layer<DockerConfig.DockerConfig, E, R>) =>
  Effect.gen(function*() {
    return yield* DockerConfig.DockerConfig
  }).pipe(Effect.provide(layer))

/** The `endpoint` and `apiVersion` a layer provides. */
const read = <E, R>(layer: Layer.Layer<DockerConfig.DockerConfig, E, R>) =>
  Effect.gen(function*() {
    const { apiVersion, endpoint } = yield* DockerConfig.DockerConfig
    return { endpoint, apiVersion }
  }).pipe(Effect.provide(layer))

/** The Endpoint `layerFromEnv` finds in an environment. */
const discover = (env: Record<string, string>) =>
  read(DockerConfig.layerFromEnv()).pipe(Effect.map(({ endpoint }) => endpoint), withEnv(env))

/** A throwaway DOCKER_CONFIG with contexts and certificates. */
const makeConfigDir = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const dir = yield* fs.makeTempDirectoryScoped()
  const write = Effect.fnUntraced(function*(file: string, content: string) {
    yield* fs.makeDirectory(path.dirname(path.join(dir, file)), { recursive: true })
    yield* fs.writeFileString(path.join(dir, file), content)
  })
  const context = Effect.fnUntraced(
    function*(
      name: string,
      host: string,
      options?: { skipTlsVerify?: boolean; tls?: ReadonlyArray<"ca.pem" | "cert.pem" | "key.pem"> }
    ) {
      yield* write(
        `contexts/meta/${sha256(name)}/meta.json`,
        JSON.stringify({
          Name: name,
          Metadata: {},
          Endpoints: { docker: { Host: host, SkipTLSVerify: options?.skipTlsVerify ?? false } }
        })
      )
      if (options?.tls !== undefined) {
        yield* fs.makeDirectory(path.join(dir, `contexts/tls/${sha256(name)}/docker`), { recursive: true })
        for (const file of options.tls) {
          yield* write(`contexts/tls/${sha256(name)}/docker/${file}`, `${name}-${file}`)
        }
      }
    }
  )
  return { dir, write, context }
})

describe("DockerConfig", () => {
  it("parses hosts and normalizes registries like the CLI", () => {
    const hosts: ReadonlyArray<readonly [string, typeof DockerConfig.Endpoint.Type]> = [
      ["unix:///run/user/1000/docker.sock", { _tag: "Unix", path: "/run/user/1000/docker.sock" }],
      ["", DockerConfig.defaultEndpoint],
      ["tcp://example.com", { _tag: "Tcp", host: "example.com", port: 2375 }],
      ["tcp://:1234", { _tag: "Tcp", host: "localhost", port: 1234 }],
      ["tcp://[::1]:2375", { _tag: "Tcp", host: "::1", port: 2375 }]
    ]
    for (const [host, expected] of hosts) {
      assert.deepStrictEqual(DockerConfig.parseHost(host), Result.succeed(expected), host)
    }
    const invalid = [
      ["ssh://me@host", "UnsupportedScheme"],
      ["npipe:////./pipe/docker_engine", "UnsupportedScheme"],
      ["tcp://host/base", "InvalidHost"],
      ["tcp://host:65536", "InvalidHost"]
    ] as const
    for (const [host, reason] of invalid) {
      const result = DockerConfig.parseHost(host)
      assert(Result.isFailure(result), host)
      assert.strictEqual(result.failure.reason._tag, reason, host)
    }
    const registries: ReadonlyArray<readonly [string, string]> = [
      ["docker.io", "https://index.docker.io/v1/"],
      ["https://ghcr.io/v2/", "ghcr.io"],
      ["localhost:5000", "localhost:5000"]
    ]
    for (const [registry, expected] of registries) {
      assert.strictEqual(DockerConfig.normalizeRegistry(registry), expected, registry)
    }
  })

  it.effect("finds the Endpoint like the CLI: DOCKER_HOST, then DOCKER_CONTEXT, then currentContext", () =>
    Effect.gen(function*() {
      const { context, dir, write } = yield* makeConfigDir
      yield* context("pod", "unix:///run/pod.sock")
      yield* context("current", "unix:///run/current.sock")
      yield* write("config.json", JSON.stringify({ currentContext: "current" }))
      const cases: ReadonlyArray<[Record<string, string>, typeof DockerConfig.Endpoint.Type]> = [
        [{ DOCKER_HOST: "unix:///x", DOCKER_CONTEXT: "pod" }, { _tag: "Unix", path: "/x" }],
        [{ DOCKER_CONTEXT: "pod" }, { _tag: "Unix", path: "/run/pod.sock" }],
        [{}, { _tag: "Unix", path: "/run/current.sock" }],
        // the virtual "default" context: DOCKER_HOST, or the OS default
        [{ DOCKER_CONTEXT: "default" }, DockerConfig.defaultEndpoint]
      ]
      for (const [env, expected] of cases) {
        const endpoint = yield* discover({ DOCKER_CONFIG: dir, ...env })
        assert.deepStrictEqual(endpoint, expected, JSON.stringify(env))
      }
      const missing = yield* discover({ DOCKER_CONFIG: dir, DOCKER_CONTEXT: "missing" }).pipe(Effect.flip)
      assert.strictEqual(missing.reason._tag, "ContextNotFound")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("reads DOCKER_HOST with the TLS variables and certificate files like the CLI", () =>
    Effect.gen(function*() {
      const { dir, write } = yield* makeConfigDir
      const env = { DOCKER_CONFIG: dir, DOCKER_HOST: "tcp://remote:2376", DOCKER_TLS_VERIFY: "1" }
      // TLS doesn't apply to unix sockets
      assert.deepStrictEqual(
        yield* discover({ ...env, DOCKER_HOST: "unix:///tmp/d.sock" }),
        { _tag: "Unix", path: "/tmp/d.sock" }
      )
      // unlike the CLI, TLS without verification doesn't need ca.pem
      assert.deepStrictEqual(
        yield* discover({ DOCKER_CONFIG: dir, DOCKER_HOST: "tcp://remote:2376", DOCKER_TLS: "1" }),
        { _tag: "Tcp", host: "remote", port: 2376, tls: { verify: false } }
      )
      const noCa = yield* discover(env).pipe(Effect.flip)
      assert.strictEqual(noCa.reason._tag, "UnreadableCertificate")
      // as in the CLI, a cert.pem without key.pem is ignored
      yield* write("ca.pem", "CA")
      yield* write("cert.pem", "CERT")
      assert.deepStrictEqual(
        yield* discover(env),
        { _tag: "Tcp", host: "remote", port: 2376, tls: { verify: true, ca: "CA" } }
      )
      yield* write("key.pem", "KEY")
      const verified = yield* discover(env)
      assert(verified._tag === "Tcp" && verified.tls !== undefined)
      assert.strictEqual(verified.tls.clientCertificate?.cert, "CERT")
      assert.strictEqual(Redacted.value(verified.tls.clientCertificate!.key), "KEY")
      // DOCKER_CERT_PATH wins over the config dir
      yield* write("certs/ca.pem", "OTHER")
      const other = yield* discover({ ...env, DOCKER_CERT_PATH: `${dir}/certs` })
      assert(other._tag === "Tcp")
      assert.strictEqual(other.tls?.ca, "OTHER")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("reads a named Context's TLS material and SkipTLSVerify like the CLI", () =>
    Effect.gen(function*() {
      const { context, dir } = yield* makeConfigDir
      yield* context("remote", "tcp://remote:2376", { tls: ["ca.pem", "cert.pem", "key.pem"] })
      yield* context("insecure", "tcp://insecure:2376", { skipTlsVerify: true })
      yield* context("plain", "tcp://plain:2375")
      // the TLS directory turns TLS on, even an empty one
      yield* context("empty", "tcp://empty:2376", { tls: [] })
      const endpoint = (name: string) => discover({ DOCKER_CONFIG: dir, DOCKER_CONTEXT: name })
      const remote = yield* endpoint("remote")
      assert(remote._tag === "Tcp")
      assert.strictEqual(remote.tls?.ca, "remote-ca.pem")
      assert.strictEqual(Redacted.value(remote.tls!.clientCertificate!.key), "remote-key.pem")
      assert.isTrue(remote.tls?.verify)
      const cases: ReadonlyArray<[string, typeof DockerConfig.Endpoint.Type]> = [
        ["insecure", { _tag: "Tcp", host: "insecure", port: 2376, tls: { verify: false } }],
        ["plain", { _tag: "Tcp", host: "plain", port: 2375 }],
        ["empty", { _tag: "Tcp", host: "empty", port: 2376, tls: { verify: true } }]
      ]
      for (const [name, expected] of cases) {
        assert.deepStrictEqual(yield* endpoint(name), expected, name)
      }
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("layer merges the options over the defaults, and reads nothing", () =>
    Effect.gen(function*() {
      const endpoint: typeof DockerConfig.Endpoint.Type = { _tag: "Tcp", host: "docker", port: 2376 }
      const env = { DOCKER_HOST: "unix:///x", DOCKER_API_VERSION: "1.45" }
      assert.deepStrictEqual(yield* readAll(DockerConfig.layer()).pipe(withEnv(env)), DockerConfig.defaults)
      assert.deepStrictEqual(
        yield* read(DockerConfig.layer({ endpoint })).pipe(withEnv(env)),
        { endpoint, apiVersion: undefined }
      )
    }))

  it.effect("a value given in overrides wins, and the files it would come from are never read", () =>
    Effect.gen(function*() {
      const { dir, write } = yield* makeConfigDir
      // a broken context and a malformed config.json would fail the layer
      yield* write("config.json", "{ not json")
      const env = { DOCKER_CONFIG: dir, DOCKER_CONTEXT: "missing", DOCKER_API_VERSION: "1.45" }
      const endpoint: typeof DockerConfig.Endpoint.Type = { _tag: "Unix", path: "/run/explicit.sock" }
      // everything but the endpoint, given explicitly
      const rest = {
        apiVersion: undefined,
        authConfig: {},
        auths: { "ghcr.io": { username: "me" } },
        credsStore: undefined,
        credHelpers: {},
        httpHeaders: {},
        proxy: {},
        platform: undefined,
        builder: undefined,
        detachKeys: undefined
      }
      assert.deepStrictEqual(
        yield* readAll(DockerConfig.layerFromEnv({ endpoint, ...rest })).pipe(withEnv(env)),
        { endpoint, ...rest }
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("fails with InvalidConfig for an invalid configuration, and InvalidConfigFile for a malformed file", () =>
    Effect.gen(function*() {
      const { dir, write } = yield* makeConfigDir
      const cases: ReadonlyArray<Partial<DockerConfig.ResolvedConfig>> = [
        { endpoint: { _tag: "Tcp", host: "not a host", port: 2375 } },
        { apiVersion: "1.40" }
      ]
      for (const options of cases) {
        const error = yield* read(DockerConfig.layer(options)).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidConfig", JSON.stringify(options))
      }
      // a variable that doesn't parse fails, naming it, even when overridden
      const variable = yield* read(DockerConfig.layerFromEnv({ apiVersion: "1.50" })).pipe(
        withEnv({ DOCKER_CONFIG: dir, DOCKER_API_VERSION: "latest" }),
        Effect.flip
      )
      assert(variable.reason._tag === "InvalidConfig")
      assert.include(variable.message, "DOCKER_API_VERSION")
      yield* write("config.json", JSON.stringify({ auths: { "ghcr.io": { auth: "not base64!" } } }))
      const file = yield* read(DockerConfig.layerFromEnv()).pipe(
        withEnv({ DOCKER_CONFIG: dir }),
        Effect.flip
      )
      assert(file.reason._tag === "InvalidConfigFile")
      assert.strictEqual(file.reason.source, `${dir}/config.json`)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("reads the configuration once, when the layer is built", () =>
    Effect.gen(function*() {
      const { context, dir, write } = yield* makeConfigDir
      yield* context("first", "unix:///run/first.sock")
      yield* context("second", "unix:///run/second.sock")
      yield* write("config.json", JSON.stringify({ currentContext: "first", HttpHeaders: { "X-Run": "first" } }))
      const context_ = yield* Layer.build(DockerConfig.layerFromEnv()).pipe(withEnv({ DOCKER_CONFIG: dir }))
      yield* write("config.json", JSON.stringify({ currentContext: "second", HttpHeaders: { "X-Run": "second" } }))
      const { endpoint, httpHeaders } = Context.get(context_, DockerConfig.DockerConfig)
      assert.deepStrictEqual(endpoint, { _tag: "Unix", path: "/run/first.sock" })
      assert.deepStrictEqual(httpHeaders, { "X-Run": "first" })
    }).pipe(Effect.provide(NodeServices.layer)))
})
