import { PgProtocol } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { backend, bytes, frontend } from "./fixtures/goldens.ts"

const hex = (value: Uint8Array): string => Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")

const parseOne = (golden: string): PgProtocol.BackendMessage => {
  const messages = PgProtocol.makeParser().push(bytes(golden))
  assert.strictEqual(messages.length, 1)
  return messages[0]
}

const assertThrowsTagged = (tag: string, run: () => unknown) => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { _tag?: string })._tag, tag)
    return
  }
  assert.fail(`Expected ${tag} to be thrown`)
}

describe("PgProtocol", () => {
  describe("special messages", () => {
    it("encodes an SSLRequest", () => {
      assert.strictEqual(hex(PgProtocol.encodeSslRequest()), frontend.sslRequest)
    })

    it("decodes the SSLRequest response byte", () => {
      assert.strictEqual(PgProtocol.decodeSslResponse(0x53), "S")
      assert.strictEqual(PgProtocol.decodeSslResponse(0x4e), "N")
      assertThrowsTagged("PgProtocolParseError", () => PgProtocol.decodeSslResponse(0x41))
    })

    it("encodes a StartupMessage", () => {
      const encoded = PgProtocol.encodeStartupMessage({
        user: "effect",
        database: "effect",
        application_name: "effect-pg-codec"
      })
      assert.strictEqual(hex(encoded), frontend.startupMessage)
    })

    it("keeps an explicit client_encoding", () => {
      const encoded = PgProtocol.encodeStartupMessage({ user: "effect", client_encoding: "UTF8" })
      assert.strictEqual(
        hex(encoded),
        "0000002a00030000757365720065666665637400636c69656e745f656e636f64696e6700555446380000"
      )
    })

    it("encodes a CancelRequest", () => {
      const encoded = PgProtocol.encodeCancelRequest({ pid: 63, secret: 166060928 })
      assert.strictEqual(hex(encoded), frontend.cancelRequest)
    })
  })

  describe("frontend messages", () => {
    it("encodes Parse", () => {
      assert.strictEqual(
        hex(PgProtocol.encodeParse({ name: "s1", query: "SELECT $1", parameterTypes: [23] })),
        frontend.parse
      )
    })

    it("encodes Bind with binary parameter and result formats", () => {
      const encoded = PgProtocol.encodeBind({
        portal: "p1",
        statement: "s1",
        parameters: [bytes("00000001"), null]
      })
      assert.strictEqual(hex(encoded), frontend.bind)
    })

    it("encodes Execute", () => {
      assert.strictEqual(hex(PgProtocol.encodeExecute({ portal: "p1", maxRows: 5 })), frontend.execute)
    })

    it("encodes Describe and Close", () => {
      assert.strictEqual(
        hex(PgProtocol.encodeDescribe({ target: "statement", name: "s1" })),
        frontend.describeStatement
      )
      assert.strictEqual(hex(PgProtocol.encodeClose({ target: "portal", name: "p1" })), frontend.closePortal)
    })

    it("encodes the empty control messages", () => {
      assert.strictEqual(hex(PgProtocol.encodeSync()), frontend.sync)
      assert.strictEqual(hex(PgProtocol.encodeFlush()), frontend.flush)
      assert.strictEqual(hex(PgProtocol.encodeTerminate()), frontend.terminate)
    })

    it("encodes the password messages", () => {
      assert.strictEqual(
        hex(PgProtocol.encodePasswordMessage({ password: "md5abc" })),
        frontend.passwordMessage
      )
      assert.strictEqual(
        hex(PgProtocol.encodeSASLInitialResponse({
          mechanism: "SCRAM-SHA-256",
          initialResponse: bytes("6e2c2c")
        })),
        frontend.saslInitialResponse
      )
      assert.strictEqual(
        hex(PgProtocol.encodeSASLInitialResponse({ mechanism: "SCRAM-SHA-256", initialResponse: null })),
        frontend.saslInitialResponseEmpty
      )
      assert.strictEqual(hex(PgProtocol.encodeSASLResponse({ data: bytes("010203") })), frontend.saslResponse)
    })

    it("dispatches encode over the tagged union", () => {
      assert.strictEqual(
        hex(PgProtocol.encode({ _tag: "Parse", name: "s1", query: "SELECT $1", parameterTypes: [23] })),
        frontend.parse
      )
      assert.strictEqual(hex(PgProtocol.encode({ _tag: "Sync" })), frontend.sync)
    })
  })

  describe("authentication messages", () => {
    it("decodes AuthenticationOk", () => {
      assert.deepStrictEqual(parseOne(backend.authenticationOk), { _tag: "AuthenticationOk" })
    })

    it("decodes AuthenticationCleartextPassword", () => {
      assert.deepStrictEqual(parseOne(backend.authenticationCleartextPassword), {
        _tag: "AuthenticationCleartextPassword"
      })
    })

    it("decodes AuthenticationMD5Password", () => {
      assert.deepStrictEqual(parseOne(backend.authenticationMD5Password), {
        _tag: "AuthenticationMD5Password",
        salt: bytes("70e7d45e")
      })
    })

    it("decodes AuthenticationSASL", () => {
      assert.deepStrictEqual(parseOne(backend.authenticationSASL), {
        _tag: "AuthenticationSASL",
        mechanisms: ["SCRAM-SHA-256"]
      })
    })

    it("decodes the SASL continuation payloads as opaque bytes", () => {
      const cont = parseOne(backend.authenticationSASLContinue)
      assert.strictEqual(cont._tag, "AuthenticationSASLContinue")
      assert.strictEqual(
        new TextDecoder().decode((cont as PgProtocol.AuthenticationSASLContinue).data).slice(0, 2),
        "r="
      )
      const final = parseOne(backend.authenticationSASLFinal)
      assert.strictEqual(final._tag, "AuthenticationSASLFinal")
    })

    it("reports unsupported authentication methods", () => {
      // AuthenticationGSS, method 7
      assert.deepStrictEqual(parseOne("520000000800000007"), {
        _tag: "AuthenticationUnsupported",
        method: 7,
        payload: new Uint8Array(0)
      })
    })
  })

  describe("backend messages", () => {
    it("decodes ParameterStatus", () => {
      assert.deepStrictEqual(parseOne(backend.parameterStatus), {
        _tag: "ParameterStatus",
        name: "in_hot_standby",
        value: "off"
      })
    })

    it("decodes BackendKeyData", () => {
      assert.deepStrictEqual(parseOne(backend.backendKeyData), {
        _tag: "BackendKeyData",
        pid: 63,
        secret: 166060928
      })
    })

    it("decodes ReadyForQuery", () => {
      assert.deepStrictEqual(parseOne(backend.readyForQuery), { _tag: "ReadyForQuery", status: "I" })
    })

    it("decodes RowDescription", () => {
      assert.deepStrictEqual(parseOne(backend.rowDescription), {
        _tag: "RowDescription",
        fields: [
          {
            name: "a",
            tableOid: 0,
            columnAttributeNumber: 0,
            dataTypeOid: 23,
            dataTypeSize: 4,
            typeModifier: -1,
            format: 1
          },
          {
            name: "b",
            tableOid: 0,
            columnAttributeNumber: 0,
            dataTypeOid: 25,
            dataTypeSize: -1,
            typeModifier: -1,
            format: 1
          }
        ]
      })
    })

    it("decodes DataRow as raw bytes, with null for SQL NULL", () => {
      assert.deepStrictEqual(parseOne(backend.dataRowTwoColumns), {
        _tag: "DataRow",
        values: [bytes("00000001"), bytes("78")]
      })
      assert.deepStrictEqual(parseOne(backend.dataRowWithNull), {
        _tag: "DataRow",
        values: [bytes("0000000000000007"), null]
      })
    })

    it("decodes ParameterDescription", () => {
      assert.deepStrictEqual(parseOne(backend.parameterDescription), {
        _tag: "ParameterDescription",
        parameterTypes: [20]
      })
    })

    it("decodes CommandComplete", () => {
      assert.deepStrictEqual(parseOne(backend.commandComplete), {
        _tag: "CommandComplete",
        commandTag: "SELECT 1"
      })
    })

    it("decodes the empty acknowledgements", () => {
      assert.deepStrictEqual(parseOne(backend.parseComplete), { _tag: "ParseComplete" })
      assert.deepStrictEqual(parseOne(backend.bindComplete), { _tag: "BindComplete" })
      assert.deepStrictEqual(parseOne(backend.closeComplete), { _tag: "CloseComplete" })
      assert.deepStrictEqual(parseOne(backend.portalSuspended), { _tag: "PortalSuspended" })
      assert.deepStrictEqual(parseOne(backend.emptyQueryResponse), { _tag: "EmptyQueryResponse" })
      assert.deepStrictEqual(parseOne(backend.noData), { _tag: "NoData" })
    })

    it("decodes ErrorResponse fields by name", () => {
      assert.deepStrictEqual(parseOne(backend.errorResponse), {
        _tag: "ErrorResponse",
        fields: {
          severity: "ERROR",
          severityUnlocalized: "ERROR",
          code: "22012",
          message: "division by zero",
          file: "int.c",
          line: "870",
          routine: "int4div"
        }
      })
    })

    it("decodes NoticeResponse", () => {
      const notice = parseOne(backend.noticeResponse)
      assert.strictEqual(notice._tag, "NoticeResponse")
      assert.strictEqual((notice as PgProtocol.NoticeResponse).fields.code, "00000")
      assert.strictEqual((notice as PgProtocol.NoticeResponse).fields.severity, "NOTICE")
    })

    it("decodes NotificationResponse", () => {
      assert.deepStrictEqual(parseOne(backend.notificationResponse), {
        _tag: "NotificationResponse",
        pid: 63,
        channel: "effect_channel",
        payload: "payload text"
      })
    })

    it("decodes NegotiateProtocolVersion", () => {
      // minor version 0, one unrecognised option "_pq_.foo"
      assert.deepStrictEqual(parseOne("760000001500000000000000015f70715f2e666f6f00"), {
        _tag: "NegotiateProtocolVersion",
        minorVersion: 0,
        unrecognizedOptions: ["_pq_.foo"]
      })
    })

    it("decodes the COPY messages", () => {
      assert.deepStrictEqual(parseOne("470000000b00000200000001"), {
        _tag: "CopyInResponse",
        format: 0,
        columnFormats: [0, 1]
      })
      assert.deepStrictEqual(parseOne("48000000090100010000"), {
        _tag: "CopyOutResponse",
        format: 1,
        columnFormats: [0]
      })
      assert.deepStrictEqual(parseOne("57000000090100010000"), {
        _tag: "CopyBothResponse",
        format: 1,
        columnFormats: [0]
      })
      assert.deepStrictEqual(parseOne("6400000008010203ff"), {
        _tag: "CopyData",
        data: bytes("010203ff")
      })
      assert.deepStrictEqual(parseOne("6300000004"), { _tag: "CopyDone" })
    })

    it("reports an unknown type byte instead of failing", () => {
      assert.deepStrictEqual(parseOne("5f00000008deadbeef"), {
        _tag: "Unknown",
        type: 0x5f,
        payload: bytes("deadbeef")
      })
    })
  })

  describe("incremental parsing", () => {
    it("buffers a message split across two chunks", () => {
      const parser = PgProtocol.makeParser()
      const frame = bytes(backend.dataRowTwoColumns)
      assert.deepStrictEqual(parser.push(frame.subarray(0, 7)), [])
      const messages = parser.push(frame.subarray(7))
      assert.strictEqual(messages.length, 1)
      assert.strictEqual(messages[0]._tag, "DataRow")
    })

    it("returns both messages when one chunk holds two", () => {
      const parser = PgProtocol.makeParser()
      const chunk = bytes(backend.parseComplete + backend.bindComplete)
      assert.deepStrictEqual(parser.push(chunk), [{ _tag: "ParseComplete" }, { _tag: "BindComplete" }])
    })

    it("keeps the trailing partial message across pushes", () => {
      const parser = PgProtocol.makeParser()
      const chunk = bytes(backend.parseComplete + backend.readyForQuery)
      assert.deepStrictEqual(parser.push(chunk.subarray(0, 8)), [{ _tag: "ParseComplete" }])
      assert.deepStrictEqual(parser.push(chunk.subarray(8)), [{ _tag: "ReadyForQuery", status: "I" }])
    })

    it("handles a byte-at-a-time stream", () => {
      const parser = PgProtocol.makeParser()
      const frame = bytes(backend.rowDescription)
      const messages: Array<PgProtocol.BackendMessage> = []
      for (let i = 0; i < frame.length; i++) {
        messages.push(...parser.push(frame.subarray(i, i + 1)))
      }
      assert.strictEqual(messages.length, 1)
      assert.strictEqual(messages[0]._tag, "RowDescription")
    })

    it("rejects a length prefix above maxMessageSize", () => {
      const parser = PgProtocol.makeParser()
      assertThrowsTagged("PgProtocolParseError", () => parser.push(bytes("447fffffff0000")))
    })

    it("honours a custom maxMessageSize", () => {
      const parser = PgProtocol.makeParser({ maxMessageSize: 8 })
      assertThrowsTagged("PgProtocolParseError", () => parser.push(bytes(backend.rowDescription)))
    })

    it("rejects a length prefix below the minimum", () => {
      const parser = PgProtocol.makeParser()
      assertThrowsTagged("PgProtocolParseError", () => parser.push(bytes("4400000003ff")))
    })

    it("rejects a truncated payload", () => {
      // CommandComplete whose command tag is never NUL-terminated
      assertThrowsTagged("PgProtocolParseError", () => parseOne("430000000953454c454354"))
    })
  })
})
