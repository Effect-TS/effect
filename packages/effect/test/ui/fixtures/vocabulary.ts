/**
 * A tiny element vocabulary for the tests: a `box` that can't hold text, a
 * `label` that can, and a void `field` with a value, an input event and its
 * own node type for refs and mounts.
 */
import type { Effect } from "effect"
import { View } from "effect/ui"

export interface TinyField {
  readonly _tag: "Field"
}

export interface TinyHost {
  readonly TinyHost: unique symbol
}

export class TinyVoid<out Msg, out R = never, in out Handlers = Record<string, unknown>, in out Node = unknown>
  extends View.ElementBuilder<Msg, R, Handlers, Node>
{
  value(value: string): this {
    return this.prop("value", value)
  }
  override onMount<R2>(
    name: string,
    run: (node: Node) => Effect.Effect<Msg, never, R2>
  ): TinyVoid<Msg, R | R2, Handlers, Node> {
    return super.onMount(name, run) as any
  }
}

export class TinyElement<out Msg, out R = never, in out Handlers = Record<string, unknown>, in out Node = unknown>
  extends TinyVoid<Msg, R, Handlers, Node>
{
  override onMount<R2>(
    name: string,
    run: (node: Node) => Effect.Effect<Msg, never, R2>
  ): TinyElement<Msg, R | R2, Handlers, Node> {
    return super.onMount(name, run) as any
  }
  children<const C extends ReadonlyArray<View.Input<Msg>>>(
    ...inputs: C
  ): View.Element<Msg, R | View.Requirements<C[number]>> {
    return View.build(this, inputs)
  }
}

export interface TinyTags<Msg> {
  readonly box: View.Shorthand<TinyElement<Msg, never, { readonly click: {} }>>
  readonly label: View.Shorthand<TinyElement<Msg, never, { readonly click: {} }>>
  readonly field: TinyVoid<Msg, never, { readonly input: { readonly value: string } }, TinyField>
}

export interface Tiny extends View.Elements {
  readonly Tags: TinyTags<this["Msg"]>
  readonly Host: TinyHost
}

export const Tiny: View.Vocabulary<Tiny> = {
  name: "tiny",
  tags: {
    box: View.shorthand(new TinyElement("box")),
    label: View.shorthand(new TinyElement("label")),
    field: new TinyVoid("field")
  },
  textParents: ["label"]
}
