/**
 * SSH user authentication protocol (RFC 4252, RFC 4256).
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import * as Redacted from "../../Redacted.ts"
import type { AuthMethod, KeyboardInteractivePrompt } from "../SshClient.ts"
import { SshAuthenticationError, SshError } from "../SshError.ts"
import type * as SshKey from "../SshKey.ts"
import * as Constants from "./constants.ts"
import * as Crypto from "./crypto.ts"
import type { Transport } from "./transport.ts"
import { protocolError, trySync } from "./transport.ts"
import { Reader, Writer } from "./wire.ts"

type Outcome =
  | { readonly _tag: "Success" }
  | { readonly _tag: "Failure"; readonly allowed: ReadonlyArray<string>; readonly partial: boolean }

const SERVICE = "ssh-connection"

/** @internal */
export interface AuthOptions {
  readonly username: string
  readonly methods: ReadonlyArray<AuthMethod>
  readonly onBanner: ((message: string) => Effect.Effect<void>) | undefined
}

/**
 * Returns the signature algorithms to try for a key, honouring the server's
 * `server-sig-algs` extension when present.
 */
const signatureAlgorithmsFor = (
  keyType: string,
  serverAlgorithms: ReadonlyArray<string> | undefined
): ReadonlyArray<string> => {
  const supported = Crypto.signatureAlgorithmsForKeyType(keyType)
  if (supported.length === 0) {
    // Unknown key types (for example agent-held security keys or
    // certificates) sign with their own type name.
    return [keyType]
  }
  if (serverAlgorithms === undefined) return supported
  const accepted = supported.filter((algorithm) => serverAlgorithms.includes(algorithm))
  return accepted.length > 0 ? accepted : supported
}

