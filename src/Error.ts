/**
 * @since 1.0.0
 */
import type * as Channel from "./Channel"
import * as Data from "./Data"
import * as Effect from "./Effect"
import * as Effectable from "./Effectable"
import type * as Equal from "./Equal"
import * as Inspectable from "./Inspectable"
import * as OpCodes from "./internal/opCodes/effect"
import { type Pipeable, pipeArguments } from "./Pipeable"
import type * as Sink from "./Sink"
import type * as Types from "./Types"

/**
 * @since 1.0.0
 * @category constructors
 */
export class Structural<A extends Record<string, any>> extends Data.Structural<A>
  implements Pipeable, Inspectable.Inspectable
{
  /**
   * @since 1.0.0
   */
  _op = OpCodes.OP_COMMIT
  /**
   * @since 1.0.0
   */
  commit(): Effect.Effect<never, this, never> {
    return Effect.fail(this)
  }
  /**
   * @since 1.0.0
   */
  get [Effectable.EffectTypeId](): Effect.Effect.VarianceStruct<never, this, never> {
    return {
      _R: (_: never) => _,
      _E: (_: never) => this,
      _A: (_: never) => _
    }
  }
  /**
   * @since 1.0.0
   */
  get [Effectable.StreamTypeId](): Effect.Effect.VarianceStruct<never, this, never> {
    return {
      _R: (_: never) => _,
      _E: (_: never) => this,
      _A: (_: never) => _
    }
  }
  /**
   * @since 1.0.0
   */
  get [Effectable.SinkTypeId](): Sink.Sink.VarianceStruct<never, this, unknown, never, never> {
    return {
      _R: (_: never) => _,
      _E: (_: never) => this,
      _In: (_: unknown) => {},
      _L: (_: never) => _,
      _Z: (_: never) => _
    }
  }
  /**
   * @since 1.0.0
   */
  get [Effectable.ChannelTypeId](): Channel.Channel.VarianceStruct<
    never,
    unknown,
    unknown,
    unknown,
    this,
    never,
    never
  > {
    return {
      _Env: (_: never) => _,
      _InErr: (_: unknown) => {},
      _InElem: (_: unknown) => {},
      _InDone: (_: unknown) => {},
      _OutErr: (_: never) => this,
      _OutElem: (_: never) => _,
      _OutDone: (_: never) => _
    }
  }
  /**
   * @since 1.0.0
   */
  pipe() {
    return pipeArguments(this, arguments)
  }
  /**
   * @since 1.0.0
   */
  toJSON() {
    return { ...this }
  }
  /**
   * @since 1.0.0
   */
  toString() {
    return Inspectable.toString(this)
  }
  /**
   * @since 1.0.0
   */
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Tagged = <Tag extends string>(tag: Tag): new<A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Structural<{ readonly _tag: Tag } & A> => {
  class Base extends Structural<any> {
    readonly _tag = tag
  }
  return Base as any
}
