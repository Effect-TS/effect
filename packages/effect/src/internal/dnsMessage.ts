// DNS message encoding and decoding (RFC 1035, EDNS(0) from RFC 6891).
import * as Data from "../Data.ts"
import * as Duration from "../Duration.ts"
import * as Dns from "../net/Dns.ts"
import type * as DnsClient from "../net/DnsClient.ts"
import * as Host from "../net/Host.ts"
import * as NetAddress from "../net/NetAddress.ts"
import * as Result from "../Result.ts"

/** @internal */
export class DnsMessageError extends Data.TaggedError("DnsMessageError")<{
  readonly message: string
  readonly offset: number
}> {}

/** @internal */
export const typeCodes: { readonly [K in Dns.RecordType]: number } = {
  A: 1,
  AAAA: 28,
  CAA: 257,
  CNAME: 5,
  MX: 15,
  NAPTR: 35,
  NS: 2,
  PTR: 12,
  SOA: 6,
  SRV: 33,
  TXT: 16
}

const OPT = 41
const CLASS_IN = 1
const MAX_NAME_LENGTH = 255

// =============================================================================
// Encoding
// =============================================================================

/**
 * Encodes a query with one question of the internet class. Domain names are
 * validated ASCII of at most 253 characters, so encoding cannot fail.
 *
 * @internal
 */
export const encodeQuery = (options: {
  readonly id: number
  readonly name: Host.DomainName
  readonly type: number
  readonly recursionDesired: boolean
  readonly udpPayloadSize: number | undefined
}): Uint8Array => {
  const name = options.name.endsWith(".") ? options.name.slice(0, -1) : options.name
  const labels = name === "" ? [] : name.split(".")
  const nameLength = labels.reduce((length, label) => length + label.length + 1, 1)
  const udpPayloadSize = options.udpPayloadSize
  const bytes = new Uint8Array(12 + nameLength + 4 + (udpPayloadSize === undefined ? 0 : 11))
  const view = new DataView(bytes.buffer)
  view.setUint16(0, options.id)
  view.setUint16(2, options.recursionDesired ? 0x0100 : 0)
  view.setUint16(4, 1)
  view.setUint16(10, udpPayloadSize === undefined ? 0 : 1)
  let offset = 12
  for (const label of labels) {
    bytes[offset++] = label.length
    for (let i = 0; i < label.length; i++) bytes[offset++] = label.charCodeAt(i)
  }
  bytes[offset++] = 0
  view.setUint16(offset, options.type)
  view.setUint16(offset + 2, CLASS_IN)
  if (udpPayloadSize !== undefined) {
    // OPT record: root owner, type, UDP payload size as class, zero TTL and RDATA.
    view.setUint16(offset + 5, OPT)
    view.setUint16(offset + 7, udpPayloadSize)
  }
  return bytes
}

// =============================================================================
// Decoding
// =============================================================================

/** @internal */
export interface Question {
  readonly name: string
  readonly type: number
  readonly class: number
}

/** @internal */
export interface Header {
  readonly id: number
  readonly isResponse: boolean
  readonly opcode: number
  readonly flags: DnsClient.Response["flags"]
  readonly rcode: number
  readonly questions: ReadonlyArray<Question>
}

const utf8 = new TextDecoder("utf-8", { ignoreBOM: true })
const latin1 = new TextDecoder("latin1")

// Escapes a label in presentation format (RFC 1035, section 5.1).
const formatLabel = (label: Uint8Array): string => {
  let out = ""
  for (const byte of label) {
    out += byte === 0x2e || byte === 0x5c
      ? `\\${String.fromCharCode(byte)}`
      : byte <= 0x20 || byte >= 0x7f
      ? `\\${byte.toString().padStart(3, "0")}`
      : String.fromCharCode(byte)
  }
  return out
}

// Malformed input throws a `DnsMessageError`, which `decode` returns as a failure.
class MessageReader {
  readonly bytes: Uint8Array
  readonly view: DataView
  offset = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  fail(message: string, offset = this.offset): never {
    throw new DnsMessageError({ message, offset })
  }

  need(length: number, what: string): void {
    if (this.offset + length > this.bytes.length) this.fail(`truncated ${what}`)
  }

  u8(what: string): number {
    this.need(1, what)
    return this.bytes[this.offset++]
  }

  u16(what: string): number {
    this.need(2, what)
    const value = this.view.getUint16(this.offset)
    this.offset += 2
    return value
  }

  u32(what: string): number {
    this.need(4, what)
    const value = this.view.getUint32(this.offset)
    this.offset += 4
    return value
  }

  take(length: number, what: string): Uint8Array {
    this.need(length, what)
    return this.bytes.subarray(this.offset, this.offset += length)
  }

