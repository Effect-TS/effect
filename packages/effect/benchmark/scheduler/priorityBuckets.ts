import * as Scheduler from "effect/Scheduler"
import { Bench } from "tinybench"

const taskCount = 4_096
const priorityCounts = [1, 8, 64, 4_096] as const
const task = () => {}

// Repeating ascending priorities exercises lookup across the sorted bucket
// array while keeping the total number of scheduled tasks fixed.
const priorities = new Map(
  priorityCounts.map((priorityCount) => [
    priorityCount,
    Array.from({ length: taskCount }, (_, index) => index % priorityCount)
  ])
)

const bench = new Bench()

for (const priorityCount of priorityCounts) {
  bench.add(taskCount + " tasks / " + priorityCount + " distinct priorities", () => {
    const dispatcher = new Scheduler.MixedScheduler("sync", () => () => {}).makeDispatcher()
    const workload = priorities.get(priorityCount)!
    for (let index = 0; index < workload.length; index++) {
      dispatcher.scheduleTask(task, workload[index])
    }
  })
}

await bench.run()

console.table(bench.table())
