// npx tsx runner.js
/* eslint-disable no-undef */

import { Console, DateTime, Effect, Option } from "effect"
import { readFileSync } from "fs"

const parseCsvLine = (line) => {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === "\"") {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

const testDateTime = (timezone, localTime, disambiguation, expectedUtc) =>
  Effect.gen(function*() {
    try {
      const [date, timeWithTz] = localTime.split("T")
      const [time] = timeWithTz.split("[")

      const [year, month, day] = date.split("-").map(Number)
      const [hours, minutes, seconds] = time.split(":").map(Number)

      const tz = DateTime.zoneUnsafeMakeNamed(timezone)
      const dateTimeResult = DateTime.makeZoned(
        {
          year,
          month,
          day,
          hours,
          minutes,
          seconds: seconds || 0,
          millis: 0
        },
        {
          timeZone: tz,
          adjustForTimeZone: true,
          disambiguation: disambiguation === "reject" ? "reject" : disambiguation
        }
      )

      if (Option.isNone(dateTimeResult)) {
        if (disambiguation === "reject") {
          return true
        }
        yield* Console.log(`  Error: makeZoned returned None`)
        return false
      }

      const dateTime = dateTimeResult.value
      const utc = DateTime.formatIso(DateTime.toUtc(dateTime)).replace(".000Z", "Z")
      const matches = utc === expectedUtc
      if (!matches) {
        yield* Console.log(`  Expected: ${expectedUtc}`)
        yield* Console.log(`  Got:      ${utc}`)
      }
      return matches
    } catch (error) {
      yield* Console.log(`  Error: ${error.message}`)
      return disambiguation === "reject"
    }
  })

const runTests = Effect.gen(function*() {
  const csv = readFileSync("./dst-test-cases.csv", "utf8")
  const lines = csv.split("\n").slice(1).filter((line) => line.trim())

  let success = 0
  let failure = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const [timezone, localTime, disambiguation, expectedUtc] = parseCsvLine(line)
    const result = yield* testDateTime(timezone, localTime, disambiguation, expectedUtc)

    if (result) {
      success++
    } else {
      failure++
      console.log(`FAILURE ${failure}: ${timezone} ${localTime} ${disambiguation}`)
    }

    if (i % 1000 === 0) {
      console.log(`Progress: ${i + 1}/${lines.length} | Failures: ${failure}`)
    }
  }

  process.stdout.write("\n")
  yield* Console.log(`Final Results: ${success} success, ${failure} failure`)
})

Effect.runPromise(runTests)
