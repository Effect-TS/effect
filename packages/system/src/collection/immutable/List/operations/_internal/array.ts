// This array should not be mutated. Thus a dummy element is placed in
// it. Thus the affix will not be owned and thus not mutated.
export const emptyAffix: any[] = [0]

export function affixPush<A>(a: A, array: A[], length: number): A[] {
  if (array.length === length) {
    array.push(a)
    return array
  } else {
    const newArray: A[] = []
    copyIndices(array, 0, newArray, 0, length)
    newArray.push(a)
    return newArray
  }
}

export function arrayPush<A>(array: A[], a: A): A[] {
  array.push(a)
  return array
}

export function copyArray(source: any[]): any[] {
  const array = []
  for (let i = 0; i < source.length; ++i) {
    array[i] = source[i]
  }
  return array
}

export function pushElements<A>(
  source: A[],
  target: A[],
  offset: number,
  amount: number
): void {
  for (let i = offset; i < offset + amount; ++i) {
    target.push(source[i]!)
  }
}

export function copyIndices(
  source: any[],
  sourceStart: number,
  target: any[],
  targetStart: number,
  length: number
): void {
  for (let i = 0; i < length; ++i) {
    target[targetStart + i] = source[sourceStart + i]
  }
}

export function arrayPrepend<A>(value: A, array: A[]): A[] {
  const newLength = array.length + 1
  const result = new Array(newLength)
  result[0] = value
  for (let i = 1; i < newLength; ++i) {
    result[i] = array[i - 1]
  }
  return result
}

/**
 * Create a reverse _copy_ of an array.
 */
export function reverseArray<A>(array: A[]): A[] {
  return array.slice().reverse()
}

export function arrayFirst<A>(array: A[]): A {
  return array[0]!
}

export function arrayLast<A>(array: A[]): A {
  return array[array.length - 1]!
}

export function mapArray<A, B>(f: (a: A) => B, array: A[]): B[] {
  const result = new Array(array.length)
  for (let i = 0; i < array.length; ++i) {
    result[i] = f(array[i]!)
  }
  return result
}

export function mapPrefix<A, B>(f: (a: A) => B, prefix: A[], length: number): B[] {
  const newPrefix = new Array(length)
  for (let i = length - 1; 0 <= i; --i) {
    newPrefix[i] = f(prefix[i]!)
  }
  return newPrefix
}

export function mapAffix<A, B>(f: (a: A) => B, suffix: A[], length: number): B[] {
  const newSuffix = new Array(length)
  for (let i = 0; i < length; ++i) {
    newSuffix[i] = f(suffix[i]!)
  }
  return newSuffix
}

export function foldlSuffix<A, B>(
  f: (acc: B, value: A) => B,
  acc: B,
  array: A[],
  length: number
): B {
  for (let i = 0; i < length; ++i) {
    acc = f(acc, array[i]!)
  }
  return acc
}

export function foldlPrefix<A, B>(
  f: (acc: B, value: A) => B,
  acc: B,
  array: A[],
  length: number
): B {
  for (let i = length - 1; 0 <= i; --i) {
    acc = f(acc, array[i]!)
  }
  return acc
}

export function foldrSuffix<A, B>(
  f: (value: A, acc: B) => B,
  initial: B,
  array: A[],
  length: number
): B {
  let acc = initial
  for (let i = length - 1; 0 <= i; --i) {
    acc = f(array[i]!, acc)
  }
  return acc
}

export function foldrPrefix<A, B>(
  f: (value: A, acc: B) => B,
  initial: B,
  array: A[],
  length: number
): B {
  let acc = initial
  for (let i = 0; i < length; ++i) {
    acc = f(array[i]!, acc)
  }
  return acc
}
