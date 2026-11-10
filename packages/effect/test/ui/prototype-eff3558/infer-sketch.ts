import { Schema } from "effect"
import type { AsyncResult, Loader } from "effect/reactivity"
import { Loaded } from "effect/ui"
import { GetUser, ListUsers } from "./app.ts"

type SnapshotKeys<Model> = { [K in keyof Model]: Model[K] extends Loaded.Snapshot<any, any> ? K : never }[keyof Model]
type Loaders<Model, Props, Msg> = {
  readonly [K in SnapshotKeys<Model>]: Model[K] extends Loaded.Snapshot<infer R, infer L> ? [L] extends [K] ? {
        readonly args: (model: Model, props: Props) => Loader.ArgsOf<R> | undefined
        readonly onChange: (snapshot: Model[K]) => Msg
      }
    : "the label must equal the field name"
    : never
}
type Opened<S> = S extends Loaded.Snapshot<infer R, any> ? AsyncResult.AsyncResult<Loader.SuccessOf<R>, Loader.ErrorOf<R>>
  : never

declare const make: <Model, Msg, Props = {}>(options: {
  readonly props?: Schema.Codec<Props, any>
  readonly model: Schema.Codec<Model, any>
  readonly message: Schema.Codec<Msg, any>
  readonly loaders: Loaders<Model, Props, Msg>
  readonly view: (
    model: Model,
    h: { readonly props: Props; readonly open: <K extends SnapshotKeys<Model>>(key: K) => Opened<Model[K]> }
  ) => unknown
}) => void

const UserSnapshot = Loaded.Snapshot(GetUser, "user")
const Message = Schema.TaggedUnion({ UserChanged: { snapshot: UserSnapshot }, Like: {} })

// 1. no annotations anywhere
make({
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: UserSnapshot, n: Schema.Number }),
  message: Message,
  loaders: {
    user: {
      args: (_model, props) => ({ id: props.id }),
      onChange: (snapshot) => Message.make({ _tag: "UserChanged", snapshot })
    }
  },
  view: (_model, h) => {
    const r = h.open("user")
    return r._tag === "Success" ? r.value.name : ""
  }
})

// 2. a snapshot field with no loader
make({
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: UserSnapshot }),
  message: Message,
  // @ts-expect-error
  loaders: {},
  view: () => null
})

// 3. wrong args
make({
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: UserSnapshot }),
  message: Message,
  loaders: {
    user: {
      // @ts-expect-error
      args: (_model, props) => ({ page: props.id }),
      onChange: (snapshot) => Message.make({ _tag: "UserChanged", snapshot })
    }
  },
  view: () => null
})

// 4. label differs from the field name
make({
  model: Schema.Struct({ person: UserSnapshot }),
  message: Message,
  loaders: {
    // @ts-expect-error
    person: {
      args: () => ({ id: "1" }),
      onChange: (snapshot: any) => Message.make({ _tag: "UserChanged", snapshot })
    }
  },
  view: () => null
})

// 5. another field's snapshot in this field's message
make({
  model: Schema.Struct({ user: UserSnapshot, shown: Loaded.Snapshot(ListUsers, "shown") }),
  message: Message,
  loaders: {
    user: { args: () => ({ id: "1" }), onChange: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) },
    shown: {
      args: () => ({ page: 0 }),
      onChange: (snapshot) => Message.make({ _tag: "UserChanged", snapshot })
    }
  },
  // @ts-expect-error
  view: (_model, h) => h.open("n")
})
