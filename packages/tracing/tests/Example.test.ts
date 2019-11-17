import * as assert from "assert";

import * as E from "@matechs/effect";
import * as Ei from "fp-ts/lib/Either";

import { program, module } from "./demo/Main";
import { pipe } from "fp-ts/lib/pipeable";
import { Span, SpanOptions, Tracer as OT, SpanContext } from "opentracing";
import { Tracer, TracerFactory, withControllerSpan, withTracer } from "../src";

class MockTracer extends OT {
  constructor(private spans: Array<{ name: string; options: SpanOptions }>) {
    super();
  }
  startSpan(name: string, options?: SpanOptions): Span {
    this.spans.push({ name, options });

    return super.startSpan(name, options);
  }
}

class MockTracer2 extends OT {
  constructor(private spans: Array<{ name: string; options: SpanOptions }>) {
    super();
  }
  startSpan(name: string, options?: SpanOptions): Span {
    this.spans.push({ name, options });

    return super.startSpan(name, options);
  }
  extract(format: string, carrier: any): SpanContext | null {
    return {
      toSpanId(): string {
        return "demo-span-id";
      },
      toTraceId(): string {
        return "demo-trace-id";
      }
    };
  }
}

describe("Example", () => {
  it("should collect messages from log", async () => {
    const messages: Array<string> = [];
    const spans: Array<{ name: string; options: SpanOptions }> = [];

    const tracer = new MockTracer(spans);

    const mockModule: typeof module = {
      counter: module.counter,
      tracer: {
        ...module.tracer,
        factory: E.liftIO(() => tracer)
      },
      printer: {
        print(s) {
          return E.liftIO(() => {
            messages.push(s);
          });
        }
      }
    };

    const result = await E.run(pipe(program, E.provide(mockModule)))();

    assert.deepEqual(
      spans.filter(s => s.name.indexOf("demo-main") >= 0).length,
      1
    );
    assert.deepEqual(
      spans.filter(s => s.name.indexOf("span-") >= 0).length,
      20
    );

    assert.deepEqual(result, Ei.right({ start: 0, end: 20 }));
    assert.deepEqual(messages, [
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
    ]);
  });

  it("should extract trace", async () => {
    const messages: Array<string> = [];
    const spans: Array<{ name: string; options: SpanOptions }> = [];

    const tracer = new MockTracer2(spans);

    const mockModule: Tracer & TracerFactory = {
      tracer: {
        ...module.tracer,
        factory: E.liftIO(() => tracer)
      }
    };

    const program2 = withTracer(
      withControllerSpan("", "", {})(E.liftIO(() => {}))
    );

    const result = await E.run(pipe(program2, E.provide(mockModule)))();

    assert.deepEqual(
      spans[0]["options"]["references"][0]["_referencedContext"].toSpanId(),
      "demo-span-id"
    );
    assert.deepEqual(
      spans[0]["options"]["references"][0]["_referencedContext"].toTraceId(),
      "demo-trace-id"
    );
  });
});
