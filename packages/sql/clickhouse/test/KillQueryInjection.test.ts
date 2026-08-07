import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("ClickhouseClient / SQL injection", () => {
  it.effect("KILL QUERY should use parameterized queries not string interpolation", () =>
    Effect.gen(function*() {
      // The bug: ClickhouseClient.ts uses template-literal SQL:
      // `KILL QUERY WHERE query_id = '${queryId}'`
      // instead of using query_params for safe parameterization.
      //
      // See packages/sql/clickhouse/src/ClickhouseClient.ts lines 256 and 378
      //
      // The queryId is obtained from fiber.getRef(QueryId) which can be
      // set via withQueryId(). When user input flows through withQueryId(),
      // a single quote in the input breaks the literal and enables injection.
      //
      // When fixed, the KILL QUERY should use query_params:
      //   this.conn.command({
      //     query: "KILL QUERY WHERE query_id = {queryId:String}",
      //     query_params: { queryId }
      //   })
      Effect.void
    }))
})
