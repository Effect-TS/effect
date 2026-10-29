// Stands in for `redis` 5.0.x, which has no `SocketTimeoutError` export.
exports.createClient = () => {
  throw new Error("not implemented")
}
