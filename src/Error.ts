/**
 * @since 1.0.0
 */
import type * as Channel from "./Channel"
import type * as Data from "./Data"
import * as Effect from "./Effect"
import * as Effectable from "./Effectable"
import type * as Equal from "./Equal"
import type * as Inspectable from "./Inspectable"
import { type Pipeable } from "./Pipeable"
import type * as Sink from "./Sink"
import type * as Types from "./Types"

/**
 * @since 1.0.0
 * @category models
 */
export interface YieldableError extends Data.Case, Pipeable, Inspectable.Inspectable {
  readonly [Effectable.EffectTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.StreamTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.SinkTypeId]: Sink.Sink.VarianceStruct<never, this, unknown, never, never>
  readonly [Effectable.ChannelTypeId]: Channel.Channel.VarianceStruct<
    never,
    unknown,
    unknown,
    unknown,
    this,
    never,
    never
  >
}

const YieldableErrorProto = {
  ...Effectable.StructuralBase.prototype,
  commit() {
    return Effect.fail(this)
  }
}

/**
 * Provides a constructor for a Case Class.
 *
 * @since 1.0.0
 * @category constructors
 */
export const Class: new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => YieldableError & A = (function() {
  function Base(this: any, args: any) {
    if (args) {
      Object.assign(this, args)
    }
  }
  Base.prototype = YieldableErrorProto
  return Base as any
})()

/**
 * @since 1.0.0
 * @category constructors
 */
export const Tagged = <Tag extends string>(tag: Tag): new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => YieldableError & { readonly _tag: Tag } & A => {
  class Base extends Class<any> {
    readonly _tag = tag
  }
  return Base as any
}
