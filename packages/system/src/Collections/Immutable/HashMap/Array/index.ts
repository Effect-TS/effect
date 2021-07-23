// ets_tracing: off

export function arrayUpdate<A>(mutate: boolean, at: number, v: A, arr: A[]) {
  let out = arr
  if (!mutate) {
    const len = arr.length
    out = new Array(len)
    for (let i = 0; i < len; ++i) out[i] = arr[i]!
  }
  out[at] = v
  return out
}

export function arraySpliceOut<A>(mutate: boolean, at: number, arr: A[]) {
  const newLen = arr.length - 1
  let i = 0
  let g = 0
  let out = arr
  if (mutate) {
    i = g = at
  } else {
    out = new Array(newLen)
    while (i < at) out[g++] = arr[i++]!
  }
  ++i
  while (i <= newLen) out[g++] = arr[i++]!
  if (mutate) {
    out.length = newLen
  }
  return out
}

export function arraySpliceIn<A>(mutate: boolean, at: number, v: A, arr: A[]) {
  const len = arr.length
  if (mutate) {
    let i = len
    while (i >= at) arr[i--] = arr[i]!
    arr[at] = v
    return arr
  }
  let i = 0,
    g = 0
  const out = new Array<A>(len + 1)
  while (i < at) out[g++] = arr[i++]!
  out[at] = v
  while (i < len) out[++g] = arr[i++]!
  return out
}
