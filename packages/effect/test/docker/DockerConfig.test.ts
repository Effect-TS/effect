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

const basic = (user: string, password: string) => Buffer.from(`${user}:${password}`).toString("base64")

const plain = (credential: DockerConfig.Credential | undefined) =>
  credential === undefined ? undefined : {
    username: credential.username,
    password: credential.password && Redacted.value(credential.password),
    identityToken: credential.identityToken && Redacted.value(credential.identityToken)
  }

/** The `endpoint` and `apiVersion` a layer provides. */
const read = <E, R>(layer: Layer.Layer<DockerConfig.DockerConfig, E, R>) =>
  Effect.gen(function*() {
    const { apiVersion, endpoint } = yield* DockerConfig.DockerConfig
    return { endpoint, apiVersion }
  }).pipe(Effect.provide(layer))

/** The Endpoint `layerFromEnv` finds in an environment. */
const discover = (env: Record<string, string>) =>
  read(DockerConfig.layerFromEnv()).pipe(Effect.map(({ endpoint }) => endpoint), withEnv(env))

/** The Endpoint `layerFromEnv` finds for the Context in `DOCKER_CONTEXT`. */
const contextEndpoint = (name: string, env: Record<string, string>) => discover({ ...env, DOCKER_CONTEXT: name })

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
  describe("parseHost", () => {
    it("parses hosts with the CLI's defaults", () => {
      const cases: ReadonlyArray<readonly [string, typeof DockerConfig.Endpoint.Type]> = [
        ["unix:///run/user/1000/docker.sock", { _tag: "Unix", path: "/run/user/1000/docker.sock" }],
        ["unix://", DockerConfig.defaultEndpoint],
        ["", DockerConfig.defaultEndpoint],
        ["tcp://example.com", { _tag: "Tcp", host: "example.com", port: 2375 }],
        ["TCP://example.com:2376", { _tag: "Tcp", host: "example.com", port: 2376 }],
        ["tcp://:1234", { _tag: "Tcp", host: "localhost", port: 1234 }],
        ["10.0.0.1:2375", { _tag: "Tcp", host: "10.0.0.1", port: 2375 }],
        ["tcp://[::1]:2375", { _tag: "Tcp", host: "::1", port: 2375 }]
      ]
      for (const [host, expected] of cases) {
        assert.deepStrictEqual(DockerConfig.parseHost(host), Result.succeed(expected), host)
      }
    })

    it("rejects unsupported schemes and malformed hosts", () => {
      const cases = [
        ["npipe:////./pipe/docker_engine", "UnsupportedScheme"],
        ["ssh://me@host", "UnsupportedScheme"],
        ["fd://", "UnsupportedScheme"],
        ["http://x", "UnsupportedScheme"],
        ["tcp://host/base", "InvalidHost"],
        ["tcp://host:notaport", "InvalidHost"],
        ["tcp://user@host", "InvalidHost"],
        ["tcp://host:0", "InvalidHost"],
        ["tcp://host:65536", "InvalidHost"],
        ["tcp://exa%20mple", "InvalidHost"]
      ] as const
      for (const [host, reason] of cases) {
        const result = DockerConfig.parseHost(host)
        assert(Result.isFailure(result), host)
        assert.isTrue(DockerConfig.isDockerConfigError(result.failure))
        assert.strictEqual(result.failure.reason._tag, reason, host)
      }
    })
  })

  describe("layerFromEnv finds the Endpoint", () => {
    it.effect("reads DOCKER_HOST and the TLS variables like the CLI", () =>
      Effect.gen(function*() {
        const { dir } = yield* makeConfigDir
        const cases: ReadonlyArray<[Record<string, string>, typeof DockerConfig.Endpoint.Type]> = [
          [{}, DockerConfig.defaultEndpoint],
          // an empty variable counts as unset
          [{ DOCKER_HOST: "", DOCKER_TLS_VERIFY: "" }, DockerConfig.defaultEndpoint],
          // TLS doesn't apply to unix sockets
          [{ DOCKER_HOST: "unix:///tmp/d.sock", DOCKER_TLS_VERIFY: "1" }, { _tag: "Unix", path: "/tmp/d.sock" }],
          // TLS without DOCKER_HOST means tcp://localhost:2376
          [{ DOCKER_TLS: "1" }, { _tag: "Tcp", host: "localhost", port: 2376, tls: { verify: false } }],
          // unlike the CLI, TLS without verification doesn't need ca.pem
          [{ DOCKER_HOST: "tcp://remote:2376", DOCKER_TLS: "1" }, {
            _tag: "Tcp",
            host: "remote",
            port: 2376,
            tls: { verify: false }
          }]
        ]
        for (const [env, expected] of cases) {
          const endpoint = yield* discover({ DOCKER_CONFIG: dir, ...env })
          assert.deepStrictEqual(endpoint, expected, JSON.stringify(env))
        }
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("reads TLS material from DOCKER_CERT_PATH or the config dir", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        yield* write("ca.pem", "CA")
        yield* write("cert.pem", "CERT")
        yield* write("key.pem", "KEY")
        const verified = yield* discover({
          DOCKER_CONFIG: dir,
          DOCKER_HOST: "tcp://remote:2376",
          DOCKER_TLS_VERIFY: "anything"
        })
        assert(verified._tag === "Tcp" && verified.tls !== undefined)
        assert.strictEqual(verified.tls.ca, "CA")
        assert.strictEqual(verified.tls.clientCertificate?.cert, "CERT")
        assert.strictEqual(Redacted.value(verified.tls.clientCertificate!.key), "KEY")
        assert.isTrue(verified.tls.verify)
        // DOCKER_CERT_PATH wins, and DOCKER_TLS alone doesn't verify
        yield* write("certs/cert.pem", "OTHER")
        yield* write("certs/key.pem", "KEY")
        const unverified = yield* discover({
          DOCKER_CONFIG: dir,
          DOCKER_HOST: "tcp://remote:2376",
          DOCKER_TLS: "1",
          DOCKER_CERT_PATH: `${dir}/certs`
        })
        assert(unverified._tag === "Tcp" && unverified.tls !== undefined)
        assert.isFalse(unverified.tls.verify)
        assert.isUndefined(unverified.tls.ca)
        assert.strictEqual(unverified.tls.clientCertificate?.cert, "OTHER")
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("fails when verification needs a missing CA, and ignores a lone client certificate", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        const env = { DOCKER_CONFIG: dir, DOCKER_HOST: "tcp://remote", DOCKER_TLS_VERIFY: "1" }
        const noCa = yield* discover(env).pipe(Effect.flip)
        assert.strictEqual(noCa.reason._tag, "UnreadableCertificate")
        // as in the CLI, a cert.pem without key.pem is ignored
        yield* write("ca.pem", "CA")
        yield* write("cert.pem", "CERT")
        const endpoint = yield* discover(env)
        assert.deepStrictEqual(endpoint, { _tag: "Tcp", host: "remote", port: 2375, tls: { verify: true, ca: "CA" } })
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("DOCKER_HOST beats DOCKER_CONTEXT, which beats currentContext", () =>
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
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("falls back to ~/.docker", () =>
      Effect.gen(function*() {
        const { dir, context } = yield* makeConfigDir
        yield* context("home", "unix:///run/home.sock")
        const fs = yield* FileSystem.FileSystem
        const home = yield* fs.makeTempDirectoryScoped()
        yield* fs.symlink(dir, `${home}/.docker`)
        const endpoint = yield* discover({ HOME: home, DOCKER_CONTEXT: "home" })
        assert.deepStrictEqual(endpoint, { _tag: "Unix", path: "/run/home.sock" })
      }).pipe(Effect.provide(NodeServices.layer)))
  })

  describe("layerFromEnv reads a named Context", () => {
    it.effect("reads its endpoint; \"default\" is the default socket", () =>
      Effect.gen(function*() {
        const { context, dir } = yield* makeConfigDir
        yield* context("pod", "unix:///run/pod.sock")
        assert.deepStrictEqual(
          yield* contextEndpoint("pod", { DOCKER_CONFIG: dir }),
          { _tag: "Unix", path: "/run/pod.sock" }
        )
        assert.deepStrictEqual(
          yield* contextEndpoint("default", { DOCKER_CONFIG: dir }),
          DockerConfig.defaultEndpoint
        )
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("reads TLS material and SkipTLSVerify like the CLI", () =>
      Effect.gen(function*() {
        const { context, dir } = yield* makeConfigDir
        yield* context("remote", "tcp://remote:2376", { tls: ["ca.pem", "cert.pem", "key.pem"] })
        yield* context("insecure", "tcp://insecure:2376", { skipTlsVerify: true })
        yield* context("plain", "tcp://plain:2375")
        // the TLS directory turns TLS on, even an empty one
        yield* context("empty", "tcp://empty:2376", { tls: [] })
        // a lone cert.pem is ignored
        yield* context("lone", "tcp://lone:2376", { tls: ["cert.pem"] })
        const endpoint = (name: string) => contextEndpoint(name, { DOCKER_CONFIG: dir })
        const remote = yield* endpoint("remote")
        assert(remote._tag === "Tcp")
        assert.strictEqual(remote.tls?.ca, "remote-ca.pem")
        assert.strictEqual(Redacted.value(remote.tls!.clientCertificate!.key), "remote-key.pem")
        assert.isTrue(remote.tls?.verify)
        const cases: ReadonlyArray<[string, typeof DockerConfig.Endpoint.Type]> = [
          ["insecure", { _tag: "Tcp", host: "insecure", port: 2376, tls: { verify: false } }],
          ["plain", { _tag: "Tcp", host: "plain", port: 2375 }],
          ["empty", { _tag: "Tcp", host: "empty", port: 2376, tls: { verify: true } }],
          ["lone", { _tag: "Tcp", host: "lone", port: 2376, tls: { verify: true } }]
        ]
        for (const [name, expected] of cases) {
          assert.deepStrictEqual(yield* endpoint(name), expected, name)
        }
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("fails for a missing or malformed context", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        const fail = (name: string) => contextEndpoint(name, { DOCKER_CONFIG: dir }).pipe(Effect.flip)
        assert.strictEqual((yield* fail("missing")).reason._tag, "ContextNotFound")
        yield* write(`contexts/meta/${sha256("broken")}/meta.json`, "{ not json")
        yield* write(`contexts/meta/${sha256("empty")}/meta.json`, JSON.stringify({ Name: "empty", Endpoints: {} }))
        assert.strictEqual((yield* fail("broken")).reason._tag, "InvalidContext")
        assert.strictEqual((yield* fail("empty")).reason._tag, "InvalidContext")
      }).pipe(Effect.provide(NodeServices.layer)))
  })

  describe("layers", () => {
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

    it.effect("every layer fails with InvalidConfig for an invalid configuration", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<Partial<DockerConfig.ResolvedConfig>> = [
          { endpoint: { _tag: "Tcp", host: "docker", port: 0 } },
          { endpoint: { _tag: "Tcp", host: "not a host", port: 2375 } },
          { apiVersion: "1.40" },
          { apiVersion: "latest" }
        ]
        for (const options of cases) {
          const error = yield* read(DockerConfig.layer(options)).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "InvalidConfig", JSON.stringify(options))
        }
        const fromEnv = yield* read(DockerConfig.layerFromEnv()).pipe(
          withEnv({ DOCKER_API_VERSION: "1.2" }),
          Effect.flip
        )
        assert.strictEqual(fromEnv.reason._tag, "InvalidConfig")
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("layerFromEnv reads the Endpoint and DOCKER_API_VERSION", () =>
      Effect.gen(function*() {
        const { dir } = yield* makeConfigDir
        const env = { DOCKER_CONFIG: dir, DOCKER_HOST: "unix:///tmp/env.sock", DOCKER_API_VERSION: "1.45" }
        assert.deepStrictEqual(
          yield* read(DockerConfig.layerFromEnv()).pipe(withEnv(env)),
          { endpoint: { _tag: "Unix", path: "/tmp/env.sock" }, apiVersion: "1.45" }
        )
        assert.deepStrictEqual(
          yield* read(DockerConfig.layerFromEnv()).pipe(withEnv({ DOCKER_CONFIG: dir })),
          { endpoint: DockerConfig.defaultEndpoint, apiVersion: undefined }
        )
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("fails with InvalidConfigFile for a malformed config.json", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        const cases: ReadonlyArray<readonly [string, Record<string, string>]> = [
          ["{ not json", {}],
          [JSON.stringify({ auths: { "ghcr.io": { auth: 5 } } }), {}],
          // `auth` must be base64 `user:password`, as the CLI requires
          [JSON.stringify({ auths: { "ghcr.io": { auth: "not base64!" } } }), {}],
          [JSON.stringify({ auths: { "ghcr.io": { auth: Buffer.from("no-separator").toString("base64") } } }), {}],
          // DOCKER_HOST skips currentContext, but the credentials still need config.json
          ["{ not json", { DOCKER_HOST: "unix:///x" }]
        ]
        for (const [config, env] of cases) {
          yield* write("config.json", config)
          const error = yield* read(DockerConfig.layerFromEnv()).pipe(
            withEnv({ DOCKER_CONFIG: dir, ...env }),
            Effect.flip
          )
          assert(error.reason._tag === "InvalidConfigFile", config)
          assert.strictEqual(error.reason.source, `${dir}/config.json`)
        }
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("fails with InvalidConfig, naming it, for a variable that doesn't parse, even when overridden", () =>
      Effect.gen(function*() {
        const { dir } = yield* makeConfigDir
        const cases: ReadonlyArray<readonly [string, string]> = [
          ["DOCKER_API_VERSION", "latest"],
          ["DOCKER_API_VERSION", "1.40"],
          ["DOCKER_BUILDKIT", "yes"],
          ["DOCKER_AUTH_CONFIG", "{ not json"],
          ["DOCKER_AUTH_CONFIG", JSON.stringify({ auths: { "ghcr.io": { auth: 5 } } })],
          ["DOCKER_AUTH_CONFIG", JSON.stringify({ auths: { "ghcr.io": { auth: "not base64!" } } })]
        ]
        for (const [name, value] of cases) {
          const error = yield* read(
            DockerConfig.layerFromEnv({ apiVersion: "1.50", builder: "buildkit", authConfig: {} })
          )
            .pipe(withEnv({ DOCKER_CONFIG: dir, [name]: value }), Effect.flip)
          assert(error.reason._tag === "InvalidConfig", `${name}=${value}`)
          assert.include(error.message, name)
        }
      }).pipe(Effect.provide(NodeServices.layer)))

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

    it.effect("reads every setting the Docker CLI applies", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        yield* write(
          "config.json",
          JSON.stringify({
            auths: { "ghcr.io": { auth: basic("user", "secret") }, "https://index.docker.io/v1/": {} },
            credsStore: "desktop",
            credHelpers: { "gcr.io": "gcloud" },
            HttpHeaders: { "X-Meta": "1" },
            proxies: { default: { httpProxy: "http://proxy:3128", noProxy: "localhost", ftpProxy: "" } },
            detachKeys: "ctrl-x,x",
            psFormat: "table {{.ID}}"
          })
        )
        const config = yield* readAll(DockerConfig.layerFromEnv()).pipe(withEnv({
          DOCKER_CONFIG: dir,
          DOCKER_AUTH_CONFIG: JSON.stringify({ auths: { "quay.io": { identitytoken: "token" } } }),
          DOCKER_DEFAULT_PLATFORM: "linux/arm64",
          DOCKER_BUILDKIT: "0"
        }))
        assert.deepStrictEqual(plain(config.auths["ghcr.io"]), {
          username: "user",
          password: "secret",
          identityToken: undefined
        })
        // a helper's marker entry is anonymous
        assert.deepStrictEqual(config.auths["https://index.docker.io/v1/"], {})
        assert.strictEqual(Redacted.value(config.authConfig["quay.io"].identityToken!), "token")
        assert.deepStrictEqual(
          {
            credsStore: config.credsStore,
            credHelpers: config.credHelpers,
            httpHeaders: config.httpHeaders,
            proxy: config.proxy,
            platform: config.platform,
            builder: config.builder,
            detachKeys: config.detachKeys
          },
          {
            credsStore: "desktop",
            credHelpers: { "gcr.io": "gcloud" },
            httpHeaders: { "X-Meta": "1" },
            // empty settings are dropped, as the CLI ignores them
            proxy: { httpProxy: "http://proxy:3128", noProxy: "localhost" },
            platform: "linux/arm64",
            builder: "classic",
            detachKeys: "ctrl-x,x"
          }
        )
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("takes the proxy configured for the Endpoint's host, otherwise the default", () =>
      Effect.gen(function*() {
        const { dir, write } = yield* makeConfigDir
        yield* write(
          "config.json",
          JSON.stringify({
            proxies: {
              default: { httpProxy: "http://default:3128" },
              "tcp://remote:2376": { httpProxy: "http://remote:3128" },
              "unix:///run/d.sock": { httpProxy: "http://socket:3128" }
            }
          })
        )
        const cases: ReadonlyArray<readonly [string, string]> = [
          ["tcp://remote:2376", "http://remote:3128"],
          ["unix:///run/d.sock", "http://socket:3128"],
          ["tcp://other:2376", "http://default:3128"]
        ]
        for (const [host, expected] of cases) {
          const { proxy } = yield* readAll(DockerConfig.layerFromEnv()).pipe(
            withEnv({ DOCKER_CONFIG: dir, DOCKER_HOST: host })
          )
          assert.strictEqual(proxy.httpProxy, expected, host)
        }
      }).pipe(Effect.provide(NodeServices.layer)))

    it.effect("reads DOCKER_BUILDKIT as Go's ParseBool", () =>
      Effect.gen(function*() {
        const { dir } = yield* makeConfigDir
        const cases: ReadonlyArray<readonly [string, "classic" | "buildkit"]> = [
          ["1", "buildkit"],
          ["true", "buildkit"],
          ["T", "buildkit"],
          ["0", "classic"],
          ["FALSE", "classic"]
        ]
        for (const [value, expected] of cases) {
          const { builder } = yield* readAll(DockerConfig.layerFromEnv()).pipe(
            withEnv({ DOCKER_CONFIG: dir, DOCKER_BUILDKIT: value })
          )
          assert.strictEqual(builder, expected, value)
        }
        const error = yield* readAll(DockerConfig.layerFromEnv()).pipe(
          withEnv({ DOCKER_CONFIG: dir, DOCKER_BUILDKIT: "yes" }),
          Effect.flip
        )
        assert.strictEqual(error.reason._tag, "InvalidConfig")
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

    it("normalizes registries like the CLI", () => {
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["docker.io", "https://index.docker.io/v1/"],
        ["index.docker.io", "https://index.docker.io/v1/"],
        ["https://index.docker.io/v1/", "https://index.docker.io/v1/"],
        ["https://ghcr.io/v2/", "ghcr.io"],
        ["localhost:5000", "localhost:5000"]
      ]
      for (const [registry, expected] of cases) {
        assert.strictEqual(DockerConfig.normalizeRegistry(registry), expected, registry)
      }
    })
  })
})
