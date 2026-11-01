import * as Effect from "../../Effect.ts"
import type { AuthConfig } from "../DockerApi.ts"
import * as DockerConfig from "../DockerConfig.ts"
import type { DockerError } from "../DockerError.ts"
import type { DockerRegistryAuth } from "../DockerRegistryAuth.ts"

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
