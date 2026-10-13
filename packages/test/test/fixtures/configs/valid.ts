import * as Layer from "effect/Layer"
import * as Test from "../../../src/Test.ts"

export default Test.config({
  paths: ["test"],
  exclude: ["**/fixtures/**"],
  workers: 3,
  defaults: { timeout: "30 seconds", retries: 1 },
  shared: [Layer.empty]
})
