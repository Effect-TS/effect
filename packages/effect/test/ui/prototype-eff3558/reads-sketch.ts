// Type sketch: args declared in Component.make, with its real ten type parameters. Types only.
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import type { Loader } from "effect/reactivity"
import { Loaded } from "effect/ui"
import type { Command, Component, Head, Subscription, View } from "effect/ui"
import { Html } from "effect/ui/html"
import { GetUser, ListUsers } from "./app.ts"

type SnapshotKeys<Model> = { [K in keyof Model]: Model[K] extends Loaded.Snapshot<any, any> ? K : never }[keyof Model]
type ReadOf<S> = S extends Loaded.Snapshot<infer R extends Loader.AnyDefinition, any> ? R : never
type Result<S> = AsyncResult.AsyncResult<Loader.SuccessOf<ReadOf<S>>, Loader.ErrorOf<ReadOf<S>>>
type Services<Model> = Loaded.ServiceOf<ReadOf<Model[SnapshotKeys<Model>]>>

declare const WatchesId: unique symbol
interface Watches<Model, Msg> extends Subscription.Subscription<Msg, Services<Model>> {
  readonly [WatchesId]: (_: Model) => Model
}
type Empty<Model> = { readonly [K in SnapshotKeys<Model>]: Model[K] }
type Opened<Model> = { readonly [K in SnapshotKeys<Model>]: Result<Model[K]> }
type Watch<Model, Msg> = (
  handlers: { readonly [K in SnapshotKeys<Model>]: (snapshot: Model[K]) => Msg }
) => Watches<Model, Msg>

declare const make: <
  const Name extends string,
  Model,
  Msg,
  Props = {},
  Events = never,
  UI extends Model | Component.Step<Model, Msg, Events, any> = Model,
  U extends Model | Component.Step<Model, Msg, Events, any> = Model,
  UV extends View.Node<Msg, any> = View.Node<Msg>,
  S extends Subscription.Subscription<Msg, any> = never,
  V extends View.Elements = View.Registered
>(
  options:
    & {
      readonly name: Name
      readonly props?: Schema.Codec<Props, any> | undefined
      readonly model: Schema.Codec<Model, any>
      readonly message: Schema.Codec<Msg, any>
      readonly events?: Schema.Codec<Events, any> | undefined
      readonly init: ($: Component.Init<Model, Msg, Events, Props> & { readonly empty: Empty<Model> }) => UI
      readonly update: (model: Model, msg: Msg, $: Component.Update<Model, Msg, Events, Props>) => U
      readonly view: (
        model: Model,
        h: View.Helper<Msg, Props> & View.Tags<V, Msg> & { readonly reads: Opened<Model> }
      ) => UV
      readonly head?: ((model: Model) => ReadonlyArray<Head.Entry>) | undefined
      readonly elements?: View.Vocabulary<V> | undefined
    }
    & ([SnapshotKeys<Model>] extends [never] ? {
        readonly subscriptions?:
          | ((model: Model, props: Props) => ReadonlyArray<S | false | null | undefined>)
          | undefined
      }
      : {
        readonly reads: {
          readonly [K in SnapshotKeys<Model>]: (model: Model, props: Props) => Loader.ArgsOf<ReadOf<Model[K]>> | undefined
        }
        readonly subscriptions: (
          model: Model,
          props: Props,
          watch: Watch<Model, Msg>
        ) => readonly [Watches<Model, Msg>, ...ReadonlyArray<S | false | null | undefined>]
      })
) => Component.Component<
  Name,
  Props,
  Model,
  Msg,
  Events,
  Exclude<
    | Component.StepRequirements<UI>
    | Component.StepRequirements<U>
    | View.Requirements<UV>
    | Subscription.Requirements<S>
    | Services<Model>,
    Command.FrameworkService
  >,
  V
>

