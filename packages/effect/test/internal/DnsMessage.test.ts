import { assert, describe, it } from "@effect/vitest"
import { Duration, Result } from "effect"
import * as Hex from "effect/encoding/Hex"
import * as DnsMessage from "effect/internal/dnsMessage"
import * as Dns from "effect/net/Dns"
import type * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

// Hex bytes; whitespace and `//` comments are ignored.
const hex = (input: string): Uint8Array =>
  Result.getOrThrow(Hex.decode(input.replace(/\/\/.*$/gm, "").replace(/\s+/g, "")))

const name = Host.domainNameFromStringUnsafe
const ip = NetAddress.ipFromStringUnsafe

const rr = <D extends Dns.DnsRecord | DnsClient.RawRecord>(owner: string, ttl: number, data: D) => ({
  owner,
  ttl: Duration.seconds(ttl),
  class: 1,
  data
})

const ns = rr("example.test.", 300, Dns.makeRecordUnsafe("NS", { host: name("ns1.example.test.") }))
const edns = { udpPayloadSize: 1232, version: 0, dnssecOk: false }
const flags = {
  authoritative: true,
  truncated: false,
  recursionDesired: true,
  recursionAvailable: false,
  authenticData: false,
  checkingDisabled: false
}

const decode = (bytes: Uint8Array): DnsClient.Response => Result.getOrThrow(DnsMessage.decodeResponse(bytes))

const decodeError = (bytes: Uint8Array): string => {
  const result = DnsMessage.decodeResponse(bytes)
  assert.isTrue(Result.isFailure(result), "expected the message to be rejected")
  const error = Result.isFailure(result) ? result.failure : undefined!
  assert.strictEqual(error._tag, "DnsMessageError")
  return error.message
}

// Responses captured from the CoreDNS fixture of the platform `Dns` integration
// tests, for queries with ID 0xbeef, RD set, and a 1232-byte EDNS(0) payload size.
const captured = {
  // example.test. A: two answers, an NS record in authority, and an OPT record.
  a: hex(`
    beef 8500 0001 0002 0001 0001
    076578616d706c6504746573740000010001
    076578616d706c6504746573740000010001 0000012c 0004 c0000201
    076578616d706c6504746573740000010001 0000012c 0004 c0000202
    076578616d706c6504746573740000020001 0000012c 0012 036e7331076578616d706c65047465737400
    00 0029 04d0 00000000 0000
  `),
  // example.test. TXT "v=spf1 " "-all"
  txt: hex(`
    beef85000001000100010001076578616d706c6504746573740000100001076578616d706c65047465737400001000010000012c000d
    07763d7370663120042d616c6c
    076578616d706c65047465737400000200010000012c0012036e7331076578616d706c6504746573740000002904d0000000000000
  `),
  // edge.test. SOA . john\.doe.example.test. 1 4294967295 2147483648 604800 300
  edgeSoa: hex(`
    beef850000010001000100010465646765047465737400000600010465646765047465737400000600010000012c002c
    00 086a6f686e2e646f65076578616d706c650474657374 00 00000001 ffffffff 80000000 00093a80 0000012c
    0465646765047465737400000200010000012c0012036e7331076578616d706c6504746573740000002904d0000000000000
  `),
  // edge.test. TXT "gr\195\188\195\159"
  edgeTxt: hex(`
    beef850000010001000100010465646765047465737400001000010465646765047465737400001000010000012c0007
    066772c3bcc39f
    0465646765047465737400000200010000012c0012036e7331076578616d706c6504746573740000002904d0000000000000
  `),
  // 2.2.0.192.in-addr.arpa. PTR: good.example.test. and bad\032host.example.test.
  ptr: hex(`
    beef850000010002000100010132013201300331393207696e2d61646472046172706100000c0001
    0132013201300331393207696e2d61646472046172706100000c00010000012c0013 04676f6f64076578616d706c65047465737400
    0132013201300331393207696e2d61646472046172706100000c00010000012c0017 0862616420686f7374076578616d706c65047465737400
    013201300331393207696e2d61646472046172706100000200010000012c0012036e7331076578616d706c6504746573740000002904d0000000000000
  `),
  // missing.example.test. A: NXDOMAIN with the zone's SOA in authority.
  nxdomain: hex(`
    beef85030001000000010001076d697373696e67076578616d706c6504746573740000010001
    076578616d706c65047465737400000600010000012c003f036e7331076578616d706c650474657374000a686f73746d6173746572076578616d706c6504746573740078a3f17500000e100000025800093a800000012c
    00002904d0000000000000
  `),
  // outside.invalid. A: REFUSED.
  refused: hex(`beef81050001000000000001076f75747369646507696e76616c6964000001000100002904d0000000000000`)
}

