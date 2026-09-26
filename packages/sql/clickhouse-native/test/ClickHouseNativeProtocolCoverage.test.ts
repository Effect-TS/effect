import { describe, expect, it } from "vitest"

/**
 * Source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Protocol.h
 *
 * Keep this list aligned with `DB::Protocol::{Client,Server}::Enum`. This client
 * is a SQL driver, so every unavailable packet is deliberately classified as
 * unsupported rather than silently ignored.
 */
type NativePacketCoverage = {
  readonly code: number
  readonly direction: "client" | "server"
  readonly name: string
  readonly status: "implemented" | "unsupported"
  readonly test: string
}

const packets = [
  {
    code: 0,
    direction: "client",
    name: "Hello",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 1,
    direction: "client",
    name: "Query",
    status: "implemented",
    test: "ClickHouseNativeSqlClient.integration.test.ts"
  },
  {
    code: 2,
    direction: "client",
    name: "Data",
    status: "implemented",
    test: "ClickHouseNativeSqlClient.integration.test.ts"
  },
  {
    code: 3,
    direction: "client",
    name: "Cancel",
    status: "unsupported",
    test: "requires a dedicated cancellation-safe connection design"
  },
  {
    code: 4,
    direction: "client",
    name: "Ping",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 5,
    direction: "client",
    name: "TablesStatusRequest",
    status: "unsupported",
    test: "interserver status authentication, not SQL-driver traffic"
  },
  { code: 6, direction: "client", name: "KeepAlive", status: "unsupported", test: "not exposed by the client API" },
  {
    code: 7,
    direction: "client",
    name: "Scalar",
    status: "unsupported",
    test: "external-table scalar blocks are not supported"
  },
  {
    code: 8,
    direction: "client",
    name: "IgnoredPartUUIDs",
    status: "unsupported",
    test: "obsolete upstream compatibility packet"
  },
  {
    code: 9,
    direction: "client",
    name: "ReadTaskResponse",
    status: "unsupported",
    test: "distributed S3 reads are not supported"
  },
  {
    code: 10,
    direction: "client",
    name: "MergeTreeReadTaskResponse",
    status: "unsupported",
    test: "distributed MergeTree reads are not supported"
  },
  {
    code: 11,
    direction: "client",
    name: "SSHChallengeRequest",
    status: "unsupported",
    test: "SSH authentication is not supported"
  },
  {
    code: 12,
    direction: "client",
    name: "SSHChallengeResponse",
    status: "unsupported",
    test: "SSH authentication is not supported"
  },
  {
    code: 13,
    direction: "client",
    name: "QueryPlan",
    status: "unsupported",
    test: "distributed query plans are not supported"
  },
  {
    code: 14,
    direction: "client",
    name: "MergeTreeAllRangesAnnouncementResponse",
    status: "unsupported",
    test: "distributed MergeTree coordination is not supported"
  },
  {
    code: 0,
    direction: "server",
    name: "Hello",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 1,
    direction: "server",
    name: "Data",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 2,
    direction: "server",
    name: "Exception",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 3,
    direction: "server",
    name: "Progress",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 4,
    direction: "server",
    name: "Pong",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 5,
    direction: "server",
    name: "EndOfStream",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 6,
    direction: "server",
    name: "ProfileInfo",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 7,
    direction: "server",
    name: "Totals",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 8,
    direction: "server",
    name: "Extremes",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 9,
    direction: "server",
    name: "TablesStatusResponse",
    status: "unsupported",
    test: "response to interserver TablesStatusRequest"
  },
  {
    code: 10,
    direction: "server",
    name: "Log",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 11,
    direction: "server",
    name: "TableColumns",
    status: "implemented",
    test: "ClickHouseNativeSqlClient.integration.test.ts"
  },
  {
    code: 12,
    direction: "server",
    name: "PartUUIDs",
    status: "unsupported",
    test: "obsolete upstream compatibility packet"
  },
  {
    code: 13,
    direction: "server",
    name: "ReadTaskRequest",
    status: "unsupported",
    test: "distributed S3 reads are not supported"
  },
  {
    code: 14,
    direction: "server",
    name: "ProfileEvents",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 15,
    direction: "server",
    name: "MergeTreeAllRangesAnnouncement",
    status: "unsupported",
    test: "distributed MergeTree coordination is not supported"
  },
  {
    code: 16,
    direction: "server",
    name: "MergeTreeReadTaskRequest",
    status: "unsupported",
    test: "distributed MergeTree coordination is not supported"
  },
  {
    code: 17,
    direction: "server",
    name: "TimezoneUpdate",
    status: "implemented",
    test: "ClickHouseNativeClient.integration.test.ts"
  },
  {
    code: 18,
    direction: "server",
    name: "SSHChallenge",
    status: "unsupported",
    test: "SSH authentication is not supported"
  }
] as const satisfies ReadonlyArray<NativePacketCoverage>

const keyOf = (packet: NativePacketCoverage) => `${packet.direction}:${packet.code}`

describe("ClickHouse Native protocol coverage", () => {
  it("classifies every upstream client and server packet exactly once", () => {
    expect(packets).toHaveLength(34)
    expect(new Set(packets.map(keyOf))).toHaveLength(packets.length)
    expect(packets.map((packet) => packet.status)).not.toContain(undefined)
    expect(packets.map((packet) => packet.test)).not.toContain("")
  })

  it("keeps the SQL-driver packet surface explicit", () => {
    const implemented = packets
      .filter((packet) => packet.status === "implemented")
      .map((packet) => `${packet.direction}:${packet.name}`)

    expect(implemented).toEqual([
      "client:Hello",
      "client:Query",
      "client:Data",
      "client:Ping",
      "server:Hello",
      "server:Data",
      "server:Exception",
      "server:Progress",
      "server:Pong",
      "server:EndOfStream",
      "server:ProfileInfo",
      "server:Totals",
      "server:Extremes",
      "server:Log",
      "server:TableColumns",
      "server:ProfileEvents",
      "server:TimezoneUpdate"
    ])
  })

  it("records why every unimplemented packet is unavailable", () => {
    const unimplemented = packets.filter((packet) => packet.status !== "implemented")

    expect(unimplemented).toHaveLength(17)
    expect(unimplemented.every((packet) => packet.test.length > 0)).toBe(true)
  })
})
