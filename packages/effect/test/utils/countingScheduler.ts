import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"

export const makeCountingScheduler = () => {
  let rounds = 0
  const scheduler = new Scheduler.MixedScheduler("async", (task) => {
    const handle = setImmediate(() => {
      rounds++
      task()
    })
    return () => clearImmediate(handle)
  })
  return { rounds: () => rounds, layer: Layer.succeed(Scheduler.Scheduler)(scheduler) }
}
