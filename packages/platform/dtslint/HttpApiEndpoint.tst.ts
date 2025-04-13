import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("HttpApiEndpoint", () => {
  it("should prevent duplicated params", () => {
    expect(
      HttpApiEndpoint.get("test")`/${HttpApiSchema.param("id", Schema.NumberFromString)}/${
        HttpApiSchema.param("id", Schema.NumberFromString)}`
    ).type.toRaiseError(`Argument of type 'Param<"id", typeof NumberFromString>' is not assignable to parameter of type '"Duplicate param :id"'.`)
  })
})
