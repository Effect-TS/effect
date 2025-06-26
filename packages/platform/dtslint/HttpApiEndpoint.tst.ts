/* eslint @typescript-eslint/no-unused-expressions: "off" */

import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { describe, it } from "tstyche"

describe("HttpApiEndpoint", () => {
  it("should prevent duplicated params", () => {
    HttpApiEndpoint.get("test")`/${HttpApiSchema.param("id", Schema.NumberFromString)}/${
      // @ts-expect-error: Argument of type 'Param<"id", typeof NumberFromString>' is not assignable to parameter of type '"Duplicate param: id"'
      HttpApiSchema.param("id", Schema.NumberFromString)}`
  })
})
