/**
 * Registry credentials: which credential a request to a registry sends.
 *
 * `DockerImages`, `DockerPlugins` and `DockerServices` send the credential
 * {@link DockerRegistryAuth} resolves for a registry in `X-Registry-Auth`
 * (a build in `X-Registry-Config`) unless a call passes its own `auth`. The
 * Engine itself never needs them.
 *
 * {@link layer} resolves them as the Docker CLI does, from the `DockerConfig`
 * in context; `NodeDocker` provides it. To resolve credentials another way,
 * such as minting short-lived tokens, provide the service yourself.
 *
 * **Example** (Resolving credentials from a secret store)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Redacted } from "effect"
 * import { DockerRegistryAuth } from "effect/docker"
 *
 * const RegistryAuthLive = Layer.succeed(
 *   DockerRegistryAuth.DockerRegistryAuth,
 *   DockerRegistryAuth.DockerRegistryAuth.of({
 *     credential: (registry) =>
 *       Effect.succeed(
 *         registry === "ghcr.io" ? { username: "ci", password: Redacted.make("token") } : undefined
 *       )
 *   })
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as ChildProcess from "../process/ChildProcess.ts"
import * as ChildProcessSpawner from "../process/ChildProcessSpawner.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import type { AuthConfig } from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import { CredentialsUnavailable, DockerError } from "./DockerError.ts"

/**
 * The registry credentials of `effect/docker`.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerRegistryAuth extends Context.Service<DockerRegistryAuth, {
  /**
   * The credential for a registry, as an image reference names it
   * (`ghcr.io`, `docker.io`); `undefined` means anonymous.
   */
  readonly credential: (registry: string) => Effect.Effect<DockerConfig.Credential | undefined, DockerError>
}>()("effect/docker/DockerRegistryAuth") {}

/** How long a credential helper may take. */
const helperTimeout = Duration.minutes(1)

/** What a credential helper answers when it has no credentials for a registry. */
const helperNotFound = "credentials not found in native keychain"

const HelperOutput = Schema.Struct({ Username: Schema.String, Secret: Schema.String })

const decodeHelperOutput = Schema.decodeUnknownEffect(Schema.fromJsonString(HelperOutput))

const unavailable = (registry: string, message: string, options?: { helper?: string; cause?: unknown }) =>
  new DockerError({ reason: new CredentialsUnavailable({ registry, message, ...options }) })

const isAnonymous = (credential: DockerConfig.Credential) =>
  credential.username === undefined && credential.password === undefined && credential.identityToken === undefined

/** The entry for a normalized registry: under its own key, else under any key that normalizes to it. */
const lookup = <A>(entries: Readonly<Record<string, A>>, key: string): A | undefined =>
  Object.hasOwn(entries, key)
    ? entries[key]
    : Object.entries(entries).find(([registry]) => DockerConfig.normalizeRegistry(registry) === key)?.[1]

const runHelper = (
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"],
  helper: string,
  registry: string
): Effect.Effect<DockerConfig.Credential | undefined, DockerError> => {
  const program = `docker-credential-${helper}`
  return Effect.scoped(Effect.gen(function*() {
    const handle = yield* spawner.spawn(ChildProcess.make(program, ["get"], {
      stdin: Stream.make(new TextEncoder().encode(registry))
    }))
    const [stdout, stderr, exitCode] = yield* Effect.all([
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
      handle.exitCode
    ], { concurrency: "unbounded" })
    if (exitCode !== 0) {
      // the helper protocol answers on stdout
      if (stdout.trim() === helperNotFound) return undefined
      return yield* unavailable(registry, `${program} get exited with ${exitCode}: ${stdout.trim() || stderr.trim()}`, {
        helper
      })
    }
    const output = yield* decodeHelperOutput(stdout.trim()).pipe(
      Effect.mapError((cause) => unavailable(registry, `${program} get answered malformed JSON`, { helper, cause }))
    )
    const credential: DockerConfig.Credential = output.Username === "<token>"
      ? { identityToken: Redacted.make(output.Secret) }
      : { username: output.Username, password: Redacted.make(output.Secret) }
    return credential
  })).pipe(
    Effect.catchTag(
      "PlatformError",
      (cause) => Effect.fail(unavailable(registry, `Failed to run ${program}: ${cause.message}`, { helper, cause }))
    ),
    Effect.timeoutOrElse({
      duration: helperTimeout,
      orElse: () => Effect.fail(unavailable(registry, `${program} get took longer than a minute`, { helper }))
    })
  )
}

/** Resolves credentials as the Docker CLI does, see {@link make}. */
const makeCredential = (
  config: DockerConfig.ResolvedConfig,
  spawner: ChildProcessSpawner.ChildProcessSpawner["Service"]
) =>
(registry: string): Effect.Effect<DockerConfig.Credential | undefined, DockerError> => {
  const key = DockerConfig.normalizeRegistry(registry)
  const fromEnvironment = lookup(config.authConfig, key)
  if (fromEnvironment !== undefined && !isAnonymous(fromEnvironment)) return Effect.succeed(fromEnvironment)
  const helper = lookup(config.credHelpers, key) ?? config.credsStore
  if (helper !== undefined && helper !== "") return runHelper(spawner, helper, key)
  const entry = lookup(config.auths, key)
  return Effect.succeed(entry === undefined || isAnonymous(entry) ? undefined : entry)
}

/**
 * A credential as the Engine's `AuthConfig` for a registry, addressed by the
 * registry normalized as the Engine looks it up.
 *
 * @internal
 */
export const authConfig = (registry: string, credential: DockerConfig.Credential): AuthConfig => ({
  ...credential,
  serverAddress: DockerConfig.normalizeRegistry(registry)
})

/**
 * `X-Registry-Auth` for a registry: the call's `auth`, otherwise the
 * credential `registryAuth` resolves; anonymous as `{}`.
 *
 * @internal
 */
export const registryAuthHeader = (
  registryAuth: DockerRegistryAuth["Service"],
  registry: string,
  auth: DockerConfig.Credential | undefined
): Effect.Effect<AuthConfig, DockerError> =>
  Effect.map(
    auth !== undefined ? Effect.succeed(auth) : registryAuth.credential(registry),
    (credential) => credential === undefined ? {} : authConfig(registry, credential)
  )

/**
 * Builds a {@link DockerRegistryAuth} that resolves credentials as the Docker
 * CLI does, from the `DockerConfig` in context.
 *
 * **Details**
 *
 * For every request that needs them, the registry is normalized with
 * `DockerConfig.normalizeRegistry`, then looked up in `authConfig`
 * (`DOCKER_AUTH_CONFIG`), then asked of its credential helper (`credHelpers`,
 * else `credsStore`), else looked up in `auths`. The `ChildProcessSpawner`
 * runs helpers as `docker-credential-<name> get`, every time, because helper
 * tokens are short-lived. A helper that answers "credentials not found in
 * native keychain" means anonymous; one that fails, answers malformed JSON or
 * takes longer than a minute fails with `CredentialsUnavailable`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<
  DockerRegistryAuth["Service"],
  never,
  DockerConfig.DockerConfig | ChildProcessSpawner.ChildProcessSpawner
> = Effect.gen(function*() {
  const config = yield* DockerConfig.DockerConfig
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return DockerRegistryAuth.of({ credential: makeCredential(config, spawner) })
})

/**
 * Provides {@link DockerRegistryAuth} as the Docker CLI resolves credentials,
 * built with {@link make}.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<
  DockerRegistryAuth,
  never,
  DockerConfig.DockerConfig | ChildProcessSpawner.ChildProcessSpawner
> = Layer.effect(DockerRegistryAuth, make)