// A response with compressed names and mixed case:
// WWW.Example.test. CNAME Example.test., Example.test. A 192.0.2.1
const compressed = hex(`
  beef 8180 0001 0002 0000 0000
  03575757 074578616d706c65 0474657374 00 0001 0001  // question at 12, "Example" at 16
  c00c 0005 0001 00000e10 0002 c010                   // CNAME target points to "Example.test."
  c02e 0001 0001 0000003c 0004 c0000201               // owner points to the pointer at 46
`)

describe("DnsMessage", () => {
  describe("encodeQuery", () => {
    it("encodes a query with an EDNS(0) OPT record", () => {
      assert.deepStrictEqual(
        DnsMessage.encodeQuery({
          id: 0x1234,
          name: name("example.com"),
          type: DnsMessage.typeCodes.A,
          recursionDesired: true,
          udpPayloadSize: 1232
        }),
        hex(`
          1234 0100 0001 0000 0000 0001
          076578616d706c6503636f6d00 0001 0001
          00 0029 04d0 00000000 0000
        `)
      )
    })

    it("encodes fully qualified and root names without EDNS(0)", () => {
      assert.deepStrictEqual(
        DnsMessage.encodeQuery({
          id: 0xffff,
          name: name("_pg._tcp.example.test."),
          type: DnsMessage.typeCodes.SRV,
          recursionDesired: false,
          udpPayloadSize: undefined
        }),
        hex(`ffff 0000 0001 0000 0000 0000 035f7067045f746370076578616d706c650474657374 00 0021 0001`)
      )
      assert.deepStrictEqual(
        DnsMessage.encodeQuery({
          id: 1,
          name: name("."),
          type: DnsMessage.typeCodes.NS,
          recursionDesired: true,
          udpPayloadSize: undefined
        }),
        hex(`0001 0100 0001 0000 0000 0000 00 0002 0001`)
      )
    })

    it("pads queries to a multiple of the block size", () => {
      assert.deepStrictEqual(
        DnsMessage.encodeQuery({
          id: 0,
          name: name("example.com"),
          type: DnsMessage.typeCodes.A,
          recursionDesired: true,
          udpPayloadSize: 1232,
          padding: 128
        }),
        hex(`
          0000 0100 0001 0000 0000 0001
          076578616d706c6503636f6d00 0001 0001
          00 0029 04d0 00000000 0058 000c 0054 ${"00".repeat(84)}
        `)
      )
      // A query that fills the block with an empty Padding option is not padded further.
      const lengths = [30, 31, 32].map((length) =>
        DnsMessage.encodeQuery({
          id: 0,
          name: name(`${"a".repeat(63)}.${"b".repeat(length)}`),
          type: DnsMessage.typeCodes.A,
          recursionDesired: true,
          udpPayloadSize: 1232,
          padding: 128
        })
      )
      assert.deepStrictEqual(lengths.map((query) => query.length), [128, 128, 256])
      assert.deepStrictEqual([...lengths[1].subarray(-8)], [0, 0, 0, 4, 0, 12, 0, 0])
      // Padding needs the OPT record.
      assert.strictEqual(
        DnsMessage.encodeQuery({
          id: 0,
          name: name("example.com"),
          type: DnsMessage.typeCodes.A,
          recursionDesired: true,
          udpPayloadSize: undefined,
          padding: 128
        }).length,
        29
      )
    })

    it("encodes queries that decode back to their question", () => {
      const header = Result.getOrThrow(DnsMessage.decodeHeader(DnsMessage.encodeQuery({
        id: 0xbeef,
        name: name("www.example.test"),
        type: DnsMessage.typeCodes.CAA,
        recursionDesired: true,
        udpPayloadSize: 1232
      })))
      assert.strictEqual(header.id, 0xbeef)
      assert.isFalse(header.isResponse)
      assert.isTrue(header.flags.recursionDesired)
      assert.deepStrictEqual(header.questions, [{ name: "www.example.test.", type: 257, class: 1 }])
    })
  })

  describe("decodeHeader", () => {
    it("decodes the header and question", () => {
      const header = Result.getOrThrow(DnsMessage.decodeHeader(captured.refused))
      assert.deepStrictEqual(header, {
        id: 0xbeef,
        isResponse: true,
        opcode: 0,
        flags: { ...flags, authoritative: false },
        rcode: 5,
        questions: [{ name: "outside.invalid.", type: 1, class: 1 }]
      })
    })

    it("decodes the header of a truncated response", () => {
      const message = hex(`beef 8380 0001 0005 0000 0000 0161 00 0010 0001 00`)
      const header = Result.getOrThrow(DnsMessage.decodeHeader(message))
      assert.isTrue(header.flags.truncated)
      assert.deepStrictEqual(header.questions, [{ name: "a.", type: 16, class: 1 }])
      assert.isTrue(Result.isFailure(DnsMessage.decodeResponse(message)))
    })
  })

  describe("decodeResponse", () => {
    it("decodes answers, authority, TTLs, and EDNS(0)", () => {
      assert.deepStrictEqual(decode(captured.a), {
        flags,
        rcode: 0,
        answer: [
          rr("example.test.", 300, Dns.makeRecordUnsafe("A", { address: ip("192.0.2.1") as NetAddress.Ipv4Address })),
          rr("example.test.", 300, Dns.makeRecordUnsafe("A", { address: ip("192.0.2.2") as NetAddress.Ipv4Address }))
        ],
        authority: [ns],
        additional: [],
        edns
      })
    })

    it("keeps the character strings of a TXT record together", () => {
      assert.deepStrictEqual(decode(captured.txt).answer, [
        rr("example.test.", 300, Dns.makeRecordUnsafe("TXT", { chunks: ["v=spf1 ", "-all"] }))
      ])
    })

    it("decodes UTF-8 text", () => {
      assert.deepStrictEqual(decode(captured.edgeTxt).answer, [
        rr("edge.test.", 300, Dns.makeRecordUnsafe("TXT", { chunks: ["grüß"] }))
      ])
    })

    it("decodes SOA timers of 2^31 seconds or more and escaped mailboxes", () => {
      assert.deepStrictEqual(decode(captured.edgeSoa).answer, [
        rr(
          "edge.test.",
          300,
          Dns.makeRecordUnsafe("SOA", {
            primary: name("."),
            admin: "john\\.doe.example.test.",
            serial: 1,
            refresh: Duration.seconds(4294967295),
            retry: Duration.seconds(2147483648),
            expire: Duration.seconds(604800),
            minimum: Duration.seconds(300)
          })
        )
      ])
    })

    it("writes PTR names and owner names as UTF-8 text", () => {
      const [good, bad] = decode(captured.ptr).answer
      assert.deepStrictEqual(good.data, Dns.makeRecordUnsafe("PTR", { host: "good.example.test." }))
      assert.deepStrictEqual(bad.data, Dns.makeRecordUnsafe("PTR", { host: "bad host.example.test." }))
      // A DNS-SD instance name with a dot, a space, UTF-8 text, and a backslash in its first label.
      const message = hex(`
        0000 8000 0000 0001 0000 0000
        0c 76322e3020436166c3a95c78 04 5f737663 00 000c 0001 00000001 0003 01 61 00
      `)
      assert.deepStrictEqual(decode(message).answer, [
        rr("v2\\.0 Café\\\\x._svc.", 1, Dns.makeRecordUnsafe("PTR", { host: "a." }))
      ])
    })

    it("returns the authority SOA of NXDOMAIN responses", () => {
      const response = decode(captured.nxdomain)
      assert.strictEqual(response.rcode, 3)
      assert.deepStrictEqual(response.answer, [])
      assert.deepStrictEqual(response.authority, [
        rr(
          "example.test.",
          300,
          Dns.makeRecordUnsafe("SOA", {
            primary: name("ns1.example.test."),
            admin: "hostmaster.example.test.",
            serial: 2024010101,
            refresh: Duration.seconds(3600),
            retry: Duration.seconds(600),
            expire: Duration.seconds(604800),
            minimum: Duration.seconds(300)
          })
        )
      ])
    })

    it("decomposes compressed names and preserves the case of owner names", () => {
      const response = decode(compressed)
      assert.deepStrictEqual(response.answer, [
        rr("WWW.Example.test.", 3600, Dns.makeRecordUnsafe("CNAME", { target: name("example.test.") })),
        rr("Example.test.", 60, Dns.makeRecordUnsafe("A", { address: ip("192.0.2.1") as NetAddress.Ipv4Address }))
      ])
      assert.isFalse(response.flags.authoritative)
      assert.isTrue(response.flags.recursionAvailable)
      assert.isUndefined(response.edns)
    })

    it("decodes every supported record type", () => {
      const record = (type: number, data: string) => {
        const rdata = hex(data)
        return hex(`
          0000 8000 0000 0001 0000 0000
          01 61 00 ${type.toString(16).padStart(4, "0")} 0001 00000001 ${rdata.length.toString(16).padStart(4, "0")}
          ${data}
        `)
      }
      const decodeData = (type: number, data: string) => decode(record(type, data)).answer[0].data
      assert.deepStrictEqual(
        decodeData(28, "20010db8000000000000000000000001"),
        Dns.makeRecordUnsafe("AAAA", { address: ip("2001:db8::1") as NetAddress.Ipv6Address })
      )
      assert.deepStrictEqual(
        decodeData(257, "80 05 6973737565 6361"),
        Dns.makeRecordUnsafe("CAA", { critical: true, tag: "issue", value: "ca" })
      )
      assert.deepStrictEqual(
        decodeData(15, "000a 046d61696c00"),
        Dns.makeRecordUnsafe("MX", { exchange: name("mail."), priority: 10 })
      )
      assert.deepStrictEqual(
        decodeData(35, "0064 000a 0153 075349502b443255 00 00"),
        Dns.makeRecordUnsafe("NAPTR", {
          order: 100,
          preference: 10,
          flags: "S",
          service: "SIP+D2U",
          regexp: "",
          replacement: name(".")
        })
      )
      assert.deepStrictEqual(
        decodeData(33, "0001 0002 1538 03646231 00"),
        Dns.makeRecordUnsafe("SRV", { target: name("db1."), port: 5432, priority: 1, weight: 2 })
      )
    })

    it("keeps unknown and unrepresentable records as raw data", () => {
      const message = hex(`
        0000 8000 0000 0005 0000 0000
        01 61 00 ff00 0001 00000001 0003 010203  // private use type 65280
        01 61 00 0101 0001 00000001 0005 00 02 612d 62  // CAA with a tag that is not alphanumeric
        01 61 00 0010 0001 00000001 0000  // TXT without character strings
        01 61 00 0005 0001 00000001 0007 05 636166c3a9 00  // CNAME to UTF-8 "café", not an IDNA name
        01 61 00 000f 0001 00000001 000a 000a 06 6d61696c 2031 00  // MX to "mail 1"
      `)
      assert.deepStrictEqual(decode(message).answer.map((record) => record.data), [
        { _tag: "Raw", type: 0xff00, data: hex("010203") },
        { _tag: "Raw", type: 257, data: hex("0002612d62") },
        { _tag: "Raw", type: 16, data: new Uint8Array(0) },
        { _tag: "Raw", type: 5, data: hex("05636166c3a900") },
        { _tag: "Raw", type: 15, data: hex("000a066d61696c203100") }
      ])
    })

    it("copies raw data out of the message", () => {
      const message = hex(`0000 8000 0000 0001 0000 0000 01 61 00 ff00 0001 00000001 0001 01`)
      const [record] = decode(message).answer
      message[message.length - 1] = 2
      assert.deepStrictEqual(record.data, { _tag: "Raw", type: 0xff00, data: hex("01") })
    })

    it("treats TTLs of 2^31 seconds or more as zero", () => {
      const message = hex(`0000 8000 0000 0001 0000 0000 01 61 00 0001 0001 80000000 0004 c0000201`)
      assert.deepStrictEqual(decode(message).answer[0].ttl, Duration.seconds(0))
    })

    it("combines extended response codes and reads EDNS(0) flags", () => {
      const message = hex(`0000 8000 0000 0000 0000 0001 00 0029 1000 01008000 0000`)
      const response = decode(message)
      assert.strictEqual(response.rcode, 16)
      assert.deepStrictEqual(response.edns, { udpPayloadSize: 4096, version: 0, dnssecOk: true })
      assert.deepStrictEqual(response.additional, [])
    })
  })

  describe("malformed messages", () => {
    it("rejects truncated headers", () => {
      assert.strictEqual(decodeError(hex(`beef 8500 0001`)), "truncated header")
    })

    it("rejects every truncation of a valid response", () => {
      for (const message of Object.values(captured)) {
        for (let length = 0; length < message.length; length++) {
          assert.isTrue(Result.isFailure(DnsMessage.decodeResponse(message.subarray(0, length))), `length ${length}`)
        }
      }
    })

    it("rejects compression pointers that loop", () => {
      assert.match(
        decodeError(hex(`0000 8000 0001 0000 0000 0000 c00c 0001 0001`)),
        /compression pointer that does not point backward/
      )
      assert.match(
        decodeError(hex(`0000 8000 0001 0000 0000 0000 0161 c00c 0001 0001`)),
        /compression pointer that does not point backward/
      )
      // The answer's owner points to its own record data, which points back to the owner.
      assert.match(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 c018 0005 0001 00000001 0002 c00c`)),
        /compression pointer that does not point backward/
      )
    })

    it("rejects compression pointers outside the message", () => {
      assert.match(
        decodeError(hex(`0000 8000 0001 0000 0000 0000 c0ff 0001 0001`)),
        /compression pointer that does not point backward/
      )
      assert.strictEqual(decodeError(hex(`0000 8000 0001 0000 0000 0000 c0`)), "truncated question name")
    })

    it("rejects labels longer than 63 bytes", () => {
      assert.match(
        decodeError(hex(`0000 8000 0001 0000 0000 0000 40 ${"61".repeat(64)} 00 0001 0001`)),
        /unsupported label type/
      )
      assert.match(decodeError(hex(`0000 8000 0001 0000 0000 0000 80 00 0001 0001`)), /unsupported label type/)
    })

    it("rejects names longer than 255 bytes", () => {
      const label = `3f ${"61".repeat(63)}`
      assert.match(
        decodeError(hex(`0000 8000 0001 0000 0000 0000 ${label} ${label} ${label} ${label} 00 0001 0001`)),
        /question name is longer than 255 bytes/
      )
      // A label followed by a pointer to a name of 193 bytes is 259 bytes long.
      assert.match(
        decodeError(
          hex(`0000 8000 0002 0000 0000 0000 ${label} ${label} ${label} 00 0001 0001 ${label} c00c 0001 0001`)
        ),
        /question name is longer than 255 bytes/
      )
    })

    it("rejects record data that does not match its length", () => {
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 01 61 00 0001 0001 00000001 0005 c000020100`)),
        "A record data must be 4 bytes"
      )
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 01 61 00 0005 0001 00000001 0004 0162 00 00`)),
        "record data does not match its length"
      )
      // The name runs past the record data into the next record.
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 01 61 00 0005 0001 00000001 0001 0162 00`)),
        "record data does not match its length"
      )
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 01 61 00 0001 0001 00000001 0004 c000`)),
        "truncated record data"
      )
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 01 61 00 0101 0001 00000001 0003 00 05 61`)),
        "truncated CAA tag"
      )
    })

    it("rejects misplaced and repeated OPT records", () => {
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0001 0000 0000 00 0029 04d0 00000000 0000`)),
        "OPT record outside the additional section"
      )
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0000 0000 0002 00 0029 04d0 00000000 0000 00 0029 04d0 00000000 0000`)),
        "more than one OPT record"
      )
      assert.strictEqual(
        decodeError(hex(`0000 8000 0000 0000 0000 0001 0161 00 0029 04d0 00000000 0000`)),
        "OPT record owner must be the root name"
      )
    })

    it("never throws on corrupted messages", () => {
      // A deterministic generator keeps failures reproducible.
      let seed = 1
      const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
      const messages = [...Object.values(captured), compressed]
      for (let i = 0; i < 20_000; i++) {
        const message = new Uint8Array(messages[i % messages.length])
        for (let flips = 1 + Math.floor(random() * 4); flips > 0; flips--) {
          message[Math.floor(random() * message.length)] = Math.floor(random() * 256)
        }
        DnsMessage.decodeHeader(message)
        DnsMessage.decodeResponse(message)
      }
    })
  })
})