  characterString(what: string): string {
    return utf8.decode(this.take(this.u8(what), what))
  }

  // Reads a possibly compressed name in presentation format. Every pointer must
  // point before the labels read since the previous jump, so pointers strictly
  // decrease and cannot loop.
  name(what: string): string {
    const bytes = this.bytes
    const labels: Array<string> = []
    let position = this.offset
    let limit = position
    let next = -1
    let length = 1
    while (true) {
      if (position >= bytes.length) this.fail(`truncated ${what}`, position)
      const byte = bytes[position]
      if (byte === 0) {
        if (next === -1) next = position + 1
        break
      }
      switch (byte & 0xc0) {
        case 0x00: {
          length += byte + 1
          if (length > MAX_NAME_LENGTH) this.fail(`${what} is longer than ${MAX_NAME_LENGTH} bytes`, position)
          if (position + 1 + byte > bytes.length) this.fail(`truncated ${what}`, position)
          labels.push(formatLabel(bytes.subarray(position + 1, position + 1 + byte)))
          position += 1 + byte
          break
        }
        case 0xc0: {
          if (position + 1 >= bytes.length) this.fail(`truncated ${what}`, position)
          const target = ((byte & 0x3f) << 8) | bytes[position + 1]
          if (target >= limit) this.fail(`${what} has a compression pointer that does not point backward`, position)
          if (next === -1) next = position + 2
          position = limit = target
          break
        }
        default:
          this.fail(`${what} has an unsupported label type`, position)
      }
    }
    this.offset = next
    return labels.length === 0 ? "." : `${labels.join(".")}.`
  }
}

const domainName = (name: string): Host.DomainName | undefined => Result.getOrUndefined(Host.domainNameFromString(name))

// Fields may hold `undefined` for names that are not valid domain names, which
// `makeRecord` rejects.
const record = <T extends Dns.RecordType>(
  type: T,
  fields: { readonly [K in keyof Dns.RecordFields<T>]: Dns.RecordFields<T>[K] | undefined }
): Dns.DnsRecord | undefined => Result.getOrUndefined(Dns.makeRecord(type, fields as Dns.RecordFields<T>))

const exactLength = (reader: MessageReader, end: number, length: number, type: string): void => {
  if (end - reader.offset !== length) reader.fail(`${type} record data must be ${length} bytes`)
}

// Reads record data up to `end`, returning `undefined` for well-formed data that
// `Dns` cannot represent and failing for data that is malformed.
const readData = (reader: MessageReader, type: number, end: number): Dns.DnsRecord | undefined => {
  switch (type) {
    case typeCodes.A:
      exactLength(reader, end, 4, "A")
      return record("A", { address: NetAddress.ipv4FromBytesUnsafe(reader.take(4, "A record")) })
    case typeCodes.AAAA:
      exactLength(reader, end, 16, "AAAA")
      return record("AAAA", { address: NetAddress.ipv6FromBytesUnsafe(reader.take(16, "AAAA record")) })
    case typeCodes.CAA: {
      const flags = reader.u8("CAA flags")
      const tag = latin1.decode(reader.take(reader.u8("CAA tag"), "CAA tag"))
      if (reader.offset > end) reader.fail("CAA tag exceeds the record data")
      const value = utf8.decode(reader.take(end - reader.offset, "CAA value"))
      // Only the issuer critical flag (bit 7) is defined; other flag bits are reserved.
      return record("CAA", { critical: (flags & 0x80) !== 0, tag, value })
    }
    case typeCodes.CNAME:
      return record("CNAME", { target: domainName(reader.name("CNAME target")) })
    case typeCodes.MX: {
      const priority = reader.u16("MX priority")
      return record("MX", { priority, exchange: domainName(reader.name("MX exchange")) })
    }
    case typeCodes.NAPTR: {
      const order = reader.u16("NAPTR order")
      const preference = reader.u16("NAPTR preference")
      const flags = reader.characterString("NAPTR flags")
      const service = reader.characterString("NAPTR service")
      const regexp = reader.characterString("NAPTR regexp")
      const replacement = domainName(reader.name("NAPTR replacement"))
      return record("NAPTR", { order, preference, flags, service, regexp, replacement })
    }
    case typeCodes.NS:
      return record("NS", { host: domainName(reader.name("NS host")) })
    case typeCodes.PTR:
      return record("PTR", { host: domainName(reader.name("PTR host")) })
    case typeCodes.SOA: {
      const primary = domainName(reader.name("SOA primary"))
      const admin = reader.name("SOA admin")
      const serial = reader.u32("SOA serial")
      const refresh = Duration.seconds(reader.u32("SOA refresh"))
      const retry = Duration.seconds(reader.u32("SOA retry"))
      const expire = Duration.seconds(reader.u32("SOA expire"))
      const minimum = Duration.seconds(reader.u32("SOA minimum"))
      return record("SOA", { primary, admin, serial, refresh, retry, expire, minimum })
    }
    case typeCodes.SRV: {
      const priority = reader.u16("SRV priority")
      const weight = reader.u16("SRV weight")
      const port = reader.u16("SRV port")
      return record("SRV", { priority, weight, port, target: domainName(reader.name("SRV target")) })
    }
    case typeCodes.TXT: {
      const chunks: Array<string> = []
      while (reader.offset < end) chunks.push(reader.characterString("TXT string"))
      return record("TXT", { chunks: chunks as unknown as Dns.RecordFields<"TXT">["chunks"] })
    }
    default:
      reader.take(end - reader.offset, "record data")
      return undefined
  }
}

