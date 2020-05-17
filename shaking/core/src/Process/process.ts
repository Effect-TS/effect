import {
  Effect,
  AsyncR,
  Fiber,
  run,
  chain,
  unit,
  asUnit,
  access,
  provide,
  fork,
  runUnsafeSync,
  sync,
  accessM,
  asyncTotal,
  chainTap,
  chainTap_,
  map_,
  chain_,
  parSequenceRecord
} from "../Effect"
import type { Exit } from "../Exit"
import { pipe } from "../Pipe"
import { map_ as mapRecord } from "../Record"
import type {
  ATypeOf,
  ETypeOf,
  RTypeOf,
  UnionToIntersection
} from "../Support/Overloads"

export function runAll<Procs extends Record<string, Effect<any, any, any, any>>>(
  procs: Procs,
  onExit: (
    _: {
      [k in keyof Procs]: Exit<ETypeOf<Procs[k]>, ATypeOf<Procs[k]>>
    }
  ) => void = () => {
    //
  }
): AsyncR<
  UnionToIntersection<
    {
      [k in keyof Procs]: unknown extends RTypeOf<Procs[k]> ? never : RTypeOf<Procs[k]>
    }[keyof Procs]
  >,
  {
    [k in keyof Procs]: Exit<ETypeOf<Procs[k]>, ATypeOf<Procs[k]>>
  }
> {
  const listeners: Array<Fiber<any, any>> = []
  let fired = false

  const fire = () => {
    if (!fired) {
      fired = true
      listeners.forEach((fiber) => {
        run(
          pipe(
            fiber.isComplete,
            chain((c) => (c ? unit : asUnit(fiber.interrupt)))
          )
        )
      })
    }
  }

  const fibers = access((_: any) =>
    mapRecord(procs, (x) => {
      const fiber = pipe(x, provide(_), fork, runUnsafeSync)
      listeners.push(fiber)
      return fiber
    })
  )

  const waits = map_(fibers, (rec) =>
    mapRecord(rec, (f) =>
      chainTap_(f.wait, (ex) =>
        sync(() => {
          if (ex._tag !== "Done") {
            fire()
          }
        })
      )
    )
  )

  const exits = accessM((r: any) =>
    asyncTotal((res) => {
      const fiber = runUnsafeSync(
        pipe(
          chain_(waits, parSequenceRecord),
          chainTap((done) =>
            sync(() => {
              res(done)
              onExit(done as any)
            })
          ),
          provide(r),
          fork
        )
      )
      return (cb) => {
        fire()
        run(fiber.wait, () => {
          cb()
        })
      }
    })
  )

  return exits as any
}
