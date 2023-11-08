import type { Context } from "./Context.js"
import type { Fiber } from "./Fiber.js"
import type { Option } from "./Option.js"
import type { ParentSpan, Span, SpanLink, TracerTypeId } from "./Tracer.impl.js"

export * from "./internal/Jumpers/Tracer.js"
export * from "./Tracer.impl.js"

export declare namespace Tracer {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Tracer.impl.js"
}
/**
 * @since 2.0.0
 */
export interface Tracer {
  readonly [TracerTypeId]: TracerTypeId
  readonly span: (
    name: string,
    parent: Option<ParentSpan>,
    context: Context<never>,
    links: ReadonlyArray<SpanLink>,
    startTime: bigint
  ) => Span
  readonly context: <X>(f: () => X, fiber: Fiber.RuntimeFiber<any, any>) => X
}
