export const DEFAULT_REPEAT = 50000

export function getBenchmarksTQueue() {
  const offering = (queue: TQueue<number>) =>
    Do(($) => {
      const n = $(Effect.sync(() => Math.random()))
      $(queue.offer(n).commit)
    }).repeatN(DEFAULT_REPEAT)

  const taking = (queue: TQueue<number>) =>
    Do(($) => {
      const n = $(queue.take.commit)
      return `got: ${n}`
    }).repeatN(DEFAULT_REPEAT)

  const main = Do(($) => {
    const queue = $(TQueue.bounded<number>(100).commit)
    $(offering(queue).zipPar(taking(queue)))
  })
    .timed
    .flatMap(([d]) => Effect.logInfo(`TQueue.bounded offer & take: ${d.millis}ms`))

  return main
}

export function getBenchmarksQueue() {
  const offering = (queue: Queue<number>) =>
    Do(($) => {
      const n = $(Effect.sync(() => Math.random()))
      $(queue.offer(n))
    }).repeatN(DEFAULT_REPEAT)

  const taking = (queue: Queue<number>) =>
    Do(($) => {
      const n = $(queue.take)
      return `got: ${n}`
    }).repeatN(DEFAULT_REPEAT)

  const main = Do(($) => {
    const queue = $(Queue.bounded<number>(100))
    $(offering(queue).zipPar(taking(queue)))
  })
    .timed
    .flatMap(([d]) => Effect.logInfo(`Queue.bounded offer & take: ${d.millis}ms`))

  return main
}

Effect.collectAllParDiscard([
  getBenchmarksQueue(),
  getBenchmarksTQueue()
])
  .provideSomeLayer(Logger.consoleLoggerLayer)
  .unsafeRunPromise()
  .catch(console.error)
