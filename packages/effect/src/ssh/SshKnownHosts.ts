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
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as FileSystem from "../FileSystem.ts"
import type * as PlatformError from "../PlatformError.ts"
import * as Result from "../Result.ts"
import * as Crypto from "./internal/crypto.ts"
import { copy, equals, utf8 } from "./internal/wire.ts"
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

const matchHashed = async (pattern: string, name: string): Promise<boolean> => {
  const [, , salt, hash] = pattern.split("|")
  if (salt === undefined || hash === undefined) return false
  const saltBytes = Base64.decode(salt)
  const hashBytes = Base64.decode(hash)
  if (Result.isFailure(saltBytes) || Result.isFailure(hashBytes)) return false
  const computed = await Crypto.hmac("SHA-1", copy(saltBytes.success), utf8(name))
  return equals(computed, hashBytes.success)
}

const matchesPatterns = async (hosts: string, name: string): Promise<boolean> => {
  if (hosts.startsWith("|1|")) return matchHashed(hosts, name)
  let matched = false
  for (const raw of hosts.split(",")) {
    const negated = raw.startsWith("!")
    const pattern = negated ? raw.slice(1) : raw
    if (wildcardToRegExp(pattern).test(name)) {
      if (negated) return false
      matched = true
    }
  }
  return matched
}

/**
 * Returns `true` when an entry applies to a host and port.
 *
 * @stability experimental
 * @category predicates
 * @since 4.0.0
 */
export const matches = (entry: Entry, host: string, port: number): Effect.Effect<boolean> =>
  Effect.promise(() => matchesPatterns(entry.hosts, hostName(host, port)))

/**
 * Checks a server host key against `known_hosts`.
 *
 * **Details**
 *
 * Returns `Revoked` when the key appears in a matching `@revoked` entry,
 * `Match` when a matching entry has the same key, `Mismatch` when matching
 * entries list a different key of the same type, and `Unknown` otherwise.
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const check = (
  knownHosts: KnownHosts,
  host: string,
  port: number,
  key: SshKey.PublicKey
): Effect.Effect<Status> =>
  Effect.promise(async () => {
    const name = hostName(host, port)
    let status: Status = "Unknown"
    for (const entry of knownHosts.entries) {
      if (entry.marker === "cert-authority") continue
      if (!(await matchesPatterns(entry.hosts, name))) continue
      const same = SshKey.equals(entry.key, key)
      if (entry.marker === "revoked") {
        if (same) return "Revoked"
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

/**
 * Returns the key types recorded for a host, used to prefer host key
 * algorithms that can be verified.
 *
 * @stability experimental
 * @category getters
 * @since 4.0.0
 */
export const keyTypes = (knownHosts: KnownHosts, host: string, port: number): Effect.Effect<ReadonlyArray<string>> =>
  Effect.promise(async () => {
    const name = hostName(host, port)
    const types: Array<string> = []
    for (const entry of knownHosts.entries) {
      if (entry.marker !== undefined || types.includes(entry.key.type)) continue
      if (await matchesPatterns(entry.hosts, name)) types.push(entry.key.type)
    }
    return types
  })

/**
 * Formats a `known_hosts` line for a host key, optionally hashing the host
 * name as `ssh-keygen -H` does.
 *
 * @stability experimental
 * @category encoding
 * @since 4.0.0
 */
export const formatEntry = (
  host: string,
  port: number,
  key: SshKey.PublicKey,
  options?: { readonly hash?: boolean | undefined }
): Effect.Effect<string> =>
  Effect.promise(async () => {
    const name = hostName(host, port)
    const keyText = `${key.type} ${Base64.encode(key.blob)}`
    if (options?.hash !== true) return `${name} ${keyText}`
    const salt = Crypto.randomBytes(20)
    const hash = await Crypto.hmac("SHA-1", salt, utf8(name))
    return `|1|${Base64.encode(salt)}|${Base64.encode(hash)} ${keyText}`
  })

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
 * Creates a host key verifier from parsed `known_hosts` contents.
 *
 * **Details**
 *
 * Matching keys are accepted. Revoked and mismatched keys are rejected.
 * Unknown keys are rejected unless `onUnknown` returns `true`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const verifier = (
  knownHosts: KnownHosts,
  options?: {
    readonly onUnknown?: ((info: HostKeyInfo) => Effect.Effect<boolean, SshError>) | undefined
  }
): HostKeyVerifier =>
  Object.assign(
    (info: HostKeyInfo): Effect.Effect<void, SshError> =>
      Effect.flatMap(check(knownHosts, info.host, info.port, info.key), (status) => {
        switch (status) {
          case "Match":
            return Effect.void
          case "Unknown":
            return options?.onUnknown === undefined
              ? Effect.fail(hostKeyError("Unknown", info))
              : Effect.flatMap(
                options.onUnknown(info),
                (accepted) => accepted ? Effect.void : Effect.fail(hostKeyError("Unknown", info))
              )
          default:
            return Effect.fail(hostKeyError(status, info))
        }
      }),
    {
      keyTypes: (host: string, port: number) => keyTypes(knownHosts, host, port)
    }
  )

/**
 * Creates a host key verifier backed by a `known_hosts` file.
 *
 * **Details**
 *
 * The file is read when the verifier is created; a missing file is treated
 * as empty. With `acceptNew: true`, unknown hosts are trusted on first use and
 * appended to the file, matching OpenSSH's `StrictHostKeyChecking=accept-new`.
 * Changed or revoked keys are always rejected.
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
): Effect.fn.Return<HostKeyVerifier, PlatformError.PlatformError, FileSystem.FileSystem> {
  const fs = yield* FileSystem.FileSystem
  const exists = yield* fs.exists(path)
  const content = exists ? yield* fs.readFileString(path) : ""
  const entries = [...parse(content).entries]
  const knownHosts: KnownHosts = { entries }
  let needsNewline = content.length > 0 && !content.endsWith("\n")
  return verifier(knownHosts, {
    onUnknown: options?.acceptNew === true
      ? (info) =>
        Effect.gen(function*() {
          const line = yield* formatEntry(info.host, info.port, info.key, { hash: options.hashHosts })
          yield* fs.writeFileString(path, `${needsNewline ? "\n" : ""}${line}\n`, { flag: "a" }).pipe(
            Effect.mapError((cause) =>
              new SshError({ reason: new SshKeyError({ description: `could not update ${path}`, cause }) })
            )
          )
          needsNewline = false
          // Remember the new entry so later checks with this verifier match it.
          entries.push(...parse(line).entries)
          return true
        })
      : undefined
  })
})
