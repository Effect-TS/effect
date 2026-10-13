// A nested project: its own paths and shared layers; it overrides one default (retries).
import * as Test from "../../../../src/Test.ts"
import { ProjectThing } from "../shared.ts"

export default Test.config({
  paths: ["test"],
  defaults: { retries: 2 },
  shared: [ProjectThing.layer]
})
