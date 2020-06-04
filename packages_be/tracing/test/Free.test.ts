import * as assert from "assert"

import { Span, SpanOptions, Tracer as OT } from "opentracing"

import { withTracer, withControllerSpan } from "../src"
import * as TR from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"

const URI: unique symbol = Symbol()

const m = F.define({
  [URI]: {
    shouldTrace: F.cn<T.Sync<void>>()
  }
})

const i = F.implement(m)({
  [URI]: {
    shouldTrace: T.unit
  }
})

class MockTracer extends OT {
  constructor(private readonly spans: Array<{ name: string; options: SpanOptions }>) {
    super()
  }
  startSpan(name: string, options?: SpanOptions): Span {
    this.spans.push({ name, options: options || {} })

    return super.startSpan(name, options)
  }
}

const {
  [URI]: { shouldTrace }
} = TR.access(m)

const program = pipe(
  withTracer(withControllerSpan("my program", "main")(shouldTrace)),
  i
)

describe("Trace Free", () => {
  it("trace access", async () => {
    const spans: any[] = []
    const mockT = new MockTracer(spans)
    const tracer = TR.tracer(T.pure(mockT))

    await T.runToPromiseExit(pipe(program, T.provide(tracer)))

    assert.deepStrictEqual(
      spans.map((s) => s.name),
      ["main", "shouldTrace"]
    )
  })
})
