import { assert, describe, it } from "@effect/vitest"
import { ConnectionState, MessageReader, MessageWriter } from "effect/ssh/SshConnectionProtocol"

const MSG = {
  GLOBAL_REQUEST: 80,
  REQUEST_FAILURE: 82,
  CHANNEL_OPEN: 90,
  CHANNEL_OPEN_CONFIRMATION: 91,
  CHANNEL_OPEN_FAILURE: 92,
  CHANNEL_WINDOW_ADJUST: 93,
  CHANNEL_DATA: 94,
  CHANNEL_EXTENDED_DATA: 95,
  CHANNEL_EOF: 96,
  CHANNEL_CLOSE: 97,
  CHANNEL_REQUEST: 98,
  CHANNEL_SUCCESS: 99,
  CHANNEL_FAILURE: 100
} as const

/** The server's id for the client's channel. */
const REMOTE = 500

const message = (type: number, build: (writer: MessageWriter) => MessageWriter = (writer) => writer) =>
  build(new MessageWriter(type)).finish()

/** The message type and recipient channel of a message sent by the client. */
const header = (bytes: Uint8Array) => {
  const reader = new MessageReader(bytes)
  return [reader.byte(), reader.uint32()]
}

const handled = (connection: ConnectionState, bytes: Uint8Array) => {
  const received = connection.receive(bytes)
  if (received._tag === "Violation") throw new Error(received.description)
  return received
}

/** Opens channel 0 and confirms it with the given window and maximum packet. */
const opened = (window = 1000, maxPacket = 100) => {
  const connection = new ConnectionState({ window: 64, maxPacket: 50 })
  const { channel } = connection.open("session", new Uint8Array(0))
  handled(
    connection,
    message(MSG.CHANNEL_OPEN_CONFIRMATION, (w) => w.uint32(channel).uint32(REMOTE).uint32(window).uint32(maxPacket))
  )
  return { connection, channel }
}

