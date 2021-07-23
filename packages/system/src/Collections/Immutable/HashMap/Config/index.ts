// ets_tracing: off

// Configuration

export const SIZE = 5

export const BUCKET_SIZE = Math.pow(2, SIZE)

export const MASK = BUCKET_SIZE - 1

export const MAX_INDEX_NODE = BUCKET_SIZE / 2

export const MIN_ARRAY_NODE = BUCKET_SIZE / 4