const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Loaded.Snapshot(GetUser, "user") },
  PageChanged: { snapshot: Loaded.Snapshot(ListUsers, "page") },
  Bump: {}
})

// 1. no annotations, and the Model and props Schemas appear once
export const Card = make({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({
    user: Loaded.Snapshot(GetUser, "user"),
    page: Loaded.Snapshot(ListUsers, "page"),
    n: Schema.Number
  }),
  message: Message,
  elements: Html,
  reads: {
    user: (_model, props) => ({ id: props.id }),
    page: (model) => ({ page: model.n })
  },
  init: ($) => ({ ...$.empty, n: 0 }),
  update: (model, message) =>
    Message.match(message, {
      UserChanged: ({ snapshot }) => ({ ...model, user: snapshot }),
      PageChanged: ({ snapshot }) => ({ ...model, page: snapshot }),
      Bump: () => ({ ...model, n: model.n + 1 })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({
      user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }),
      page: (snapshot) => Message.make({ _tag: "PageChanged", snapshot })
    })
  ],
  view: (_model, h) =>
    AsyncResult.match(h.reads.user, {
      onInitial: () => h.p("Loading"),
      onFailure: () => h.p("Missing"),
      onSuccess: ({ value }) => h.p(value.name).onClick(Message.make({ _tag: "Bump" }))
    })
})
export const requirements: Component.Requirements<typeof Card> = null as any as GetUser | ListUsers

const base = {
  name: "X",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: Loaded.Snapshot(GetUser, "user") }),
  message: Message,
  elements: Html
} as const

// 2. snapshot fields and no reads / no subscriptions
// @ts-expect-error
make({ ...base, init: ($) => ({ ...$.empty }), update: (model) => model, view: (_model, h) => h.p("x") })

// 3. wrong args
make({
  ...base,
  // @ts-expect-error
  reads: { user: (_model, props) => ({ page: props.id }) },
  init: ($) => ({ ...$.empty }),
  update: (model) => model,
  subscriptions: (_m, _p, watch) => [watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })],
  view: (_model, h) => h.p("x")
})

// 4. subscriptions without the watch
make({
  ...base,
  reads: { user: (_model, props) => ({ id: props.id }) },
  init: ($) => ({ ...$.empty }),
  update: (model) => model,
  // @ts-expect-error
  subscriptions: () => [],
  view: (_model, h) => h.p("x")
})

// 5. a field with no handler
make({
  ...base,
  model: Schema.Struct({ user: Loaded.Snapshot(GetUser, "user"), page: Loaded.Snapshot(ListUsers, "page") }),
  reads: { user: (_model, props) => ({ id: props.id }), page: () => ({ page: 0 }) },
  init: ($) => ({ ...$.empty }),
  update: (model) => model,
  // @ts-expect-error
  subscriptions: (_m, _p, watch) => [watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })],
  view: (_model, h) => h.p("x")
})

// 6. a Model with no snapshots is unchanged
make({
  name: "Plain",
  model: Schema.Struct({ n: Schema.Number }),
  message: Message,
  elements: Html,
  init: () => ({ n: 0 }),
  update: (model) => model,
  view: (model, h) => h.p(String(model.n))
})

// 7. nothing above is inferred as any
make({
  ...base,
  reads: { user: (_model, props) => ({ id: props.id }) },
  init: ($) => ({ ...$.empty }),
  update: (model) => model,
  subscriptions: (_m, _p, watch) => [watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })],
  view: (model, h) => {
    // @ts-expect-error
    model.nope
    // @ts-expect-error
    h.props.nope
    // @ts-expect-error
    h.reads.nope
    return AsyncResult.match(h.reads.user, {
      onInitial: () => h.p("Loading"),
      onFailure: () => h.p("Missing"),
      // @ts-expect-error
      onSuccess: ({ value }) => h.p(value.nope)
    })
  }
})
// @ts-expect-error
export const none: Component.Requirements<typeof Card> = null as any as string
