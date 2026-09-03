import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { describe, expect, it } from "tstyche"

declare const evaluate: () => never

describe("NodeStream", () => {
  it("rejects the ignored bufferSize option", () => {
    expect(NodeStream.fromReadable).type.not.toBeCallableWith({
      evaluate,
      bufferSize: 1
    })
    expect(NodeStream.fromDuplex).type.not.toBeCallableWith({
      evaluate,
      bufferSize: 1
    })
    expect(NodeStream.pipeThroughDuplex).type.not.toBeCallableWith({
      evaluate,
      bufferSize: 1
    })
  })
})
