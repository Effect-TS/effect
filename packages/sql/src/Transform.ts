/**
 * @since 2.0.0
 */

// Taken from postgres.js under the "UNLICENCE" licence.
// https://github.com/porsager/postgres/blob/master/src/types.js
//
// Thank you!

/**
 * @category transform
 * @since 2.0.0
 */
export const snakeToCamel = (x: string) => {
  let str = x[0]
  for (let i = 1; i < x.length; i++) {
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i]
  }
  return str
}

/**
 * @category transform
 * @since 2.0.0
 */
export const snakeToPascal = (x: string) => {
  let str = x[0].toUpperCase()
  for (let i = 1; i < x.length; i++) {
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i]
  }
  return str
}

/**
 * @category transform
 * @since 2.0.0
 */
export const snakeToKebab = (x: string) => x.replace(/_/g, "-")

/**
 * @category transform
 * @since 2.0.0
 */
export const camelToSnake = (x: string) => x.replace(/([A-Z])/g, "_$1").toLowerCase()

/**
 * @category transform
 * @since 2.0.0
 */
export const pascalToSnake = (x: string) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase()

/**
 * @category transform
 * @since 2.0.0
 */
export const kebabToSnake = (x: string) => x.replace(/-/g, "_")
