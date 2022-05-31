type Task = Lazy<void>
const scheduled = {
  running: false,
  tasks: [] as Task[]
}
function starveInternal() {
  const toRun = scheduled.tasks
  scheduled.tasks = []
  for (let i = 0; i < toRun.length; i++) {
    toRun[i]!()
  }
  if (scheduled.tasks.length > 0) {
    starve(true)
  } else {
    scheduled.running = false
  }
}
function starve(useTimer: boolean) {
  if (useTimer) {
    setTimeout(starveInternal, 0)
  } else {
    queueMicrotask(starveInternal)
  }
}
export function scheduleTask(task: Task) {
  scheduled.tasks.push(task)
  if (!scheduled.running) {
    scheduled.running = true
    starve(false)
  }
}
