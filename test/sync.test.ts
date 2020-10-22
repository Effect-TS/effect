import { has } from "@effect-ts/system/Has"

import { pipe } from "../src/Function"
import * as Sy from "../src/Sync"
import * as L from "../src/Sync/Layer"

interface Foo {
  foo: string
}

interface Bar {
  bar: string
}

const Foo = has<Foo>()

const Bar = has<Bar>()

const FooLive = L.fromSync(Foo)(
  Sy.succeed<Foo>({ foo: "foo" })
)

const BarLive = L.fromSync(Bar)(
  Sy.succeed<Bar>({ bar: "bar" })
)

const AppLive = FooLive["+++"](BarLive)

describe("SyncLayer", () => {
  it("use foo & bar", () => {
    const result = pipe(
      Sy.gen(function* (_) {
        const { foo } = yield* _(Foo)
        const { bar } = yield* _(Bar)

        return `${foo} - ${bar}`
      }),
      L.provideSyncLayer(AppLive),
      Sy.run
    )

    expect(result).toEqual(`foo - bar`)
  })
})
