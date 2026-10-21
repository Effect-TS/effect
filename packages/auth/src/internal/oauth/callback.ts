/** An explicit callback must match exactly. Otherwise use the provider-named
 * callback or an unambiguous single destination; array order is not policy. */
export const selectCallback = <Callback extends { readonly callbackId: string }>(
  provider: string,
  callbacks: ReadonlyArray<Callback>,
  callbackId?: string
): Callback | undefined =>
  callbacks.find((callback) => callback.callbackId === (callbackId ?? provider)) ??
    (callbackId === undefined && callbacks.length === 1 ? callbacks[0] : undefined)
