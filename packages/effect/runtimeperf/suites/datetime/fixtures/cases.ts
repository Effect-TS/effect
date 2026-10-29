import * as DateTime from "effect/DateTime"
import assert from "node:assert/strict"

const size = 1024
const mask = size - 1
const start = Date.UTC(2024, 0, 1)
const epochs = Array.from({ length: size }, (_, i) => start + i * 7_777_777)
const isos = epochs.map((epoch) => new Date(epoch).toISOString())
const named = DateTime.zoneMakeNamedUnsafe("Europe/London")
const offset = DateTime.zoneMakeOffset(2 * 60 * 60 * 1000)

const assertParts = (result: unknown, epoch: number, offsetMillis = 0) => {
  const date = new Date(epoch + offsetMillis)
  assert.deepEqual(result, {
    millisecond: date.getUTCMilliseconds(),
    second: date.getUTCSeconds(),
    minute: date.getUTCMinutes(),
    hour: date.getUTCHours(),
    day: date.getUTCDate(),
    weekDay: date.getUTCDay(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  })
}

const assertFreshParts = (result: unknown, self: DateTime.DateTime) =>
  assert.deepEqual(
    result,
    DateTime.toParts(
      DateTime.isZoned(self)
        ? DateTime.makeZonedUnsafe(self.epochMilliseconds, { timeZone: self.zone })
        : DateTime.makeUnsafe(self.epochMilliseconds)
    )
  )

const assertUtc = (result: unknown, epoch: number) => {
  assert.ok(DateTime.isDateTime(result) && DateTime.isUtc(result))
  assert.equal(result.epochMilliseconds, epoch)
}

const populate = (self: DateTime.DateTime, order: number) => {
  switch (order % 3) {
    case 0:
      DateTime.toPartsUtc(self)
      DateTime.toDate(self)
      DateTime.toParts(self)
      break
    case 1:
      DateTime.toParts(self)
      DateTime.toPartsUtc(self)
      break
    case 2:
      DateTime.toDate(self)
      DateTime.toParts(self)
      DateTime.toPartsUtc(self)
      break
  }
  return self
}

export const makeNumber = () => {
  let i = 0
  return {
    run: () => DateTime.makeUnsafe(epochs[i++ & mask]),
    validate: (result: unknown) => assertUtc(result, epochs[(i - 1) & mask])
  }
}

export const makeIso = () => {
  let i = 0
  return {
    run: () => DateTime.makeUnsafe(isos[i++ & mask]),
    validate: (result: unknown) => assertUtc(result, epochs[(i - 1) & mask])
  }
}

export const makeZonedNamed = () => {
  let i = 0
  return {
    run: () => DateTime.makeZonedUnsafe(epochs[i++ & mask], { timeZone: named }),
    validate: (result: unknown) => {
      assert.ok(DateTime.isDateTime(result) && DateTime.isZoned(result))
      assert.equal(result.epochMilliseconds, epochs[(i - 1) & mask])
    }
  }
}

export const addZonedOffset = () => {
  const zoned = epochs.map((epoch) => DateTime.makeZonedUnsafe(epoch, { timeZone: offset }))
  let i = 0
  return {
    run: () => DateTime.add(zoned[i++ & mask], { hours: 1 }),
    validate: (result: unknown) => {
      assert.ok(DateTime.isDateTime(result) && DateTime.isZoned(result))
      assert.equal(result.epochMilliseconds, epochs[(i - 1) & mask] + 60 * 60 * 1000)
    }
  }
}

export const partsUtcFirst = () => {
  let i = 0
  return {
    run: () => DateTime.toPartsUtc(DateTime.makeUnsafe(epochs[i++ & mask])),
    validate: (result: unknown) => assertParts(result, epochs[(i - 1) & mask])
  }
}

export const partsOffsetFirst = () => {
  let i = 0
  return {
    run: () => DateTime.toParts(DateTime.makeZonedUnsafe(epochs[i++ & mask], { timeZone: offset })),
    validate: (result: unknown) => assertParts(result, epochs[(i - 1) & mask], offset.offset)
  }
}

export const partsNamedFirst = () => {
  let i = 0
  return {
    run: () => {
      const zoned = DateTime.makeZonedUnsafe(epochs[i++ & mask], { timeZone: named })
      DateTime.toDate(zoned)
      return DateTime.toParts(zoned)
    },
    validate: (result: unknown) =>
      assertFreshParts(result, DateTime.makeZonedUnsafe(epochs[(i - 1) & mask], { timeZone: named }))
  }
}

export const getPartsUtcFirst = () => {
  let i = 0
  return {
    run: () => {
      const utc = DateTime.makeUnsafe(epochs[i++ & mask])
      return DateTime.getPart(utc, "year") * 10_000 + DateTime.getPart(utc, "month") * 100 +
        DateTime.getPart(utc, "day")
    },
    validate: (result: unknown) => {
      const date = new Date(epochs[(i - 1) & mask])
      assert.equal(result, date.getUTCFullYear() * 10_000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate())
    }
  }
}

export const partsUtcCached = () => {
  const utcs = epochs.map((epoch) => populate(DateTime.makeUnsafe(epoch), 0))
  let i = 0
  return {
    run: () => DateTime.toPartsUtc(utcs[i++ & mask]),
    validate: (result: unknown) => assertParts(result, epochs[(i - 1) & mask])
  }
}

export const partsNamedCached = () => {
  const zoned = epochs.map((epoch) => populate(DateTime.makeZonedUnsafe(epoch, { timeZone: named }), 0))
  let i = 0
  return {
    run: () => {
      const self = zoned[i++ & mask]
      DateTime.toDate(self)
      return DateTime.toParts(self)
    },
    validate: (result: unknown) => assertFreshParts(result, zoned[(i - 1) & mask])
  }
}

export const partsMixedCached = () => {
  const values = epochs.map((epoch, i) =>
    populate(
      i % 4 === 0
        ? DateTime.makeUnsafe(epoch)
        : DateTime.makeZonedUnsafe(epoch, { timeZone: i % 2 === 0 ? named : offset }),
      i
    )
  )
  let i = 0
  return {
    run: () => {
      const self = values[i++ & mask]
      DateTime.toDate(self)
      DateTime.toPartsUtc(self)
      return DateTime.toParts(self)
    },
    validate: (result: unknown) => assertFreshParts(result, values[(i - 1) & mask])
  }
}
