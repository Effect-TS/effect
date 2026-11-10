import { Schema } from "effect"
import type { AsyncResult, Loader } from "effect/reactivity"
import { Loaded } from "effect/ui"
import type { Subscription } from "effect/ui"
import { GetUser, ListUsers } from "./app.ts"

type SnapshotKeys<Model> = { [K in keyof Model]: Model[K] extends Loaded.Snapshot<any, any> ? K : never }[keyof Model]
type ReadOf<S> = S extends Loaded.Snapshot<infer R extends Loader.AnyDefinition, any> ? R : never
type Result<S> = AsyncResult.AsyncResult<Loader.SuccessOf<ReadOf<S>>, Loader.ErrorOf<ReadOf<S>>>

declare const WatchesId: unique symbol
interface Watches<Model, Msg> extends Subscription.Subscription<Msg, Loaded.ServiceOf<ReadOf<Model[SnapshotKeys<Model>]>>> {
  readonly [WatchesId]: (_: Model) => Model
}

interface Bindings<Model, Props> {
  readonly empty: { readonly [K in SnapshotKeys<Model>]: Model[K] }
  readonly watch: <Msg>(
    model: Model,
    props: Props,
    handlers: { readonly [K in SnapshotKeys<Model>]: (snapshot: Model[K]) => Msg }
  ) => Watches<Model, Msg>
  readonly open: (model: Model, props: Props) => { readonly [K in SnapshotKeys<Model>]: Result<Model[K]> }
}

declare const bindings: <Model, Props = {}>(
  schemas: { readonly model: Schema.Codec<Model, any>; readonly props?: Schema.Codec<Props, any> },
  args: { readonly [K in SnapshotKeys<Model>]: (model: Model, props: Props) => Loader.ArgsOf<ReadOf<Model[K]>> | undefined }
) => Bindings<Model, Props>

// mock Component.make: a Model with snapshot fields requires subscriptions that start with the watches
declare const make: <Model, Msg, Props = {}>(
  options:
    & {
      readonly props?: Schema.Codec<Props, any>
      readonly model: Schema.Codec<Model, any>
      readonly message: Schema.Codec<Msg, any>
      readonly init: () => Model
      readonly view: (model: Model, props: Props) => unknown
    }
    & ([SnapshotKeys<Model>] extends [never] ? {
        readonly subscriptions?: (model: Model, props: Props) => ReadonlyArray<Subscription.Subscription<Msg, any>>
      }
      : {
        readonly subscriptions: (
          model: Model,
          props: Props
        ) => readonly [Watches<Model, Msg>, ...ReadonlyArray<Subscription.Subscription<Msg, any>>]
      })
) => void

const Props = Schema.Struct({ id: Schema.String })
const Model = Schema.Struct({ user: Loaded.Snapshot(GetUser, "user"), page: Loaded.Snapshot(ListUsers, "page"), n: Schema.Number })
const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Model.fields.user },
  PageChanged: { snapshot: Model.fields.page }
})
const read = bindings({ model: Model, props: Props }, {
  user: (_model, props) => ({ id: props.id }),
  page: (model) => ({ page: model.n })
})

make({
  props: Props,
  model: Model,
  message: Message,
  init: () => ({ ...read.empty, n: 0 }),
  subscriptions: (model, props) => [
    read.watch(model, props, {
      user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }),
      page: (snapshot) => Message.make({ _tag: "PageChanged", snapshot })
    })
  ],
  view: (model, props) => {
    const { user } = read.open(model, props)
    return user._tag === "Success" ? user.value.name : ""
  }
})

// @ts-expect-error a Model with snapshot fields and no subscriptions
make({ props: Props, model: Model, message: Message, init: () => ({ ...read.empty, n: 0 }), view: () => null })

make({
  props: Props,
  model: Model,
  message: Message,
  init: () => ({ ...read.empty, n: 0 }),
  // @ts-expect-error subscriptions without the watches
  subscriptions: () => [],
  view: () => null
})

declare const m: typeof Model.Type
// @ts-expect-error a snapshot field with no handler
read.watch(m, { id: "1" }, { user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })

// a Model with no snapshots needs no subscriptions
make({ model: Schema.Struct({ n: Schema.Number }), message: Message, init: () => ({ n: 0 }), view: () => null })
