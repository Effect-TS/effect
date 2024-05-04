import * as Sql from "@effect/sql-mssql"
import type { Custom } from "@effect/sql/Statement"
import { isCustom } from "@effect/sql/Statement"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"

const sql = Effect.runSync(
  Effect.scoped(
    Sql.client.make({
      server: ""
    })
  )
)

describe("mssql", () => {
  it("insert helper", () => {
    const [query, params] = sql`INSERT INTO ${sql("people")} ${sql.insert({ name: "Tim", age: 10 })}`.compile()
    expect(query).toEqual(
      `INSERT INTO [people] ([name],[age]) OUTPUT INSERTED.* VALUES (@a,@b)`
    )
    expect(params).toEqual(["Tim", 10])
  })

  it("update helper", () => {
    const [query, params] = sql`UPDATE people SET name = data.name FROM ${
      sql.updateValues(
        [{ name: "Tim" }, { name: "John" }],
        "data"
      )
    }`.compile()
    expect(query).toEqual(
      `UPDATE people SET name = data.name FROM (values (@a),(@b)) AS data([name])`
    )
    expect(params).toEqual(["Tim", "John"])
  })

  it("array helper", () => {
    const [query, params] = sql`SELECT * FROM ${sql("people")} WHERE id IN ${sql.in([1, 2, "string"])}`.compile()
    expect(query).toEqual(`SELECT * FROM [people] WHERE id IN (@a,@b,@c)`)
    expect(params).toEqual([1, 2, "string"])
  })

  it("param types", () => {
    const [query, params] = sql`SELECT * FROM ${sql("people")} WHERE id = ${
      sql.param(
        Sql.types.BigInt,
        1
      )
    }`.compile()
    expect(query).toEqual(`SELECT * FROM [people] WHERE id = @a`)
    expect(isCustom("MssqlParam")(params[0])).toEqual(true)
    const param = params[0] as unknown as Custom<
      "MsSqlParam",
      any,
      any,
      any
    >
    expect(param.i0).toEqual(Sql.types.BigInt)
    expect(param.i1).toEqual(1)
    expect(param.i2).toEqual({})
  })

  it("escape [", () => {
    const [query] = sql`SELECT * FROM ${sql("peo[]ple.te[st]ing")}`.compile()
    expect(query).toEqual(`SELECT * FROM [peo[]]ple].[te[st]]ing]`)
  })
})
