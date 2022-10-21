// -----------------------------------------------------------------------------
// Seconds
// -----------------------------------------------------------------------------

export function beginningOfSecond(now: number): number {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    0
  ).getTime()
}

export function endOfSecond(now: number): number {
  const date = new Date(beginningOfSecond(now))
  return date.setSeconds(date.getSeconds() + 1)
}

export function nextSecond(now: number, second: number): number {
  const date = new Date(now)
  if (date.getSeconds() === second) {
    return now
  }
  if (date.getSeconds() < second) {
    return date.setSeconds(second)
  }
  // Set seconds to the provided value and add one minute
  const newDate = new Date(date.setSeconds(second))
  return newDate.setTime(newDate.getTime() + 1000 * 60)
}

// -----------------------------------------------------------------------------
// Minutes
// -----------------------------------------------------------------------------

export function beginningOfMinute(now: number): number {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  ).getTime()
}

export function endOfMinute(now: number): number {
  const date = new Date(beginningOfMinute(now))
  return date.setMinutes(date.getMinutes() + 1)
}

export function nextMinute(now: number, minute: number): number {
  const date = new Date(now)
  if (date.getMinutes() == minute) {
    return now
  }
  if (date.getMinutes() < minute) {
    return date.setMinutes(minute)
  }
  // Set minutes to the provided value and add one hour
  const newDate = new Date(date.setMinutes(minute))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60)
}

// -----------------------------------------------------------------------------
// Hours
// -----------------------------------------------------------------------------

export function beginningOfHour(now: number): number {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    0,
    0,
    0
  ).getTime()
}

export function endOfHour(now: number): number {
  const date = new Date(beginningOfHour(now))
  return date.setHours(date.getHours() + 1)
}

export function nextHour(now: number, hour: number): number {
  const date = new Date(now)
  if (date.getHours() == hour) {
    return now
  }
  if (date.getHours() < hour) {
    return date.setHours(hour)
  }
  // Set hours to the provided value and add one day
  const newDate = new Date(date.setHours(hour))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60 * 24)
}

// -----------------------------------------------------------------------------
// Days
// -----------------------------------------------------------------------------

export function beginningOfDay(now: number): number {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  ).getTime()
}

export function endOfDay(now: number): number {
  const date = new Date(beginningOfDay(now))
  return date.setDate(date.getDate() + 1)
}

export function nextDay(now: number, dayOfWeek: number): number {
  const date = new Date(now)
  if (date.getDay() === dayOfWeek) {
    return now
  }
  return date.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7))
}

export function nextDayOfMonth(now: number, day: number): number {
  const date = new Date(now)
  if (date.getDate() === day) {
    return now
  }
  if (date.getDate() < day) {
    return date.setDate(day)
  }
  return findNextMonth(now, day, 1)
}

export function findNextMonth(now: number, day: number, months: number): number {
  const d = new Date(now)
  const tmp1 = new Date(d.setDate(day))
  const tmp2 = new Date(tmp1.setMonth(tmp1.getMonth() + months))
  if (tmp2.getDate() === day) {
    const d2 = new Date(now)
    const tmp3 = new Date(d2.setDate(day))
    return tmp3.setMonth(tmp3.getMonth() + months)
  }
  return findNextMonth(now, day, months + 1)
}
