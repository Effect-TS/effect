/**
 * OpenSSH `known_hosts` support for verifying server host keys.
 *
 * Supports plain and hashed (`|1|salt|hash`) host patterns, `*` / `?`
 * wildcards, negated patterns, non-standard ports written as
 * `[host]:port`, and `@revoked` markers. `@cert-authority` entries are
 * ignored because host certificates are not supported.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Crypto from "../Crypto.ts"
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Layer from "../Layer.ts"
import type * as PlatformError from "../PlatformError.ts"
import * as Result from "../Result.ts"
import { equals, utf8 } from "./internal/wire.ts"
import type { HostKeyInfo, HostKeyVerifier } from "./SshClient.ts"
import { SshError, SshHostKeyError, SshKeyError } from "./SshError.ts"
import * as SshKey from "./SshKey.ts"

/**
 * A single parsed `known_hosts` line.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Entry {
  readonly marker: "cert-authority" | "revoked" | undefined
  readonly hosts: string
  readonly key: SshKey.PublicKey
  readonly line: number
}

/**
 * Parsed contents of a `known_hosts` file.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface KnownHosts {
  readonly entries: ReadonlyArray<Entry>
}

/**
 * Result of checking a host key against `known_hosts`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Status = "Match" | "Mismatch" | "Unknown" | "Revoked"

/**
 * Parses the contents of a `known_hosts` file, skipping blank lines, comments,
 * and lines that cannot be parsed.
 *
 * @stability experimental
 * @category decoding
 * @since 4.0.0
 */
export const parse = (text: string): KnownHosts => {
  const entries: Array<Entry> = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0 || line.startsWith("#")) continue
    const fields = line.split(/\s+/)
    let marker: Entry["marker"]
    if (fields[0].startsWith("@")) {
      const name = fields.shift()!.slice(1)
      if (name !== "cert-authority" && name !== "revoked") continue
      marker = name
    }
    if (fields.length < 3) continue
    const key = SshKey.parsePublicKey(fields.slice(1).join(" "))
    if (Result.isFailure(key)) continue
    entries.push({ marker, hosts: fields[0], key: key.success, line: i + 1 })
  }
  return { entries }
}

/**
 * Returns the lookup name OpenSSH uses for a host and port: the lower-cased
 * host, bracketed with the port when it is not 22.
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const hostName = (host: string, port: number): string => {
  const name = host.toLowerCase()
  return port === 22 ? name : `[${name}]:${port}`
}

const wildcardToRegExp = (pattern: string): RegExp =>
  new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    "i"
  )

const hostKeyError = (kind: SshHostKeyError["kind"], info: HostKeyInfo) =>
  new SshError({
    reason: new SshHostKeyError({
      kind,
      host: hostName(info.host, info.port),
      keyType: info.key.type,
      fingerprint: info.fingerprint
    })
  })

/**
 * Service that verifies server host keys against a set of `known_hosts`
 * entries.
 *
 * **Details**
 *
 * - `check` returns `Revoked` when the key appears in a matching `@revoked`
 *   entry, `Match` when a matching entry has the same key, `Mismatch` when
 *   matching entries list a different key of the same type, and `Unknown`
 *   otherwise.
 * - `verifier` accepts matching keys and rejects revoked and mismatched
 *   ones. Unknown keys are rejected unless the service was created with
 *   `onUnknown` (or `acceptNew` for files) and it accepts them. Its
 *   `keyTypes` makes `SshClient` prefer host key algorithms it can verify.
 * - `formatEntry` formats a `known_hosts` line, optionally hashing the host
 *   name as `ssh-keygen -H` does.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class SshKnownHosts extends Context.Service<SshKnownHosts, {
  readonly entries: ReadonlyArray<Entry>
  readonly matches: (entry: Entry, host: string, port: number) => Effect.Effect<boolean>
  readonly check: (host: string, port: number, key: SshKey.PublicKey) => Effect.Effect<Status>
  readonly keyTypes: (host: string, port: number) => Effect.Effect<ReadonlyArray<string>>
  readonly formatEntry: (
    host: string,
    port: number,
    key: SshKey.PublicKey,
    options?: { readonly hash?: boolean | undefined }
  ) => Effect.Effect<string, SshError>
  readonly verifier: HostKeyVerifier
}>()("effect/ssh/SshKnownHosts") {}

/**
 * Creates the service over `entries`, capturing the `Crypto` service used for
 * hashed entries. `fromFile` appends accepted entries to the array.
 */
