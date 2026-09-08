import md4 from "js-md4"
import { Buffer } from "node:buffer"
import { createHmac, randomBytes } from "node:crypto"
import { ProtocolError } from "./tdsPacket.ts"

const signature = Buffer.from("NTLMSSP\0", "ascii")
const flags = 0xa2888205 // Unicode, NTLM, target info, extended security, version, 128/56
const version = Buffer.from([10, 0, 0, 0, 0, 0, 0, 15])
const hmac = (key: Buffer, data: Buffer): Buffer => createHmac("md5", key).update(data).digest()

export const responseKey = (username: string, domain: string, password: string): Buffer =>
  hmac(
    Buffer.from(md4.arrayBuffer(Buffer.from(password, "utf16le"))),
    Buffer.from(username.toUpperCase() + domain, "utf16le")
  )

export const negotiate = (): Buffer => {
  const out = Buffer.alloc(40)
  signature.copy(out)
  out.writeUInt32LE(1, 8)
  out.writeUInt32LE(flags, 12)
  out.writeUInt32LE(40, 20)
  out.writeUInt32LE(40, 28)
  version.copy(out, 32)
  return out
}

const field = (data: Buffer, offset: number): Buffer => {
  if (offset + 8 > data.length) throw new ProtocolError("Truncated NTLM security buffer")
  const length = data.readUInt16LE(offset)
  const start = data.readUInt32LE(offset + 4)
  if (data.readUInt16LE(offset + 2) < length || start < 48 || start + length > data.length) {
    throw new ProtocolError("Invalid NTLM security buffer")
  }
  return data.subarray(start, start + length)
}

export interface Credentials {
  readonly username: string
  readonly password: string
  readonly domain: string
}

/** MS-NLMP 3.3.2. Optional time/nonce are only for deterministic protocol tests. */
export const authenticate = (
  challenge: Buffer,
  credentials: Credentials,
  options: { readonly nonce?: Buffer; readonly timestamp?: Buffer; readonly negotiate?: Buffer } = {}
): Buffer => {
  if (challenge.length < 48 || !challenge.subarray(0, 8).equals(signature) || challenge.readUInt32LE(8) !== 2) {
    throw new ProtocolError("Invalid NTLM challenge")
  }
  const serverFlags = challenge.readUInt32LE(20)
  if (!(serverFlags & 1) || !(serverFlags & 0x80000) || !(serverFlags & 0x800000)) {
    throw new ProtocolError("Server does not support NTLMv2 target information")
  }
  const target = field(challenge, 40)
  const pairs: Array<Buffer> = []
  let timestamp = options.timestamp
  let serverTimestamp = false
  let avFlags: number | undefined
  let ended = false
  for (let offset = 0; offset < target.length;) {
    if (offset + 4 > target.length) throw new ProtocolError("Truncated NTLM target info")
    const id = target.readUInt16LE(offset)
    const length = target.readUInt16LE(offset + 2)
    if (offset + 4 + length > target.length) throw new ProtocolError("Invalid NTLM target info length")
    if (id === 0) {
      if (length !== 0 || offset + 4 !== target.length) throw new ProtocolError("Invalid NTLM target terminator")
      ended = true
      break
    }
    const value = target.subarray(offset + 4, offset + 4 + length)
    if (id === 7) {
      if (length !== 8 || serverTimestamp) throw new ProtocolError("Invalid NTLM server timestamp")
      timestamp = Buffer.from(value)
      serverTimestamp = true
    }
    if (id === 6) {
      if (length !== 4 || avFlags !== undefined) throw new ProtocolError("Invalid NTLM flags")
      avFlags = value.readUInt32LE(0)
    } else pairs.push(Buffer.from(target.subarray(offset, offset + 4 + length)))
    offset += 4 + length
  }
  if (!ended) throw new ProtocolError("Missing NTLM target terminator")
  const mic = serverTimestamp || !!((avFlags ?? 0) & 2)
  if (avFlags !== undefined || mic) {
    const pair = Buffer.alloc(8)
    pair.writeUInt16LE(6)
    pair.writeUInt16LE(4, 2)
    pair.writeUInt32LE((avFlags ?? 0) | (mic ? 2 : 0), 4)
    pairs.push(pair)
  }
  pairs.push(Buffer.alloc(4))
  const targetInfo = Buffer.concat(pairs)
  const nonce = options.nonce ?? randomBytes(8)
  if (nonce.length !== 8 || (timestamp && timestamp.length !== 8)) {
    throw new ProtocolError("Invalid NTLM nonce or timestamp")
  }
  if (!timestamp) {
    timestamp = Buffer.alloc(8)
    timestamp.writeBigUInt64LE((BigInt(Date.now()) + BigInt("11644473600000")) * BigInt("10000"))
  }
  const blob = Buffer.alloc(28 + targetInfo.length + 4)
  blob[0] = blob[1] = 1
  timestamp.copy(blob, 8)
  nonce.copy(blob, 16)
  targetInfo.copy(blob, 28)
  const key = responseKey(credentials.username, credentials.domain, credentials.password)
  const serverNonce = challenge.subarray(24, 32)
  const proof = hmac(key, Buffer.concat([serverNonce, blob]))
  const ntResponse = Buffer.concat([proof, blob])
  const lmResponse = serverTimestamp
    ? Buffer.alloc(24)
    : Buffer.concat([hmac(key, Buffer.concat([serverNonce, nonce])), nonce])
  const domain = Buffer.from(credentials.domain, "utf16le")
  const username = Buffer.from(credentials.username, "utf16le")
  const hasVersion = !!(serverFlags & 0x02000000)
  const header = Buffer.alloc(64 + (hasVersion ? 8 : 0) + (mic ? 16 : 0))
  signature.copy(header)
  header.writeUInt32LE(3, 8)
  header.writeUInt32LE((flags & serverFlags) >>> 0, 60)
  if (hasVersion) version.copy(header, 64)
  const parts = [header]
  let position = header.length
  for (
    const [offset, data] of [[12, lmResponse], [20, ntResponse], [28, domain], [36, username], [44, Buffer.alloc(0)], [
      52,
      Buffer.alloc(0)
    ]] as const
  ) {
    if (data.length > 65535) throw new ProtocolError("NTLM field too long")
    header.writeUInt16LE(data.length, offset)
    header.writeUInt16LE(data.length, offset + 2)
    header.writeUInt32LE(position, offset + 4)
    parts.push(data)
    position += data.length
  }
  const output = Buffer.concat(parts)
  if (mic) {
    hmac(hmac(key, proof), Buffer.concat([options.negotiate ?? negotiate(), challenge, output])).copy(
      output,
      64 + (hasVersion ? 8 : 0)
    )
  }
  key.fill(0)
  return output
}