const readQuestion = (reader: MessageReader): Question => ({
  name: reader.name("question name"),
  type: reader.u16("question type"),
  class: reader.u16("question class")
})

const readHeader = (reader: MessageReader) => {
  const id = reader.u16("header")
  const bits = reader.u16("header")
  const counts = [reader.u16("header"), reader.u16("header"), reader.u16("header"), reader.u16("header")] as const
  const questions: Array<Question> = []
  for (let i = 0; i < counts[0]; i++) questions.push(readQuestion(reader))
  const header: Header = {
    id,
    isResponse: (bits & 0x8000) !== 0,
    opcode: (bits >> 11) & 0xf,
    flags: {
      authoritative: (bits & 0x0400) !== 0,
      truncated: (bits & 0x0200) !== 0,
      recursionDesired: (bits & 0x0100) !== 0,
      recursionAvailable: (bits & 0x0080) !== 0,
      authenticData: (bits & 0x0020) !== 0,
      checkingDisabled: (bits & 0x0010) !== 0
    },
    rcode: bits & 0xf,
    questions
  }
  return { header, counts }
}

const decode = <A>(bytes: Uint8Array, f: (reader: MessageReader) => A): Result.Result<A, DnsMessageError> =>
  Result.try({
    try: () => f(new MessageReader(bytes)),
    catch: (cause) =>
      cause instanceof DnsMessageError ? cause : new DnsMessageError({ message: String(cause), offset: -1 })
  })

/**
 * Decodes the header and question section of a message, which is enough to
 * match a response to its query even when the rest is truncated.
 *
 * @internal
 */
export const decodeHeader = (bytes: Uint8Array): Result.Result<Header, DnsMessageError> =>
  decode(bytes, (reader) => readHeader(reader).header)

/**
 * Decodes a complete response.
 *
 * @internal
 */
export const decodeResponse = (bytes: Uint8Array): Result.Result<DnsClient.Response, DnsMessageError> =>
  decode(bytes, (reader) => {
    const { counts, header } = readHeader(reader)
    let edns: DnsClient.Response["edns"]
    let extendedRcode = 0
    const section = (count: number, additional: boolean) => {
      const records: Array<DnsClient.ResourceRecord> = []
      for (let i = 0; i < count; i++) {
        const start = reader.offset
        const owner = reader.name("record owner")
        const type = reader.u16("record type")
        const klass = reader.u16("record class")
        const ttl = reader.u32("record TTL")
        const length = reader.u16("record data length")
        reader.need(length, "record data")
        const end = reader.offset + length
        if (type === OPT) {
          if (!additional) reader.fail("OPT record outside the additional section", start)
          if (edns !== undefined) reader.fail("more than one OPT record", start)
          if (owner !== ".") reader.fail("OPT record owner must be the root name", start)
          extendedRcode = ttl >>> 24
          edns = { udpPayloadSize: klass, version: (ttl >>> 16) & 0xff, dnssecOk: (ttl & 0x8000) !== 0 }
          reader.offset = end
          continue
        }
        const data = readData(reader, type, end) ?? {
          _tag: "Raw" as const,
          type,
          // Copies the data: `slice` on a Node.js `Buffer` returns a view.
          data: new Uint8Array(reader.bytes.subarray(end - length, end))
        }
        if (reader.offset !== end) reader.fail("record data does not match its length", start)
        records.push({
          owner,
          ttl: Duration.seconds(ttl > 0x7fffffff ? 0 : ttl),
          class: klass,
          data
        })
      }
      return records
    }
    const answer = section(counts[1], false)
    const authority = section(counts[2], false)
    const additional = section(counts[3], true)
    return {
      flags: header.flags,
      rcode: (extendedRcode << 4) | header.rcode,
      answer,
      authority,
      additional,
      edns
    }
  })
