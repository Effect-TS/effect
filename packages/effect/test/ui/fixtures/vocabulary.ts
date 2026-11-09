/**
 * A tiny element vocabulary for the tests: a `box` that can't hold text, a
 * `label` that can, and a `field` with a value, an input event and its own
 * node type for refs and mounts.
 */
import { View } from "effect/ui"

export interface TinyField {
  readonly _tag: "Field"
}

export interface TinyHost {
  readonly TinyHost: unique symbol
}

export class TinyElement<out Msg, out R = never, in out Events = Record<string, unknown>, in out Node = unknown>
  extends View.ElementBuilder<Msg, R, Events, Node>
{
  value(value: string): this {
    return this.prop("value", value)
  }
}

export interface TinyTags<Msg> {
  readonly box: <const C extends ReadonlyArray<View.Input<Msg>>>(
    ...children: C
  ) => TinyElement<Msg, View.Requirements<C[number]>, { readonly click: {} }>
  readonly label: (text: string) => TinyElement<Msg, never, { readonly click: {} }>
  readonly field: () => TinyElement<Msg, never, { readonly input: { readonly value: string } }, TinyField>
}

export interface Tiny extends View.Elements {
  readonly Tags: TinyTags<this["Msg"]>
  readonly Host: TinyHost
}

export const Tiny: View.Vocabulary<Tiny> = {
  name: "tiny",
  tags: {
    box: (...children: ReadonlyArray<View.Input<any>>) => new TinyElement("box", View.children(children)),
    label: (text: string) => new TinyElement("label", [View.text(text)]),
    field: () => new TinyElement("field", [])
  },
  textParents: ["label"]
}
