// forked from https://github.com/BridgeAR/safe-stable-stringify/blob/master/stable.js

import * as H from "../../../Hash"

// eslint-disable-next-line
const strEscapeSequencesRegExp = /[\x00-\x1f\x22\x5c]/
// eslint-disable-next-line
const strEscapeSequencesReplacer = /[\x00-\x1f\x22\x5c]/g

// Escaped special characters. Use empty strings to fill up unused entries.
const meta = [
  "\\u0000",
  "\\u0001",
  "\\u0002",
  "\\u0003",
  "\\u0004",
  "\\u0005",
  "\\u0006",
  "\\u0007",
  "\\b",
  "\\t",
  "\\n",
  "\\u000b",
  "\\f",
  "\\r",
  "\\u000e",
  "\\u000f",
  "\\u0010",
  "\\u0011",
  "\\u0012",
  "\\u0013",
  "\\u0014",
  "\\u0015",
  "\\u0016",
  "\\u0017",
  "\\u0018",
  "\\u0019",
  "\\u001a",
  "\\u001b",
  "\\u001c",
  "\\u001d",
  "\\u001e",
  "\\u001f",
  "",
  "",
  '\\"',
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\\\"
]

function escapeFn(str: string) {
  return meta[str.charCodeAt(0)]!
}

function strEscape(str: string) {
  if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
    return str
  }
  if (str.length > 100) {
    return str.replace(strEscapeSequencesReplacer, escapeFn)
  }
  let result = ""
  let last = 0
  let i: number
  for (i = 0; i < str.length; i++) {
    const point = str.charCodeAt(i)
    if (point === 34 || point === 92 || point < 32) {
      if (last === i) {
        result += meta[point]
      } else {
        result += `${str.slice(last, i)}${meta[point]}`
      }
      last = i + 1
    }
  }
  if (last === 0) {
    result = str
  } else if (last !== i) {
    result += str.slice(last)
  }
  return result
}

function stringifySimple(key: string | number, value: any, stack: any[]): string {
  let i, res
  switch (typeof value) {
    case "object": {
      if (value === null) {
        return "null"
      }
      if (typeof value.toJSON === "function") {
        value = value.toJSON(key)
        if (typeof value !== "object") {
          return stringifySimple(key, value, stack)
        }
        if (value === null) {
          return "null"
        }
      }
      for (i = 0; i < stack.length; i++) {
        if (stack[i] === value) {
          return '"[circular]"'
        }
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return "[]"
        }
        stack.push(value)
        res = "["
        for (i = 0; i < value.length - 1; i++) {
          const tmp = stringifySimple(i, value[i], stack)
          res += tmp !== undefined ? tmp : "null"
          res += ","
        }
        const tmp = stringifySimple(i, value[i], stack)
        res += tmp !== undefined ? tmp : "null"
        res += "]"
        stack.pop()
        return res
      }

      const keys = insertSort(Object.keys(value))
      if (keys.length === 0) {
        return "{}"
      }
      stack.push(value)
      let separator = ""
      res = "{"
      for (i = 0; i < keys.length; i++) {
        key = keys[i]!
        const tmp = stringifySimple(key, value[key], stack)
        if (tmp !== undefined) {
          res += `${separator}"${strEscape(key)}":${tmp}`
          separator = ","
        }
      }
      res += "}"
      stack.pop()
      return res
    }
    case "string":
      return `"${strEscape(value)}"`
    case "number":
      return isFinite(value) ? String(value) : '"[infinite]"'
    case "boolean":
      return value === true ? "true" : "false"
    case "symbol":
      return '"[symbol]"'
    case "undefined":
      return '"[undefined]"'
    case "function":
      return '"[function]"'
    case "bigint":
      return `"${value.toString(10)}"`
  }
}

function insertSort(arr: string[]) {
  for (let i = 1; i < arr.length; i++) {
    const tmp = arr[i]!
    let j = i
    while (j !== 0 && arr[j - 1]! > tmp) {
      arr[j] = arr[j - 1]!
      j--
    }
    arr[j] = tmp
  }

  return arr
}

/**
 * Compute a stable json-like string
 */
export function stringify(value: any) {
  return stringifySimple("", value, [])
}

/**
 * Compute hash of stable json-like string
 */
export function hash(value: any) {
  return H.string(stringify(value))
}
