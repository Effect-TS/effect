// forked from https://github.com/sindresorhus/parse-ms/blob/4da2ffbdba02c6e288c08236695bdece0adca173/index.js
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
function parseMs(milliseconds: number) {
  const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil
  return {
    days: roundTowardsZero(milliseconds / 86400000),
    hours: roundTowardsZero(milliseconds / 3600000) % 24,
    minutes: roundTowardsZero(milliseconds / 60000) % 60,
    seconds: roundTowardsZero(milliseconds / 1000) % 60,
    milliseconds: roundTowardsZero(milliseconds) % 1000,
    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  }
}

// function dumpToString(
//   fibers: Collection<Fiber.Runtime<unknown, unknown>>
// ): Effect<never, never, string> {
//   const dumps = Effect.forEach(fibers, (fiber) => fiber.dump)
//   const now = Clock.currentTime
//   return Effect.tuple(Clock.currentTime, dumps).map(([now, dumps]) => {
//     const dumps = renderDumps(dumps)
//     return "\n" + dumps
//   })
// }

// function renderDump(dump: Fiber.Dump): Doc<never> {
//   const status = renderStatus(dump.fiberStatus)
//   return Doc.hcatT(
//     Doc.text(`+---[Fiber](#${dump.fiberId.id})`),
//     Doc.text(" Status: "),
//     status,
//     Doc.lineBreak
//   )
// }

// function renderDumps(dumps: Collection<Fiber.Dump>): Doc<never> {
//   return Doc.hcat(dumps.map((dump) => renderDump(dump)))
// }

function renderStatus(status: Fiber.Status): string {
  switch (status._tag) {
    case "Done":
      return "Done"
    case "Running":
      return "Running"
    case "Suspended": {
      const isInterruptible = status.runtimeFlags.interruptible ?
        "interruptible" :
        "uninterruptible"
      return `Suspended(${isInterruptible})`
    }
  }
}

/**
 * @tsplus static effect/core/io/Fiber.Ops pretty
 * @tsplus getter effect/core/io/Fiber pretty
 */
export function pretty<E, A>(self: Fiber.Runtime<E, A>): Effect<never, never, string> {
  return Effect.tuple(Clock.currentTime, self.dump).map(([now, dump]) => {
    const time = now - dump.fiberId.startTimeMillis
    const { days, hours, milliseconds, minutes, seconds } = parseMs(time)
    const lifeMsg = (days === 0 ? "" : `${days}d`) +
      (days === 0 && hours === 0 ? "" : `${hours}h`) +
      (days === 0 && hours === 0 && minutes === 0 ? "" : `${minutes}m`) +
      (days === 0 && hours === 0 && minutes === 0 && seconds === 0 ? "" : `${seconds}s`) +
      `${milliseconds}ms`
    const waitMsg = (function(status: Fiber.Status) {
      switch (status._tag) {
        case "Suspended":
          return status.blockingOn.ids.size > 0
            ? `waiting on ` + Array.from(status.blockingOn.ids).map((id) => `${id}`).join(", ")
            : ""
        default:
          return ""
      }
    })(dump.fiberStatus)
    const statusMsg = renderStatus(dump.fiberStatus)
    return `[Fiber](#${dump.fiberId.id}) (${lifeMsg}) ${waitMsg}\n   Status: ${statusMsg}`
  })
}