describe("ConnectionState", () => {
  it("opens channels with the local window and maximum packet", () => {
    const connection = new ConnectionState({ window: 64, maxPacket: 50 })
    const { channel, messages } = connection.open("session", Uint8Array.of(1, 2))
    const reader = new MessageReader(messages[0])
    assert.deepStrictEqual(
      [reader.byte(), reader.string(), reader.uint32(), reader.uint32(), reader.uint32(), reader.byte(), reader.byte()],
      [MSG.CHANNEL_OPEN, "session", channel, 64, 50, 1, 2]
    )
    const received = handled(
      connection,
      message(MSG.CHANNEL_OPEN_CONFIRMATION, (w) => w.uint32(channel).uint32(REMOTE).uint32(0).uint32(100))
    )
    assert.deepStrictEqual(received.events, [{ _tag: "Opened", channel }])

    const refused = connection.open("direct-tcpip", new Uint8Array(0)).channel
    const failed = handled(
      connection,
      message(MSG.CHANNEL_OPEN_FAILURE, (w) => w.uint32(refused).uint32(2).string("connect failed").string(""))
    )
    assert.deepStrictEqual(failed.events, [{ _tag: "OpenFailed", channel: refused, description: "connect failed" }])
  })

  it("keeps writes within the server's window and returns consumed data to its own", () => {
    const { channel, connection } = opened(250, 100)
    const { messages, written } = connection.write(channel, new Uint8Array(400))
    assert.strictEqual(written, 250)
    assert.deepStrictEqual(
      messages.map((bytes) => {
        const reader = new MessageReader(bytes)
        reader.byte()
        reader.uint32()
        return reader.bytesField().length
      }),
      // The client's own maximum packet of 50 bytes applies too.
      [50, 50, 50, 50, 50]
    )
    assert.strictEqual(connection.writeState(channel), "Blocked")
    const adjusted = handled(connection, message(MSG.CHANNEL_WINDOW_ADJUST, (w) => w.uint32(channel).uint32(150)))
    assert.deepStrictEqual(adjusted.events, [{ _tag: "Writable", channel }])
    assert.strictEqual(connection.write(channel, new Uint8Array(150)).written, 150)

    // The window of 64 bytes is adjusted once half of it is consumed.
    assert.deepStrictEqual(connection.consume(channel, 31), [])
    const [adjust] = connection.consume(channel, 1)
    const reader = new MessageReader(adjust)
    assert.deepStrictEqual([reader.byte(), reader.uint32(), reader.uint32()], [MSG.CHANNEL_WINDOW_ADJUST, REMOTE, 32])
  })

  it("delivers data, standard error, end of data, and exit status", () => {
    const { channel, connection } = opened()
    const received = [
      message(MSG.CHANNEL_DATA, (w) => w.uint32(channel).string("out")),
      message(MSG.CHANNEL_EXTENDED_DATA, (w) => w.uint32(channel).uint32(1).string("err")),
      message(MSG.CHANNEL_EOF, (w) => w.uint32(channel)),
      message(MSG.CHANNEL_REQUEST, (w) => w.uint32(channel).string("exit-status").bool(false).uint32(3)),
      message(
        MSG.CHANNEL_REQUEST,
        (w) => w.uint32(channel).string("exit-signal").bool(false).string("TERM").bool(true).string("bye").string("")
      )
    ].flatMap((bytes) => handled(connection, bytes).events)
    assert.deepStrictEqual(received, [
      { _tag: "Data", channel, stream: "stdout", data: new TextEncoder().encode("out") },
      { _tag: "Data", channel, stream: "stderr", data: new TextEncoder().encode("err") },
      { _tag: "Eof", channel },
      { _tag: "Exit", channel, exit: { _tag: "ExitStatus", code: 3 } },
      { _tag: "Exit", channel, exit: { _tag: "ExitSignal", signal: "SIGTERM", coreDumped: true, message: "bye" } }
    ])
  })

  it("matches replies to requests and refuses the server's requests and channels", () => {
    const { channel, connection } = opened()
    connection.request(channel, "env", new Uint8Array(0), false)
    connection.request(channel, "exec", new Uint8Array(0), true)
    assert.deepStrictEqual(handled(connection, message(MSG.CHANNEL_FAILURE, (w) => w.uint32(channel))).events, [
      { _tag: "Reply", channel, success: false }
    ])

    const request = handled(
      connection,
      message(MSG.CHANNEL_REQUEST, (w) => w.uint32(channel).string("keepalive@openssh.com").bool(true))
    )
    assert.deepStrictEqual(request.messages.map(header), [[MSG.CHANNEL_FAILURE, REMOTE]])
    const global = handled(connection, message(MSG.GLOBAL_REQUEST, (w) => w.string("keepalive@openssh.com").bool(true)))
    assert.deepStrictEqual(global.messages, [Uint8Array.of(MSG.REQUEST_FAILURE)])
    const open = handled(
      connection,
      message(MSG.CHANNEL_OPEN, (w) => w.string("x11").uint32(42).uint32(1024).uint32(1024))
    )
    assert.deepStrictEqual(open.messages.map(header), [[MSG.CHANNEL_OPEN_FAILURE, 42]])
  })

  it("closes channels once and answers keepalive requests until the server closes them", () => {
    const { channel, connection } = opened()
    assert.deepStrictEqual(connection.close(channel).map(header), [[MSG.CHANNEL_CLOSE, REMOTE]])
    assert.deepStrictEqual(connection.close(channel), [])
    assert.strictEqual(connection.writeState(channel), "Closed")
    const late = handled(connection, message(MSG.CHANNEL_DATA, (w) => w.uint32(channel).string("late")))
    assert.deepStrictEqual(late, { _tag: "Handled", messages: [], events: [] })
    // OpenSSH servers probe sessions whose command still runs after a close,
    // and disconnect when the probes go unanswered.
    const keepalive = message(MSG.CHANNEL_REQUEST, (w) => w.uint32(channel).string("keepalive@openssh.com").bool(true))
    assert.deepStrictEqual(handled(connection, keepalive).messages, [
      message(MSG.CHANNEL_FAILURE, (w) => w.uint32(REMOTE))
    ])
    // The server's close completes the exchange without a second close.
    const closed = handled(connection, message(MSG.CHANNEL_CLOSE, (w) => w.uint32(channel)))
    assert.deepStrictEqual(closed, { _tag: "Handled", messages: [], events: [{ _tag: "Closed", channel }] })

    // A close from the server is answered.
    const other = opened()
    const answered = handled(other.connection, message(MSG.CHANNEL_CLOSE, (w) => w.uint32(other.channel)))
    assert.deepStrictEqual(answered.messages.map(header), [[MSG.CHANNEL_CLOSE, REMOTE]])
    assert.deepStrictEqual(answered.events, [{ _tag: "Closed", channel: other.channel }])
  })

  it("closes channels abandoned before the server confirms them", () => {
    const connection = new ConnectionState()
    const { channel } = connection.open("session", new Uint8Array(0))
    assert.deepStrictEqual(connection.close(channel), [])
    const confirmed = handled(
      connection,
      message(MSG.CHANNEL_OPEN_CONFIRMATION, (w) => w.uint32(channel).uint32(REMOTE).uint32(0).uint32(100))
    )
    assert.deepStrictEqual(confirmed, {
      _tag: "Handled",
      messages: [message(MSG.CHANNEL_CLOSE, (w) => w.uint32(REMOTE))],
      events: []
    })
  })

  it("reports protocol violations", () => {
    const violation = (connection: ConnectionState, bytes: Uint8Array) => {
      const received = connection.receive(bytes)
      return received._tag === "Violation" ? received.description : undefined
    }
    const data = (length: number) => message(MSG.CHANNEL_DATA, (w) => w.uint32(0).string(new Uint8Array(length)))
    // The window is 64 bytes and the maximum packet 50 bytes.
    assert.strictEqual(violation(opened().connection, data(51)), "data larger than the maximum packet size")
    const { channel, connection } = opened()
    handled(connection, data(40))
    assert.strictEqual(violation(connection, data(25)), "data beyond the window")
    assert.strictEqual(
      violation(connection, message(MSG.CHANNEL_SUCCESS, (w) => w.uint32(channel))),
      "unexpected channel request reply"
    )
    assert.strictEqual(
      violation(connection, message(MSG.CHANNEL_DATA, (w) => w.uint32(channel).uint32(10))),
      "truncated message"
    )
    // The client cannot answer messages for a channel before it knows the
    // server's id for it.
    const unconfirmed = new ConnectionState()
    const pending = unconfirmed.open("session", new Uint8Array(0)).channel
    assert.strictEqual(
      violation(unconfirmed, message(MSG.CHANNEL_CLOSE, (w) => w.uint32(pending))),
      "message for an unconfirmed channel"
    )
  })
})
