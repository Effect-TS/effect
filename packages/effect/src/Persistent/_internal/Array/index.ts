// copyright https://github.com/frptools

export function withArrayIndexUpdated<A>(index: number, value: A, array: A[]) {
  const length = array.length
  const newArray = Array(length)
  for (let i = 0; i < length; ++i) {
    newArray[i] = array[i]
  }
  newArray[index] = value
  return newArray
}

/**
 * Copies the array in a shallow manner optimized for tricks
 */
export function copyArrayShallow<A = any>(values: A[]) {
  if (values.length > 7) {
    const arr = new Array(values.length)
    for (let i = 0; i < values.length; i++) {
      arr[i] = values[i]
    }
    return arr
  }
  switch (values.length) {
    case 0:
      return []
    case 1:
      return [values[0]]
    case 2:
      return [values[0], values[1]]
    case 3:
      return [values[0], values[1], values[2]]
    case 4:
      return [values[0], values[1], values[2], values[3]]
    case 5:
      return [values[0], values[1], values[2], values[3], values[4]]
    case 6:
      return [values[0], values[1], values[2], values[3], values[4], values[5]]
    case 7:
      return [
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6]
      ]
    default:
      return values.slice() // never reached, but seems to trigger optimization in V8 for some reason
  }
}

export function withArrayIndexInserted<A = any>(index: number, value: A, array: A[]) {
  const length = array.length
  const newArray = Array(length + 1)
  let i
  for (i = 0; i < index; ++i) {
    newArray[i] = array[i]
  }
  newArray[i++] = value
  for (; i < length + 1; ++i) {
    newArray[i] = array[i - 1]
  }
  return newArray
}

export function writeArrayElements<A = any>(
  source: A[],
  destination: A[],
  sourceIndex: number,
  destinationIndex: number,
  count: number
): void {
  let i, j, c
  if (source === destination && sourceIndex < destinationIndex) {
    for (
      i = sourceIndex + count - 1, j = destinationIndex + count - 1, c = 0;
      c < count;
      i--, j--, c++
    ) {
      destination[j] = source[i]
    }
  } else {
    for (i = sourceIndex, j = destinationIndex, c = 0; c < count; i++, j++, c++) {
      destination[j] = source[i]
    }
  }
}

export function withArrayIndexRemoved<A = any>(index: number, array: A[]) {
  const length = array.length
  if (length === 0 || index >= length) return array
  if (length === 1) return []
  const newArray = Array(length - 1)
  let i
  for (i = 0; i < index; ++i) {
    newArray[i] = array[i]
  }
  for (i = i + 1; i < length; ++i) {
    newArray[i - 1] = array[i]
  }
  return newArray
}
