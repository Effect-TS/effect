/**
 * @since 2.0.0
 */
import type { Context } from "./Context.js"
import type { Fiber } from "./Fiber.js"
import type { ParentSpan, Span, SpanLink, TracerTypeId } from "./impl/Tracer.js"
import type { Option } from "./Option.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Tracer.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Tracer.js"

/**
 * @since 2.0.0
 */
export declare namespace Tracer {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Tracer.js"
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
