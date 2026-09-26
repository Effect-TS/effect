/**
 * Authentication plugin computations for the MySQL handshake.
 *
 * Every function here is pure: it takes a password and the server's challenge
 * and returns the bytes to send back. Nothing here reads a socket, and nothing
 * here generates randomness — the scramble always comes from the server.
 *
 * Two plugins are implemented. `mysql_native_password` is the legacy SHA-1
 * exchange. `caching_sha2_password` is the MySQL 8 default: it first tries a
 * fast exchange against the server's password cache, and on a cache miss falls
 * back to full authentication, which needs either a TLS connection or an RSA
 * key exchange because the server has to see the password itself.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Result from "effect/Result"
import * as crypto from "node:crypto"

/**
 * A failure computing an authentication response.
 *
 * @category errors
 * @since 4.0.0
 */
export class AuthError extends Data.TaggedError("MysqlAuthError")<{
  readonly message: string
}> {}

/**
 * The length of the scramble the server sends in its handshake.
 *
 * @category constants
 * @since 4.0.0
 */
export const scrambleLength = 20

/**
 * Status bytes the server sends in an `AuthMoreData` packet during a
 * `caching_sha2_password` exchange.
 *
 * @category constants
 * @since 4.0.0
 */
export const CachingSha2 = {
  /** The password matched the server's cache; the next packet is the OK. */
  fastAuthSuccess: 0x03,
  /** The cache missed; the client must complete full authentication. */
  fullAuthRequired: 0x04,
  /** Sent by the client to ask for the server's RSA public key. */
  requestPublicKey: 0x02
} as const

/**
 * Bytes the `sha256_password` exchange uses.
 *
 * **Gotchas**
 *
 * It asks for the server's public key with a different byte than
 * `caching_sha2_password` does, and has no fast path: the server never holds a
 * cached verdict for it.
 *
 * @category constants
 * @since 4.0.0
 */
export const Sha256 = {
  /** Sent by the client to ask for the server's RSA public key. */
  requestPublicKey: 0x01
} as const

const digest = (algorithm: string, ...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const hash = crypto.createHash(algorithm)
  for (const part of parts) hash.update(part)
  return new Uint8Array(hash.digest())
}

const xorInto = (target: Uint8Array, mask: Uint8Array): Uint8Array => {
  for (let index = 0; index < target.length; index++) {
    target[index] ^= mask[index % mask.length]
  }
  return target
}

const result = <A>(evaluate: () => A): Result.Result<A, AuthError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof AuthError) return Result.fail(error)
    return Result.fail(new AuthError({ message: error instanceof Error ? error.message : String(error) }))
  }
}

const requireScramble = (scramble: Uint8Array): Uint8Array => {
  if (scramble.length !== scrambleLength) {
    throw new AuthError({ message: `Expected a ${scrambleLength}-byte scramble, got ${scramble.length}` })
  }
  return scramble
}

const passwordBytes = (password: string): Uint8Array => new Uint8Array(Buffer.from(password, "utf8"))

/**
 * Computes a `mysql_native_password` response.
 *
 * **Details**
 *
 * The response is `SHA1(password)` XOR `SHA1(scramble || SHA1(SHA1(password)))`,
 * which lets the server verify the password from the `SHA1(SHA1(password))` it
 * stores without ever seeing the password. An empty password sends no bytes at
 * all.
 *
 * @category authentication
 * @since 4.0.0
 */
export const nativePassword = (options: {
  readonly password: string
  readonly scramble: Uint8Array
}): Result.Result<Uint8Array, AuthError> =>
  result(() => {
    if (options.password.length === 0) return new Uint8Array(0)
    const scramble = requireScramble(options.scramble)
    const stage1 = digest("sha1", passwordBytes(options.password))
    const stage2 = digest("sha1", stage1)
    return xorInto(stage1, digest("sha1", scramble, stage2))
  })

/**
 * Computes the fast-path `caching_sha2_password` response, the one sent in the
 * initial handshake response.
 *
 * **Details**
 *
 * The response is `SHA256(password)` XOR
 * `SHA256(SHA256(SHA256(password)) || scramble)`. The server answers with
 * `fastAuthSuccess` when its cache already holds the password, and
 * `fullAuthRequired` when it does not.
 *
 * @category authentication
 * @since 4.0.0
 */
export const cachingSha2Password = (options: {
  readonly password: string
  readonly scramble: Uint8Array
}): Result.Result<Uint8Array, AuthError> =>
  result(() => {
    if (options.password.length === 0) return new Uint8Array(0)
    const scramble = requireScramble(options.scramble)
    const stage1 = digest("sha256", passwordBytes(options.password))
    const stage2 = digest("sha256", stage1)
    return xorInto(stage1, digest("sha256", stage2, scramble))
  })