/** @internal */
export const authenticate = Effect.fnUntraced(function*(
  transport: Transport,
  options: AuthOptions
): Effect.fn.Return<void, SshError> {
  yield* transport.send(new Writer().byte(Constants.MSG_SERVICE_REQUEST).string("ssh-userauth").finish())
  const accept = yield* transport.receive
  if (accept[0] !== Constants.MSG_SERVICE_ACCEPT) {
    return yield* protocolError(`expected SERVICE_ACCEPT, received message ${accept[0]}`)
  }

  const receive: Effect.Effect<Uint8Array, SshError> = Effect.gen(function*() {
    while (true) {
      const payload = yield* transport.receive
      if (payload[0] !== Constants.MSG_USERAUTH_BANNER) return payload
      if (options.onBanner !== undefined) {
        const message = yield* trySync(() => new Reader(payload, 1).utf8())
        yield* options.onBanner(message)
      }
    }
  })

  const outcome = (payload: Uint8Array): Effect.Effect<Outcome, SshError> => {
    if (payload[0] === Constants.MSG_USERAUTH_SUCCESS) {
      return Effect.succeed({ _tag: "Success" })
    }
    if (payload[0] === Constants.MSG_USERAUTH_FAILURE) {
      return trySync(() => {
        const reader = new Reader(payload, 1)
        return { _tag: "Failure", allowed: reader.nameList(), partial: reader.bool() }
      })
    }
    return Effect.fail(protocolError(`unexpected authentication message ${payload[0]}`))
  }

  const request = (method: string) =>
    new Writer().byte(Constants.MSG_USERAUTH_REQUEST).string(options.username).string(SERVICE).string(method)

  const tryNone = Effect.andThen(transport.send(request("none").finish()), Effect.flatMap(receive, outcome))

  const tryPassword = (password: Redacted.Redacted<string>) =>
    Effect.gen(function*() {
      yield* transport.send(request("password").bool(false).string(Redacted.value(password)).finish())
      const reply = yield* receive
      if (reply[0] === Constants.MSG_USERAUTH_PASSWD_CHANGEREQ) {
        // Password changes are not supported; treat as a failed attempt.
        return { _tag: "Failure", allowed: ["password"], partial: false } as Outcome
      }
      return yield* outcome(reply)
    })

  const tryPublicKey = (signer: SshKey.Signer) =>
    Effect.gen(function*() {
      const blob = signer.publicKey.blob
      const algorithms = signatureAlgorithmsFor(signer.publicKey.type, transport.serverSignatureAlgorithms())
      let last: Outcome = { _tag: "Failure", allowed: ["publickey"], partial: false }
      for (const algorithm of algorithms) {
        yield* transport.send(request("publickey").bool(false).string(algorithm).string(blob).finish())
        const query = yield* receive
        if (query[0] !== Constants.MSG_USERAUTH_PK_OK) {
          last = yield* outcome(query)
          if (last._tag === "Success") return last
          continue
        }
        const signed = new Writer()
          .string(transport.sessionId)
          .byte(Constants.MSG_USERAUTH_REQUEST)
          .string(options.username)
          .string(SERVICE)
          .string("publickey")
          .bool(true)
          .string(algorithm)
          .string(blob)
          .finish()
        const signature = yield* signer.sign(signed, algorithm)
        yield* transport.send(
          request("publickey").bool(true).string(algorithm).string(blob).string(signature).finish()
        )
        last = yield* Effect.flatMap(receive, outcome)
        if (last._tag === "Success" || last.partial) return last
      }
      return last
    })

  const tryKeyboardInteractive = (
    respond: (prompt: KeyboardInteractivePrompt) => Effect.Effect<ReadonlyArray<string>, SshError>
  ) =>
    Effect.gen(function*() {
      yield* transport.send(request("keyboard-interactive").string("").string("").finish())
      while (true) {
        const reply = yield* receive
        if (reply[0] !== Constants.MSG_USERAUTH_INFO_REQUEST) {
          return yield* outcome(reply)
        }
        const prompt = yield* trySync((): KeyboardInteractivePrompt => {
          const reader = new Reader(reply, 1)
          const name = reader.utf8()
          const instruction = reader.utf8()
          reader.utf8()
          const count = reader.uint32()
          const prompts: Array<{ readonly prompt: string; readonly echo: boolean }> = []
          for (let i = 0; i < count; i++) prompts.push({ prompt: reader.utf8(), echo: reader.bool() })
          return { name, instruction, prompts }
        })
        const answers = prompt.prompts.length === 0 ? [] : yield* respond(prompt)
        const writer = new Writer().byte(Constants.MSG_USERAUTH_INFO_RESPONSE).uint32(answers.length)
        for (const answer of answers) writer.string(answer)
        yield* transport.send(writer.finish())
      }
    })

  const methodName = (method: AuthMethod): string => {
    switch (method._tag) {
      case "None":
        return "none"
      case "Password":
        return "password"
      case "PublicKey":
      case "Agent":
        return "publickey"
      case "KeyboardInteractive":
        return "keyboard-interactive"
    }
  }

  const attempted: Array<string> = []
  const initial = yield* tryNone
  if (initial._tag === "Success") return
  let allowed = initial.allowed

  for (const method of options.methods) {
    const name = methodName(method)
    if (name === "none" || !allowed.includes(name)) continue
    if (!attempted.includes(name)) attempted.push(name)
    let result: Outcome
    switch (method._tag) {
      case "Password":
        result = yield* tryPassword(method.password)
        break
      case "KeyboardInteractive":
        result = yield* tryKeyboardInteractive(method.respond)
        break
      case "PublicKey":
        result = yield* tryPublicKey(method.signer)
        break
      case "Agent": {
        const signers = yield* method.identities
        result = { _tag: "Failure", allowed, partial: false }
        for (const signer of signers) {
          result = yield* tryPublicKey(signer)
          if (result._tag === "Success" || result.partial) break
          if (!result.allowed.includes("publickey")) break
        }
        break
      }
      default:
        continue
    }
    if (result._tag === "Success") return
    allowed = result.allowed
  }

  return yield* new SshError({
    reason: new SshAuthenticationError({
      username: options.username,
      allowedMethods: [...allowed],
      attemptedMethods: attempted
    })
  })
})
