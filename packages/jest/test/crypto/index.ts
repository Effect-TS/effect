import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import * as crypto from "crypto"

// larger numbers mean better security, less
const defaultConfig = {
  // size of the generated hash
  hashBytes: 32,
  // larger salt means hashed passwords are more resistant to rainbow table, but
  // you get diminishing returns pretty fast
  saltBytes: 16,
  // more iterations means an attacker has to take longer to brute force an
  // individual password, so larger is better. however, larger also means longer
  // to hash the password. tune so that hashing the password takes about a
  // second
  iterations: 872791,
  // digest function
  digest: "sha512"
}

type _config = typeof defaultConfig

export interface PBKDF2Config extends _config {}

export const PBKDF2Config = tag<PBKDF2Config>()

export const PBKDF2ConfigLive = L.create(PBKDF2Config).fromEffect(
  T.effectTotal(() => defaultConfig)
)
export const PBKDF2ConfigTest = L.create(PBKDF2Config).fromEffect(
  T.effectTotal(() => ({
    ...defaultConfig,
    iterations: 1
  }))
)

export class InvalidPassword {
  readonly _tag = "InvalidPassword"
}

export function makeCrypto(config: PBKDF2Config) {
  return {
    hashPassword: (password: string) =>
      T.effectAsync<unknown, never, string>((cb) => {
        // generate a salt for pbkdf2
        crypto.randomBytes(config.saltBytes, function (err, salt) {
          if (err) {
            return cb(T.die(err))
          }

          crypto.pbkdf2(
            password,
            salt,
            config.iterations,
            config.hashBytes,
            config.digest,
            function (err, hash) {
              if (err) {
                cb(T.die(err))
                return
              }

              const combined = Buffer.alloc(hash.length + salt.length + 8)

              // include the size of the salt so that we can, during verification,
              // figure out how much of the hash is salt
              combined.writeUInt32BE(salt.length, 0)
              // similarly, include the iteration count
              combined.writeUInt32BE(config.iterations, 4)

              salt.copy(combined, 8)
              hash.copy(combined, salt.length + 8)
              cb(
                pipe(
                  T.succeed(combined),
                  T.map((b) => b.toString("hex"))
                )
              )
            }
          )
        })
      }),
    verifyPassword: (password: string, hashText: string) =>
      T.effectAsync<unknown, InvalidPassword, void>((cb) => {
        const combined = Buffer.from(hashText, "hex")
        // extract the salt and hash from the combined buffer
        const saltBytes = combined.readUInt32BE(0)
        const hashBytes = combined.length - saltBytes - 8
        const iterations = combined.readUInt32BE(4)
        const salt = combined.slice(8, saltBytes + 8)
        const hash = combined.toString("binary", saltBytes + 8)

        // verify the salt and hash against the password
        crypto.pbkdf2(
          password,
          salt,
          iterations,
          hashBytes,
          config.digest,
          function (err, verify) {
            if (err) {
              cb(T.fail(new InvalidPassword()))
            } else {
              if (verify.toString("binary") === hash) {
                cb(T.unit)
              } else {
                cb(T.fail(new InvalidPassword()))
              }
            }
          }
        )
      })
  }
}

export interface Crypto extends ReturnType<typeof makeCrypto> {}

export const Crypto = tag<Crypto>()

export const CryptoLive = L.fromConstructor(Crypto)(makeCrypto)(PBKDF2Config)