const makeService = Effect.fnUntraced(function*(
  entries: ReadonlyArray<Entry>,
  onUnknown: ((info: HostKeyInfo) => Effect.Effect<boolean, SshError>) | undefined
): Effect.fn.Return<SshKnownHosts["Service"], never, Crypto.Crypto> {
  const crypto = yield* Crypto.Crypto

  const matchHashed = (pattern: string, name: string): Effect.Effect<boolean> => {
    const [, , salt, hash] = pattern.split("|")
    if (salt === undefined || hash === undefined) return Effect.succeed(false)
    const saltBytes = Base64.decode(salt)
    const hashBytes = Base64.decode(hash)
    if (Result.isFailure(saltBytes) || Result.isFailure(hashBytes)) return Effect.succeed(false)
    // A hashing failure never counts as a match.
    return crypto.hmac("SHA-1", saltBytes.success, utf8(name)).pipe(
      Effect.map((computed) => equals(computed, hashBytes.success)),
      Effect.orElseSucceed(() => false)
    )
  }

  const matchesPatterns = (hosts: string, name: string): Effect.Effect<boolean> => {
    if (hosts.startsWith("|1|")) return matchHashed(hosts, name)
    let matched = false
    for (const raw of hosts.split(",")) {
      const negated = raw.startsWith("!")
      const pattern = negated ? raw.slice(1) : raw
      if (wildcardToRegExp(pattern).test(name)) {
        if (negated) return Effect.succeed(false)
        matched = true
      }
    }
    return Effect.succeed(matched)
  }

  const check = Effect.fnUntraced(function*(
    host: string,
    port: number,
    key: SshKey.PublicKey
  ) {
    const name = hostName(host, port)
    let status: Status = "Unknown"
    for (const entry of entries) {
      if (entry.marker === "cert-authority") continue
      if (!(yield* matchesPatterns(entry.hosts, name))) continue
      const same = SshKey.equals(entry.key, key)
      if (entry.marker === "revoked") {
        if (same) return "Revoked" as Status
        continue
      }
      if (same) {
        status = "Match"
      } else if (entry.key.type === key.type && status !== "Match") {
        status = "Mismatch"
      }
    }
    return status
  })

  const keyTypes = Effect.fnUntraced(function*(
    host: string,
    port: number
  ) {
    const name = hostName(host, port)
    const types: Array<string> = []
    for (const entry of entries) {
      if (entry.marker !== undefined || types.includes(entry.key.type)) continue
      if (yield* matchesPatterns(entry.hosts, name)) types.push(entry.key.type)
    }
    return types as ReadonlyArray<string>
  })

  const formatEntry = Effect.fnUntraced(function*(
    host: string,
    port: number,
    key: SshKey.PublicKey,
    options?: { readonly hash?: boolean | undefined }
  ) {
    const name = hostName(host, port)
    const keyText = `${key.type} ${Base64.encode(key.blob)}`
    if (options?.hash !== true) return `${name} ${keyText}`
    const { hash, salt } = yield* Effect.gen(function*() {
      const salt = yield* crypto.randomBytes(20)
      return { salt, hash: yield* crypto.hmac("SHA-1", salt, utf8(name)) }
    }).pipe(
      Effect.mapError((cause) =>
        new SshError({ reason: new SshKeyError({ description: "could not hash host name", cause }) })
      )
    )
    return `|1|${Base64.encode(salt)}|${Base64.encode(hash)} ${keyText}`
  })

  const verify = (info: HostKeyInfo): Effect.Effect<void, SshError> =>
    Effect.flatMap(check(info.host, info.port, info.key), (status) => {
      switch (status) {
        case "Match":
          return Effect.void
        case "Unknown":
          return onUnknown === undefined
            ? Effect.fail(hostKeyError("Unknown", info))
            : Effect.flatMap(
              onUnknown(info),
              (accepted) => accepted ? Effect.void : Effect.fail(hostKeyError("Unknown", info))
            )
        default:
          return Effect.fail(hostKeyError(status, info))
      }
    })

  return SshKnownHosts.of({
    entries,
    matches: (entry, host, port) => matchesPatterns(entry.hosts, hostName(host, port)),
    check,
    keyTypes,
    formatEntry,
    verifier: Object.assign(verify, { keyTypes })
  })
})

