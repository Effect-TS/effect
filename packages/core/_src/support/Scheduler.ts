type Task = Lazy<void>
const scheduled = {
  running: false,
  tasks: [] as Task[]
}
function starveInternal(depth: number) {
  const toRun = scheduled.tasks
  scheduled.tasks = []
  for (let i = 0; i < toRun.length; i++) {
    toRun[i]!()
  }
  if (scheduled.tasks.length > 0) {
    starve(depth)
  } else {
    scheduled.running = false
  }
}
function starve(depth = 0) {
  if (depth >= 2048) {
    setTimeout(() => starveInternal(0), 0)
  } else {
    queueMicrotask(() => starveInternal(depth + 1))
  }
}
export function scheduleTask(task: Task) {
  scheduled.tasks.push(task)
  if (!scheduled.running) {
    scheduled.running = true
    starve()
  }
}
