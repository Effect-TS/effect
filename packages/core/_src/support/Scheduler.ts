export type Task = Lazy<void>

export interface Scheduler {
  scheduleTask(task: Task): void
}

export class DefaultScheduler {
  readonly scheduled = {
    running: false,
    tasks: new DoublyLinkedList<Task>()
  }
  starveInternal(depth: number) {
    const toRun = this.scheduled.tasks
    this.scheduled.tasks = new DoublyLinkedList()
    toRun.forEach((task) => {
      task()
    })
    if (this.scheduled.tasks.isEmpty) {
      this.scheduled.running = false
    } else {
      this.starve(depth)
    }
  }
  starve(depth = 0) {
    if (depth >= 2048) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      queueMicrotask(() => this.starveInternal(depth + 1))
    }
  }
  scheduleTask(task: Task) {
    this.scheduled.tasks.add(task)
    if (!this.scheduled.running) {
      this.scheduled.running = true
      this.starve()
    }
  }
}

export const defaultScheduler: Scheduler = new DefaultScheduler()

export class StagedScheduler {
  readonly scheduled = {
    tasks: new DoublyLinkedList<Task>()
  }

  readonly deferred = new AtomicReference(false)

  scheduleTask(task: Task) {
    if (this.deferred.get) {
      defaultScheduler.scheduleTask(task)
    } else {
      this.scheduled.tasks.add(task)
    }
  }

  flush() {
    while (!this.scheduled.tasks.isEmpty) {
      this.scheduled.tasks.shift()!()
    }
    this.deferred.set(true)
  }
}
