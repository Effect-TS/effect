import type { ATypeOf, ETypeOf, RTypeOf, UnionToIntersection } from "../Base/Apply"
import * as T from "../Effect"
import type { Exit } from "../Exit"
import { pipe } from "../Function"
import { map_ as mapRecord, sequence } from "../Record"

export function runAll<Procs extends Record<string, T.Effect<any, any, any, any>>>(
  procs: Procs,
  onExit: (
    _: {
      [k in keyof Procs]: Exit<ETypeOf<Procs[k]>, ATypeOf<Procs[k]>>
    }
  ) => void = () => {
    //
  }
): T.AsyncR<
  UnionToIntersection<
    {
      [k in keyof Procs]: unknown extends RTypeOf<Procs[k]> ? never : RTypeOf<Procs[k]>
    }[keyof Procs]
  >,
  {
    [k in keyof Procs]: Exit<ETypeOf<Procs[k]>, ATypeOf<Procs[k]>>
  }
> {
  const listeners: Array<T.Fiber<any, any>> = []
  let fired = false

  const fire = () => {
    if (!fired) {
      fired = true
      listeners.forEach((fiber) => {
        T.run(
          pipe(
            fiber.isComplete,
            T.chain((c) => (c ? T.unit : T.asUnit(fiber.interrupt)))
          )
        )
      })
    }
  }

  const fibers = T.access((_: any) =>
    mapRecord(procs, (x) => {
      const fiber = pipe(x, T.provide(_), T.fork, T.runUnsafeSync)
      listeners.push(fiber)
      return fiber
    })
  )

  const waits = T.map_(fibers, (rec) =>
    mapRecord(rec, (f) =>
      T.chainTap_(f.wait, (ex) =>
        T.sync(() => {
          if (ex._tag !== "Done") {
            fire()
          }
        })
      )
    )
  )

  const exits = T.accessM((r: any) =>
    T.asyncTotal((res) => {
      const fiber = T.runUnsafeSync(
        pipe(
          T.chain_(waits, sequence(T.par(T.effect))),
          T.chainTap((done) =>
            T.sync(() => {
              res(done)
              onExit(done as any)
            })
          ),
          T.provide(r),
          T.fork
        )
      )
      return (cb) => {
        fire()
        T.run(fiber.wait, () => {
          cb()
        })
      }
    })
  )

  return exits as any
}
