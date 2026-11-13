/**
 * A tiny element vocabulary for the tests: a `box` that can't hold text, a
 * `label` that can, and a void `field` with a value, an input event and its
 * own node type for refs and mounts.
 */
import type { Effect, Stream } from "effect"
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
    run: (node: Node) => Effect.Effect<Msg | void, never, R2>
  ): TinyVoid<Msg, R | R2, Handlers, Node>
  override onMount<I, R2>(
    name: string,
    input: I,
    run: (node: Node, changes: Stream.Stream<I>) => Effect.Effect<Msg | void, never, R2>
  ): TinyVoid<Msg, R | R2, Handlers, Node>
  override onMount(name: string, ...args: ReadonlyArray<any>): any {
    return (super.onMount as any)(name, ...args)
  }
}

export class TinyElement<out Msg, out R = never, in out Handlers = Record<string, unknown>, in out Node = unknown>
  extends TinyVoid<Msg, R, Handlers, Node>
{
  override onMount<R2>(
    name: string,
    run: (node: Node) => Effect.Effect<Msg | void, never, R2>
  ): TinyElement<Msg, R | R2, Handlers, Node>
  override onMount<I, R2>(
    name: string,
    input: I,
    run: (node: Node, changes: Stream.Stream<I>) => Effect.Effect<Msg | void, never, R2>
  ): TinyElement<Msg, R | R2, Handlers, Node>
  override onMount(name: string, ...args: ReadonlyArray<any>): any {
    return (super.onMount as any)(name, ...args)
  }
  children<const C extends ReadonlyArray<View.Input<Msg, any>>>(
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