/**
 * Produces the cleartext password to send during full `caching_sha2_password`
 * authentication over a TLS connection.
 *
 * **Gotchas**
 *
 * The password is NUL-terminated and otherwise unprotected, so this must only
 * ever be written to an encrypted socket. Use `encryptedPassword` on a
 * plaintext connection.
 *
 * @category authentication
 * @since 4.0.0
 */
export const cleartextPassword = (password: string): Uint8Array => {
  const bytes = passwordBytes(password)
  const out = new Uint8Array(bytes.length + 1)
  out.set(bytes)
  return out
}

/**
 * Encrypts the password for full `caching_sha2_password` authentication over a
 * plaintext connection, using the RSA public key the server supplied.
 *
 * **Details**
 *
 * The NUL-terminated password is first XOR'd with the scramble, repeated
 * cyclically, so a captured ciphertext cannot be replayed against a different
 * handshake. The result is encrypted with OAEP padding.
 *
 * @category authentication
 * @since 4.0.0
 */
export const encryptedPassword = (options: {
  readonly password: string
  readonly scramble: Uint8Array
  /** The server's public key, as the PEM text of its `AuthMoreData` packet. */
  readonly publicKey: string
  /** The OAEP digest. MySQL's default is SHA-1. */
  readonly oaepHash?: string | undefined
}): Result.Result<Uint8Array, AuthError> =>
  result(() => {
    const scramble = requireScramble(options.scramble)
    const obfuscated = xorInto(cleartextPassword(options.password), scramble)
    return new Uint8Array(crypto.publicEncrypt({
      key: options.publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: options.oaepHash ?? "sha1"
    }, obfuscated))
  })

/**
 * Computes the response for a named authentication plugin.
 *
 * **Details**
 *
 * This covers the initial handshake response and an `AuthSwitchRequest`, both
 * of which name a plugin and supply a scramble. Full `caching_sha2_password`
 * authentication is not reachable from here: it is driven by `AuthMoreData`
 * packets that arrive afterwards.
 *
 * @category authentication
 * @since 4.0.0
 */
export type Reply = Data.TaggedEnum<{
  /** Bytes that answer the server's challenge. */
  readonly Respond: { readonly bytes: Uint8Array }
  /**
   * Bytes that ask for the server's RSA public key. The reply to those is the
   * key itself rather than a verdict, so the exchange has one more step.
   */
  readonly RequestPublicKey: { readonly bytes: Uint8Array }
}>

/**
 * Constructors and guards for `Reply`.
 *
 * @category models
 * @since 4.0.0
 */
export const Reply = Data.taggedEnum<Reply>()

/**
 * Answers a plugin's challenge.
 *
 * **Details**
 *
 * This covers the initial handshake response and an `AuthSwitchRequest`, both
 * of which name a plugin and supply a scramble. Whether the connection is
 * encrypted decides what the SHA-256 plugins may send: over TLS they hand the
 * password over as it is, and otherwise they ask for a key to encrypt it with.
 *
 * @category authentication
 * @since 4.0.0
 */
export const respond = (options: {
  readonly plugin: string
  readonly password: string
  readonly scramble: Uint8Array
  readonly usingTls: boolean
}): Result.Result<Reply, AuthError> => {
  const respondWith = (result: Result.Result<Uint8Array, AuthError>) =>
    Result.map(result, (bytes) => Reply.Respond({ bytes }))
  switch (options.plugin) {
    case "mysql_native_password":
      return respondWith(nativePassword(options))
    case "caching_sha2_password":
      return respondWith(cachingSha2Password(options))
    case "sha256_password": {
      // No cached verdict exists for this plugin, so the password has to reach
      // the server on the first attempt, one way or the other.
      if (options.usingTls || options.password.length === 0) {
        return Result.succeed(Reply.Respond({ bytes: cleartextPassword(options.password) }))
      }
      return Result.succeed(
        Reply.RequestPublicKey({ bytes: new Uint8Array([Sha256.requestPublicKey]) })
      )
    }
    case "mysql_clear_password": {
      // The server asks for this when the account is backed by PAM, LDAP or
      // Kerberos, which need the password itself. It travels unprotected, so
      // there is no safe version of it on a plaintext socket.
      if (!options.usingTls) {
        return Result.fail(
          new AuthError({
            message: "mysql_clear_password sends the password in the clear and requires TLS"
          })
        )
      }
      return Result.succeed(Reply.Respond({ bytes: cleartextPassword(options.password) }))
    }
    default:
      return Result.fail(
        new AuthError({ message: `Unsupported authentication plugin "${options.plugin}"` })
      )
  }
}
