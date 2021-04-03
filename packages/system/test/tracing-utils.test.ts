import "../src/Tracing/Enable"

import { accessCallTrace, traceCall } from "../src/Tracing"

describe("Tracing Utils", () => {
  it("should access call trace", () => {
    traceCall(() => {
      const trace = accessCallTrace()
      expect(trace).toEqual("trace")
    }, "trace")()
  })
})
