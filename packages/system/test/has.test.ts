import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { tag } from "../src/Has"
import * as L from "../src/Layer"

describe("Has", () => {
  it("use services", async () => {
    const AddServiceId = Symbol()

    class AddService {
      readonly serviceId: typeof AddServiceId = AddServiceId

      sum(a: number, b: number) {
        return T.succeedWith(() => a + b)
      }
    }

    const MulServiceId = Symbol()

    class MulService {
      readonly serviceId: typeof MulServiceId = MulServiceId

      prod(a: number, b: number) {
        return T.succeedWith(() => a * b)
      }
    }
    const Add = tag<AddService>(AddServiceId)
    const Mul = tag<MulService>(MulServiceId)

    const result = await pipe(
      T.accessServicesM({ add: Add, mul: Mul })((_) =>
        pipe(
          _.add.sum(2, 3),
          T.chain((n) => _.mul.prod(n, 3))
        )
      ),
      T.provideService(Add)(new AddService()),
      T.provideService(Mul)(new MulService()),
      T.runPromise
    )

    expect(result).toEqual(15)
  })
})

describe("madness", () => {
  it("mad", () => {
    interface SVC1 {
      readonly serviceId: "svc"
      readonly config: string
    }

    interface SVC2 {
      readonly serviceId: "svc"
      readonly config: number
    }

    const t1 = tag<SVC1>("svc")
    const t2 = tag<SVC2>("svc")

    T.gen(function* ($) {
      const a = yield* $(t1)
      const b = yield* $(t2)
      console.log({ a, b })
    })
      ["|>"](
        T.provideLayer(
          L.fromFunction(t1)(() => {
            return { serviceId: "svc", config: "imma string" }
          })["<+<"](
            L.fromFunction(t2)(() => {
              return { serviceId: "svc", config: 1 }
            })
          )
        )
      )
      ["|>"](T.runPromise)
      .catch(console.error)
  })
})
