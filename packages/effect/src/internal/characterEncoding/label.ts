export const normalize = (label: string): string => {
  const name = label.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "").toLowerCase()
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    if (
      code <= 8 || code === 11 || (code >= 14 && code <= 31) || (code >= 127 && code <= 160) || code === 0x2028 ||
      code === 0x2029
    ) {
      throw new RangeError(`Unknown encoding: ${label}`)
    }
  }
  return name.replace(/:\d{4}$|[^0-9a-z]/g, "")
}
