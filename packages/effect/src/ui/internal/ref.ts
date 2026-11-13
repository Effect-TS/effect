/**
 * Component refs: how a parent names a child slot it sends messages to.
 *
 * @internal
 */
import { identity } from "../../Function.ts"
import type * as Schema from "../../Schema.ts"

/** @internal */
export const TypeId = "~effect/ui/Component/Ref" as const

/** @internal */
export interface ChildRef {
  readonly [TypeId]: { readonly _Msg: (_: never) => unknown }
  readonly name: string
  readonly key: string
  readonly receives: Schema.Codec<any, any>
  readonly at: (key: string | number) => ChildRef
}

const variance = { _Msg: identity }

/** A ref named `name`, whose key is `key`: the name plus any `at` keys, as `Renderer.ref` writes them. @internal */
export const make = (name: string, receives: Schema.Codec<any, any>, key: string = name): ChildRef => ({
  [TypeId]: variance,
  name,
  key,
  receives,
  at: (row) => make(name, receives, `${key}[${row}]`)
})
