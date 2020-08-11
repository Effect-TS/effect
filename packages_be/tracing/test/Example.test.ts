import * as assert from "assert"

import { Span, SpanOptions, Tracer as OT, SpanContext } from "opentracing"

import {
  addSpanTags,
  Tracer,
  withChildSpan,
  withControllerSpan,
  withTracer
} from "../src"

import { Counter, CounterURI, currentCount, increment } from "./demo/Counter"
import { program } from "./demo/Main"
import { print, Printer, PrinterURI } from "./demo/Printer"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"

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

class MockSpan extends Span {
  constructor(
    public readonly name: string,
    public readonly tags: Record<string, unknown>
  ) {
    super()
  }

  protected _addTags(keyValuePairs: { [p: string]: unknown }) {
    for (const [k, v] of Object.entries(keyValuePairs)) {
      this.tags[k] = v
    }
  }
}

class MockTracer3 extends OT {
  constructor(private readonly spans: Array<Span>) {
    super()
  }
  startSpan(name: string, options?: SpanOptions): Span {
    const span = super.startSpan(name, options)
    this.spans.push(span)
    return span
  }

  protected _startSpan(name: string, fields: SpanOptions): Span {
    return new MockSpan(name, fields.tags || {})
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
        Tracer(T.sync(() => mockTracer))
          .with(
            L.fromValue<Printer>({
              [PrinterURI]: {
                print(s) {
                  return T.sync(() => {
                    messages.push(s)
                  })
                }
              }
            })
          )
          .with(Counter).use
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

    const mockModule = Tracer(T.sync(() => mockTracer))

    const program2 = withTracer(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      withControllerSpan("", "", {})(T.sync(() => {}))
    )

    await T.runToPromise(pipe(program2, mockModule.use))

    assert.deepStrictEqual(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      spans[0]["options"]["references"][0]["_referencedContext"].toSpanId(),
      "demo-span-id"
    )
    assert.deepStrictEqual(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

    const result = await T.runToPromiseExit(Tracer().use(program2))

    assert.deepStrictEqual(result, Ex.raise(new Error("not implemented")))
  })

  it("adds tags to correct child", async () => {
    const spans: Array<MockSpan> = []
    const mockTracer = new MockTracer3(spans)
    const result = await T.runToPromiseExit(
      pipe(
        program,
        Tracer(T.sync(() => mockTracer))
          .with(
            L.fromValue<Printer>({ [PrinterURI]: { print: () => T.unit } })
          )
          .with(Counter).use
      )
    )

    assert.deepStrictEqual(spans.filter((s) => !!s.tags["some.tag"]).length, 20)
    assert.deepStrictEqual(result, Ex.done({ start: 0, end: 20 }))
  })

  it("adds tags even if effect fails", async () => {
    const failableCounter = L.fromValue<Counter>({
      [CounterURI]: {
        count() {
          return pipe(
            A.range(1, 10),
            T.traverseArray((n) =>
              T.Do()
                .do(increment())
                .bind(
                  "count",
                  pipe(
                    currentCount(),
                    addSpanTags({ "some.tag": "tag value" }),
                    withChildSpan("span-current-count")
                  )
                )
                .doL(({ count }) => print(`n: ${n} (${count})`))
                .unit()
            ),
            T.chain((vals) =>
              pipe(
                T.raiseError(new Error("sample error")),
                addSpanTags({ "another.tag": "tag value" }),
                withChildSpan("span-with-failed-effect"),
                T.chainError(() => T.pure(vals))
              )
            )
          )
        }
      }
    })

    const spans: Array<MockSpan> = []
    const mockTracer = new MockTracer3(spans)
    const result = await T.runToPromiseExit(
      pipe(
        program,
        Tracer(T.sync(() => mockTracer))
          .with(
            L.fromValue<Printer>({ [PrinterURI]: { print: () => T.unit } })
          )
          .with(failableCounter).use
      )
    )

    assert.deepStrictEqual(spans.filter((s) => !!s.tags["another.tag"]).length, 2)
    assert.deepStrictEqual(result, Ex.done({ start: 0, end: 20 }))
  })
})
