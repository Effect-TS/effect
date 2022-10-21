import { DoublyLinkedList } from "@tsplus/stdlib/collections/mutable/DoublyLinkedList"

export type Task = Lazy<void>

export interface Scheduler {
  scheduleTask(task: Task): void
}

export class DefaultScheduler {
  readonly running = new AtomicReference(false)
  readonly tasks = new AtomicReference(new DoublyLinkedList<Task>())
  readonly promise = Promise.resolve(void 0)

  starveInternal(depth: number) {
    const toRun = this.tasks.get
    this.tasks.set(new DoublyLinkedList())
    toRun.forEach((task) => {
      task()
    })
    if (this.tasks.get.isEmpty) {
      this.running.set(false)
    } else {
      this.starve(depth)
    }
  }

  starve(depth = 0) {
    if (depth >= 2048) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      this.promise.then(() => this.starveInternal(depth + 1))
    }
  }

  scheduleTask(task: Task) {
    this.tasks.get.add(task)
    if (!this.running.get) {
      this.running.set(true)
      this.starve()
    }
  }
}

export const defaultScheduler: Scheduler = new DefaultScheduler()

export class StagedScheduler {
  readonly tasks = new DoublyLinkedList<Task>()
  readonly deferred = new AtomicReference(false)

  scheduleTask(task: Task) {
    if (this.deferred.get) {
      defaultScheduler.scheduleTask(task)
    } else {
      this.tasks.add(task)
    }
  }

  flush() {
    while (!this.tasks.isEmpty) {
      this.tasks.shift()!()
    }
    this.deferred.set(true)
  }
}
