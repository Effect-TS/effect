import * as JSONSchema from "@effect/schema/JSONSchema"
import * as S from "@effect/schema/Schema"
import { describe, it } from "vitest"

describe("dev", () => {
  it.skip("tmp", async () => {
    interface Category {
      readonly name: string
      readonly categories: ReadonlyArray<Category>
    }

    const schema: S.Schema<Category> = S.lazy<Category>(() =>
      S.struct({
        name: S.string,
        categories: S.array(schema)
      })
    ).pipe(S.identifier("Category"))

    const jsonSchema = JSONSchema.to(schema)

    console.log(JSON.stringify(jsonSchema, null, 2))
  })
})
