import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import type { Loader } from "effect/reactivity"
import { Component, Loaded } from "effect/ui"
import { Html } from "effect/ui/html"
import { GetUser, ListUsers } from "./app.ts"

type SnapshotKeys<Model> = { [K in keyof Model]: Model[K] extends Loaded.Snapshot<any, any> ? K : never }[keyof Model]
type ReadOf<S> = S extends Loaded.Snapshot<infer R extends Loader.AnyDefinition, any> ? R : never
type LabelOf<S> = S extends Loaded.Snapshot<any, infer L> ? L : never

// A: one field at a time, props annotated or defaulted
declare const field: <Model, const K extends SnapshotKeys<Model> & string, Props = {}>(
  model: Schema.Codec<Model, any>,
  key: K,
  args: (model: Model, props: Props) => Loader.ArgsOf<ReadOf<Model[K]>> | undefined
) => Loaded.Binding<ReadOf<Model[K]>, LabelOf<Model[K]>, Model, Props>

// B: all fields at once, props from the props Schema; every snapshot field is required
declare const bindings: <Model, Props = {}>(
  schemas: { readonly model: Schema.Codec<Model, any>; readonly props?: Schema.Codec<Props, any> },
  args: { readonly [K in SnapshotKeys<Model>]: (model: Model, props: Props) => Loader.ArgsOf<ReadOf<Model[K]>> | undefined }
) => { readonly [K in SnapshotKeys<Model>]: Loaded.Binding<ReadOf<Model[K]>, LabelOf<Model[K]>, Model, Props> }

const Props = Schema.Struct({ id: Schema.String })
const Model = Schema.Struct({ user: Loaded.Snapshot(GetUser, "user"), page: Loaded.Snapshot(ListUsers, "page"), n: Schema.Number })
const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Model.fields.user },
  PageChanged: { snapshot: Model.fields.page }
})

// A
export const a = field(Model, "user", (_model, props: typeof Props.Type) => ({ id: props.id }))
// @ts-expect-error not a snapshot field
field(Model, "n", () => ({ id: "1" }))
// @ts-expect-error wrong args
field(Model, "user", (model) => ({ page: model.n }))

// B
const read = bindings({ model: Model, props: Props }, {
  user: (_model, props) => ({ id: props.id }),
  page: (model) => ({ page: model.n })
})
// @ts-expect-error a snapshot field with no args
bindings({ model: Model, props: Props }, { user: (_model, props) => ({ id: props.id }) })
bindings({ model: Model, props: Props }, {
  user: (_model, props) => ({ id: props.id }),
  // @ts-expect-error wrong args
  page: (model) => ({ id: model.n })
})

export const Card = Component.make({
  name: "Card",
  props: Props,
  model: Model,
  message: Message,
  elements: Html,
  init: () => ({ user: read.user.empty, page: read.page.empty, n: 0 }),
  update: (model, message) =>
    Message.match(message, {
      UserChanged: ({ snapshot }) => ({ ...model, user: snapshot }),
      PageChanged: ({ snapshot }) => ({ ...model, page: snapshot })
    }),
  subscriptions: (model, props) => [
    read.user.watch(model, props, (snapshot) => Message.make({ _tag: "UserChanged", snapshot })),
    read.page.watch(model, props, (snapshot) => Message.make({ _tag: "PageChanged", snapshot }))
  ],
  view: (model, h) =>
    AsyncResult.match(read.user.open(model.user, model, h.props), {
      onInitial: () => h.p("Loading"),
      onFailure: () => h.p("Missing"),
      onSuccess: ({ value }) => h.p(value.name)
    })
})
declare const m: typeof Model.Type
// Compiles today and should not: the snapshot brand is lost through the message constructor.
read.user.watch(m, { id: "1" }, (snapshot) => Message.cases.PageChanged.make({ snapshot }))
