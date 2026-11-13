import type * as ClickhouseWeb from "@clickhouse/client-web"
import { ClickhouseClient, ClickhouseWebClient } from "@effect/sql-clickhouse"
import { Effect } from "effect"
import { describe, expect, it } from "tstyche"

describe("ClickhouseWebClient", () => {
  it("is a distinct service from ClickhouseClient", () => {
    expect<Effect.Effect<void, never, ClickhouseClient.ClickhouseClient>>().type.not.toBeAssignableFrom(
      Effect.service(ClickhouseWebClient.ClickhouseWebClient).pipe(Effect.asVoid)
    )
    expect<Effect.Effect<void, never, ClickhouseWebClient.ClickhouseWebClient>>().type.not.toBeAssignableFrom(
      Effect.service(ClickhouseClient.ClickhouseClient).pipe(Effect.asVoid)
    )
  })

  it("exposes the web driver and rejects stream inserts", () => {
    expect<ClickhouseWebClient.ClickhouseWebClient["client"]>().type.toBe<ClickhouseWeb.ClickHouseClient>()
    expect<Parameters<ClickhouseWebClient.ClickhouseWebClient["insertQuery"]>[0]["values"]>().type.not
      .toBeAssignableFrom<ReadableStream>()
  })
})