/**
 * Creates an `SshKnownHosts` service from `known_hosts` contents, capturing
 * the `Crypto` service used for hashed entries.
 *
 * **Details**
 *
 * Accepts the file contents or entries returned by `parse`. Unknown keys are
 * rejected unless `onUnknown` returns `true`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(
  knownHosts: string | KnownHosts,
  options?: {
    readonly onUnknown?: ((info: HostKeyInfo) => Effect.Effect<boolean, SshError>) | undefined
  }
): Effect.fn.Return<SshKnownHosts["Service"], never, Crypto.Crypto> {
  const entries = typeof knownHosts === "string" ? parse(knownHosts).entries : knownHosts.entries
  return yield* makeService(entries, options?.onUnknown)
})

/**
 * Creates an `SshKnownHosts` service backed by a `known_hosts` file.
 *
 * **Details**
 *
 * The file is read when the service is created; a missing file is treated as
 * empty. With `acceptNew: true`, unknown hosts are trusted on first use and
 * appended to the file, matching OpenSSH's `StrictHostKeyChecking=accept-new`;
 * later checks by the same service recognize them. Changed or revoked keys
 * are always rejected.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromFile = Effect.fnUntraced(function*(
  path: string,
  options?: {
    readonly acceptNew?: boolean | undefined
    readonly hashHosts?: boolean | undefined
  }
): Effect.fn.Return<SshKnownHosts["Service"], PlatformError.PlatformError, FileSystem.FileSystem | Crypto.Crypto> {
  const fs = yield* FileSystem.FileSystem
  const exists = yield* fs.exists(path)
  const content = exists ? yield* fs.readFileString(path) : ""
  const entries = [...parse(content).entries]
  let needsNewline = content.length > 0 && !content.endsWith("\n")
  const service: SshKnownHosts["Service"] = yield* makeService(
    entries,
    options?.acceptNew === true
      ? (info) =>
        Effect.gen(function*() {
          const line = yield* service.formatEntry(info.host, info.port, info.key, { hash: options.hashHosts })
          yield* fs.writeFileString(path, `${needsNewline ? "\n" : ""}${line}\n`, { flag: "a" }).pipe(
            Effect.mapError((cause) =>
              new SshError({ reason: new SshKeyError({ description: `could not update ${path}`, cause }) })
            )
          )
          needsNewline = false
          // Remember the new entry so later checks by this service match it.
          entries.push(...parse(line).entries)
          return true
        })
      : undefined
  )
  return service
})

/**
 * Layer that provides `SshKnownHosts` from `known_hosts` contents.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  knownHosts: string | KnownHosts,
  options?: {
    readonly onUnknown?: ((info: HostKeyInfo) => Effect.Effect<boolean, SshError>) | undefined
  }
): Layer.Layer<SshKnownHosts, never, Crypto.Crypto> => Layer.effect(SshKnownHosts, make(knownHosts, options))

/**
 * Layer that provides `SshKnownHosts` backed by a `known_hosts` file.
 *
 * @see {@link fromFile} for the file semantics
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerFromFile = (
  path: string,
  options?: {
    readonly acceptNew?: boolean | undefined
    readonly hashHosts?: boolean | undefined
  }
): Layer.Layer<SshKnownHosts, PlatformError.PlatformError, FileSystem.FileSystem | Crypto.Crypto> =>
  Layer.effect(SshKnownHosts, fromFile(path, options))
