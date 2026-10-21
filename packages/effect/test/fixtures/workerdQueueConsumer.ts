import { Deferred, Effect, Queue } from "effect"

// A long-lived consumer serving jobs offered by later requests.
const startConsumer = () => {
  const jobs = Effect.runSync(Queue.unbounded<Deferred.Deferred<string>>())
  Effect.runFork(Effect.forever(Queue.take(jobs).pipe(Effect.flatMap((job) => Deferred.succeed(job, "served")))))
  return jobs
}

// Forked at module scope, as in the original report.
const moduleScope = startConsumer()
// Forked while the isolate's first request is served.
let firstRequest: Queue.Queue<Deferred.Deferred<string>> | undefined

export default {
  async fetch(request: Request): Promise<Response> {
    const jobs = new URL(request.url).pathname === "/module-scope" ? moduleScope : (firstRequest ??= startConsumer())
    const result = await Effect.runPromise(Effect.gen(function*() {
      const job = yield* Deferred.make<string>()
      yield* Queue.offer(jobs, job)
      return yield* Deferred.await(job)
    }))
    return new Response(result)
  }
}
