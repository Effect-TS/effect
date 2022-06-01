type Task = Lazy<void>
const scheduled = {
  running: false,
  tasks: new DoublyLinkedList<Task>()
}
function starveInternal(depth: number) {
  const toRun = scheduled.tasks
  scheduled.tasks = new DoublyLinkedList()
  toRun.forEach((task) => {
    task()
  })
  if (scheduled.tasks.isEmpty) {
    scheduled.running = false
  } else {
    starve(depth)
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
  scheduled.tasks.add(task)
  if (!scheduled.running) {
    scheduled.running = true
    starve()
  }
}
