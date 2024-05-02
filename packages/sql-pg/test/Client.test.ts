import * as Sql from "@effect/sql-pg"
import { defaultTransforms } from "@effect/sql/Client"
import { Effect, Scope, String } from "effect"
import { assert, describe, expect, it } from "vitest"

const sql = Effect.runSync(Scope.extend(Sql.client.make({}), Effect.runSync(Scope.make())))
const compiler = Sql.client.makeCompiler()
const compilerTransform = Sql.client.makeCompiler(String.camelToSnake)
const transformsNested = defaultTransforms(String.snakeToCamel)
const transforms = defaultTransforms(String.snakeToCamel, false)

describe("pg", () => {
  it("insert helper", () => {
    const [query, params] = compiler.compile(
      sql`INSERT INTO people ${sql.insert({ name: "Tim", age: 10 })}`
    )
    expect(query).toEqual(`INSERT INTO people ("name","age") VALUES ($1,$2)`)
    expect(params).toEqual(["Tim", 10])
  })

  it("updateValues helper", () => {
    const [query, params] = compiler.compile(
      sql`UPDATE people SET name = data.name FROM ${
        sql.updateValues(
          [{ name: "Tim" }, { name: "John" }],
          "data"
        )
      }`
    )
    expect(query).toEqual(
      `UPDATE people SET name = data.name FROM (values ($1),($2)) AS data("name")`
    )
    expect(params).toEqual(["Tim", "John"])
  })

  it("update helper", () => {
    let result = compiler.compile(
      sql`UPDATE people SET ${sql.update({ name: "Tim" })}`
    )
    expect(result[0]).toEqual(`UPDATE people SET "name" = $1`)
    expect(result[1]).toEqual(["Tim"])

    result = compiler.compile(
      sql`UPDATE people SET ${sql.update({ name: "Tim", age: 10 }, ["age"])}`
    )
    expect(result[0]).toEqual(`UPDATE people SET "name" = $1`)
    expect(result[1]).toEqual(["Tim"])
  })

  it("array helper", () => {
    const [query, params] = compiler.compile(
      sql`SELECT * FROM ${sql("people")} WHERE id IN ${sql.in([1, 2, "string"])}`
    )
    expect(query).toEqual(`SELECT * FROM "people" WHERE id IN ($1,$2,$3)`)
    expect(params).toEqual([1, 2, "string"])
  })

  it("array helper with column", () => {
    let result = compiler.compile(
      sql`SELECT * FROM ${sql("people")} WHERE ${sql.in("id", [1, 2, "string"])}`
    )
    expect(result[0]).toEqual(`SELECT * FROM "people" WHERE "id" IN ($1,$2,$3)`)
    expect(result[1]).toEqual([1, 2, "string"])

    result = compiler.compile(
      sql`SELECT * FROM ${sql("people")} WHERE ${sql.in("id", [])}`
    )
    expect(result[0]).toEqual(`SELECT * FROM "people" WHERE 1=0`)
    expect(result[1]).toEqual([])
  })

  it("and", () => {
    const now = new Date()
    const result = compiler.compile(
      sql`SELECT * FROM ${sql("people")} WHERE ${
        sql.and([
          sql.in("name", ["Tim", "John"]),
          sql`created_at < ${now}`
        ])
      }`
    )
    expect(result[0]).toEqual(`SELECT * FROM "people" WHERE ("name" IN ($1,$2) AND created_at < $3)`)
    expect(result[1]).toEqual(["Tim", "John", now])
  })

  it("json", () => {
    const [query, params] = compiler.compile(sql`SELECT ${sql.json({ a: 1 })}`)
    expect(query).toEqual(`SELECT $1`)
    expect((params[0] as any).type).toEqual(3802)
  })

  it("json transform", () => {
    const [query, params] = compilerTransform.compile(
      sql`SELECT ${sql.json({ aKey: 1 })}`
    )
    expect(query).toEqual(`SELECT $1`)
    assert.deepEqual((params[0] as any).value, { a_key: 1 })
  })

  it("array", () => {
    const [query, params] = compiler.compile(
      sql`SELECT ${sql.array([1, 2, 3])}`
    )
    expect(query).toEqual(`SELECT $1`)
    expect((params[0] as any).value).toEqual([1, 2, 3])
  })

  it("transform nested", () => {
    assert.deepEqual(
      transformsNested.array([
        {
          a_key: 1,
          nested: [{ b_key: 2 }],
          arr_primitive: [1, "2", true]
        }
      ]) as any,
      [
        {
          aKey: 1,
          nested: [{ bKey: 2 }],
          arrPrimitive: [1, "2", true]
        }
      ]
    )
  })

  it("transform non nested", () => {
    assert.deepEqual(
      transforms.array([
        {
          a_key: 1,
          nested: [{ b_key: 2 }],
          arr_primitive: [1, "2", true]
        }
      ]) as any,
      [
        {
          aKey: 1,
          nested: [{ b_key: 2 }],
          arrPrimitive: [1, "2", true]
        }
      ]
    )

    assert.deepEqual(
      transforms.array([
        {
          json_field: {
            test_value: [1, true, null, "text"],
            test_nested: {
              test_value: [1, true, null, "text"]
            }
          }
        }
      ]) as any,
      [
        {
          jsonField: {
            test_value: [1, true, null, "text"],
            test_nested: {
              test_value: [1, true, null, "text"]
            }
          }
        }
      ]
    )
  })

  it("insert fragments", () => {
    const [query, params] = sql`INSERT INTO people ${
      sql.insert({
        name: "Tim",
        age: 10,
        json: sql.json({ a: 1 })
      })
    }`.compile()
    assert.strictEqual(
      query,
      "INSERT INTO people (\"name\",\"age\",\"json\") VALUES ($1,$2,$3)"
    )
    assert.lengthOf(params, 3)
    expect((params[2] as any).type).toEqual(3802)
  })

  it("insert array", () => {
    const [query, params] = sql`INSERT INTO people ${
      sql.insert({
        name: "Tim",
        age: 10,
        array: sql.array([1, 2, 3])
      })
    }`.compile()
    assert.strictEqual(
      query,
      "INSERT INTO people (\"name\",\"age\",\"array\") VALUES ($1,$2,$3)"
    )
    assert.lengthOf(params, 3)
    expect((params[2] as any).type).toEqual(1022)
  })

  it("update fragments", () => {
    const now = new Date()
    const [query, params] = sql`UPDATE people SET json = data.json FROM ${
      sql.updateValues(
        [{ json: sql.json({ a: 1 }) }, { json: sql.json({ b: 1 }) }],
        "data"
      )
    } WHERE created_at > ${now}`.compile()
    assert.strictEqual(
      query,
      `UPDATE people SET json = data.json FROM (values ($1),($2)) AS data("json") WHERE created_at > $3`
    )
    assert.lengthOf(params, 3)
    expect((params[0] as any).type).toEqual(3802)
    expect((params[1] as any).type).toEqual(3802)
  })
})
