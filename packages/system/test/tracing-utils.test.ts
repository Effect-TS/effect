import "../src/Tracing/Enable/index.js"

import { accessCallTrace, traceCall } from "../src/Tracing/index.js"

describe("Tracing Utils", () => {
  it("should access call trace", () => {
    traceCall(() => {
      const trace = accessCallTrace()
      expect(trace).toEqual("trace")
    }, "trace")()
  })
})
