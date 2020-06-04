import * as assert from "assert"

import { Span, SpanOptions, Tracer as OT, SpanContext } from "opentracing"

import { tracer, Tracer, withChildSpan, withControllerSpan, withTracer } from "../src"

import { counter } from "./demo/Counter"
import { program } from "./demo/Main"
import { Printer } from "./demo/Printer"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"

class MockTracer extends OT {
  constructor(private readonly spans: Array<{ name: string; options: SpanOptions }>) {
    super()
  }
  startSpan(name: string, options?: SpanOptions): Span {
    this.spans.push({ name, options: options || {} })

    return super.startSpan(name, options)
  }
}

class MockTracer2 extends OT {
  constructor(private readonly spans: Array<{ name: string; options: SpanOptions }>) {
    super()
  }
  startSpan(name: string, options?: SpanOptions): Span {
    this.spans.push({ name, options: options || {} })

    return super.startSpan(name, options)
  }
  // tslint:disable-next-line: prefer-function-over-method
  extract(format: string, carrier: any): SpanContext | null {
    return {
      toSpanId(): string {
        return "demo-span-id"
      },
      toTraceId(): string {
        return "demo-trace-id"
      }
    }
  }
}

describe("Example", () => {
  it("should collect messages from log", async () => {
    const messages: Array<string> = []
    const spans: Array<{ name: string; options: SpanOptions }> = []

    const mockTracer = new MockTracer(spans)

    const result = await T.runToPromiseExit(
      pipe(
        program,
        T.provide(tracer(T.sync(() => mockTracer))),
        T.provide<Printer>({
          printer: {
            print(s) {
              return T.sync(() => {
                messages.push(s)
              })
            }
          }
        }),
        T.provide(counter)
      )
    )

    assert.deepStrictEqual(
      spans.filter((s) => s.name.indexOf("demo-main") >= 0).length,
      1
    )
    assert.deepStrictEqual(spans.filter((s) => s.name.indexOf("span-") >= 0).length, 20)

    assert.deepStrictEqual(result, Ex.done({ start: 0, end: 20 }))
    assert.deepStrictEqual(messages, [
      "n: 1 (1)",
      "n: 2 (2)",
      "n: 3 (3)",
      "n: 4 (4)",
      "n: 5 (5)",
      "n: 6 (6)",
      "n: 7 (7)",
      "n: 8 (8)",
      "n: 9 (9)",
      "n: 10 (10)",
      "n: 1 (11)",
      "n: 2 (12)",
      "n: 3 (13)",
      "n: 4 (14)",
      "n: 5 (15)",
      "n: 6 (16)",
      "n: 7 (17)",
      "n: 8 (18)",
      "n: 9 (19)",
      "n: 10 (20)",
      "done - 0 <-> 20"
    ])
  })

  it("should extract trace", async () => {
    const spans: Array<{ name: string; options: SpanOptions }> = []

    const mockTracer = new MockTracer2(spans)

    const mockModule: Tracer = tracer(T.sync(() => mockTracer))

    const program2 = withTracer(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      withControllerSpan("", "", {})(T.sync(() => {}))
    )

    await T.runToPromise(pipe(program2, T.provide(mockModule)))

    assert.deepStrictEqual(
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      spans[0]["options"]["references"][0]["_referencedContext"].toSpanId(),
      "demo-span-id"
    )
    assert.deepStrictEqual(
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      spans[0]["options"]["references"][0]["_referencedContext"].toTraceId(),
      "demo-trace-id"
    )
  })

  it("should use dummy tracer by default", async () => {
    const program2 = withControllerSpan(
      "noop",
      "noop"
    )(withChildSpan("noop")(T.raiseError(new Error("not implemented"))))

    const result = await T.runToPromiseExit(program2)

    assert.deepStrictEqual(result, Ex.raise(new Error("not implemented")))
  })

  it("skip tracing if out of context", async () => {
    const program2 = withChildSpan("noop")(T.raiseError(new Error("not implemented")))

    const result = await T.runToPromiseExit(T.provide(tracer())(program2))

    assert.deepStrictEqual(result, Ex.raise(new Error("not implemented")))
  })
})
