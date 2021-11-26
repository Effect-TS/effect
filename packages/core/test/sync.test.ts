import type { Service } from "@effect-ts/system/Has"
import { tag } from "@effect-ts/system/Has"

import { pipe } from "../src/Function"
import * as Sy from "../src/Sync"
import * as L from "../src/Sync/Layer"

const FooId = Symbol()

interface Foo extends Service<typeof FooId> {
  readonly foo: string
}

const BarId = Symbol()

interface Bar extends Service<typeof BarId> {
  readonly bar: string
}

const BazId = Symbol()
interface Baz extends Service<typeof BazId> {
  readonly baz: string
}

const Foo = tag<Foo>().setKey(FooId)

const Bar = tag<Bar>().setKey(BarId)

const Baz = tag<Baz>().setKey(BazId)

const FooLive = L.fromValue(Foo)({ serviceId: FooId, foo: "foo" })

const BarLive = L.fromValue(Bar)({ serviceId: BarId, bar: "bar" })

const BazLive = L.fromSync(Baz)(
  Sy.gen(function* (_) {
    const { foo } = yield* _(Foo)
    const { bar } = yield* _(Bar)

    return {
      serviceId: BazId,
      baz: `${foo} - ${bar}`
    }
  })
)

const AppLive = BazLive["<<<"](FooLive["+++"](BarLive))

describe("SyncLayer", () => {
  it("use foo & bar", () => {
    const result = pipe(
      Sy.gen(function* (_) {
        const { baz } = yield* _(Baz)

        return `ok: ${baz}`
      }),
      L.provideSyncLayer(AppLive),
      Sy.run
    )

    expect(result).toEqual(`ok: foo - bar`)
  })
})
