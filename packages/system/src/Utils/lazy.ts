// ets_tracing: off

// forked from https://github.com/Alorel/typescript-lazy-get-decorator

type DecoratorReturn = PropertyDescriptor | NewDescriptor

function decorateNew(
  inp: NewDescriptor,
  setProto: boolean,
  makeNonConfigurable: boolean,
  resultSelector: ResultSelectorFn
): NewDescriptor {
  const out: NewDescriptor = Object.assign({}, inp)
  if (out.descriptor) {
    out.descriptor = Object.assign({}, out.descriptor)
  }
  const actualDesc: PropertyDescriptor = <any>(
    (out.descriptor || /* istanbul ignore next */ out)
  )

  const originalMethod = validateAndExtractMethodFromDescriptor(actualDesc)
  const isStatic = inp.placement === "static"

  actualDesc.get = function (this: any): any {
    return getterCommon(
      isStatic ? this : Object.getPrototypeOf(this),
      out.key,
      isStatic,
      !!actualDesc.enumerable,
      originalMethod,
      this,
      // eslint-disable-next-line prefer-rest-params
      arguments,
      setProto,
      makeNonConfigurable,
      resultSelector
    )
  }

  return out
}

function decorateLegacy(
  target: any,
  key: PropertyKey,
  descriptor: PropertyDescriptor,
  setProto: boolean,
  makeNonConfigurable: boolean,
  //tslint:enable:bool-param-default
  resultSelector: ResultSelectorFn
): PropertyDescriptor {
  /* istanbul ignore if */
  if (!descriptor) {
    descriptor = <any>Object.getOwnPropertyDescriptor(target, key)
    if (!descriptor) {
      const e = new Error("@LazyGetter is unable to determine the property descriptor")
      ;(<any>e).$target = target
      ;(<any>e).$key = key
      throw e
    }
  }

  const originalMethod = validateAndExtractMethodFromDescriptor(descriptor)

  return Object.assign({}, descriptor, {
    get(this: any): any {
      return getterCommon(
        target,
        key,
        Object.getPrototypeOf(target) === Function.prototype,
        !!descriptor.enumerable,
        originalMethod,
        this,
        // eslint-disable-next-line prefer-rest-params
        arguments,
        setProto,
        makeNonConfigurable,
        resultSelector
      )
    }
  })
}

/** Signifies that the modified property descriptor can be reset to its original state */
interface ResettableDescriptor {
  /**
   * Restore the property descriptor on the given class instance or prototype and re-apply the lazy getter.
   * @param on The class instance or prototype
   */
  reset(on: any): void
}

/** ES7 proposal descriptor, tweaked for Babel */
interface NewDescriptor extends PropertyDescriptor {
  descriptor?: PropertyDescriptor

  key: PropertyKey

  kind: string

  placement: string
}

/** A filter function that must return true for the value to cached */
type ResultSelectorFn = (v: any) => boolean

function defaultFilter(): boolean {
  return true
}

function validateAndExtractMethodFromDescriptor(desc: PropertyDescriptor): Function {
  const originalMethod = <Function>desc.get

  if (!originalMethod) {
    throw new Error("@LazyGetter can only decorate getters!")
  } else if (!desc.configurable) {
    throw new Error("@LazyGetter target must be configurable")
  }

  return originalMethod
}

function getterCommon( //tslint:disable-line:parameters-max-number
  target: any,
  key: PropertyKey,
  isStatic: boolean,
  enumerable: boolean,
  originalMethod: Function,
  thisArg: any,
  args: IArguments,
  setProto: boolean,
  makeNonConfigurable: boolean,
  resultSelector: ResultSelectorFn
): any {
  const value = originalMethod.apply(thisArg, <any>args)

  if (resultSelector(value)) {
    const newDescriptor: PropertyDescriptor = {
      configurable: !makeNonConfigurable,
      enumerable,
      value
    }

    if (isStatic || setProto) {
      Object.defineProperty(target, key, newDescriptor)
    }

    if (!isStatic) {
      Object.defineProperty(thisArg, key, newDescriptor)
    }
  }

  return value
}

/**
 * Evaluate the getter function and cache the result
 * @param [setProto=false] Set the value on the class prototype as well. Only applies to non-static getters.
 * @param [makeNonConfigurable=false] Set to true to make the resolved property non-configurable
 * @param [resultSelector] A filter function that must return true for the value to cached
 * @return A decorator function
 */
function LazyGetter(
  setProto = false,
  makeNonConfigurable = false,
  resultSelector: ResultSelectorFn = defaultFilter
): MethodDecorator & ResettableDescriptor {
  let desc: PropertyDescriptor
  let prop: PropertyKey
  let args: IArguments = <any>null
  let isLegacy: boolean

  function decorator(
    targetOrDesc: any,
    key: PropertyKey,
    descriptor: PropertyDescriptor
  ): DecoratorReturn {
    // eslint-disable-next-line prefer-rest-params
    args = arguments
    if (key === undefined) {
      if (typeof desc === "undefined") {
        isLegacy = false
        prop = (<NewDescriptor>targetOrDesc).key
        desc = Object.assign(
          {},
          (<NewDescriptor>targetOrDesc).descriptor ||
            /* istanbul ignore next */ targetOrDesc
        )
      }

      return decorateNew(targetOrDesc, setProto, makeNonConfigurable, resultSelector)
    } else {
      if (typeof desc === "undefined") {
        isLegacy = true
        prop = key
        desc = Object.assign(
          {},
          descriptor ||
            /* istanbul ignore next */ Object.getOwnPropertyDescriptor(
              targetOrDesc,
              key
            )
        )
      }

      return decorateLegacy(
        targetOrDesc,
        key,
        descriptor,
        setProto,
        makeNonConfigurable,
        resultSelector
      )
    }
  }

  decorator.reset = setProto
    ? thrower
    : (on: any): void => {
        if (!on) {
          throw new Error("Unable to restore descriptor on an undefined target")
        }
        if (!desc) {
          throw new Error(
            "Unable to restore descriptor. Did you remember to apply your decorator to a method?"
          )
        }
        // Restore descriptor to its original state
        Object.defineProperty(on, prop, desc)
        // eslint-disable-next-line prefer-spread
        const ret: any = decorator.apply(null, <any>args)
        Object.defineProperty(on, prop, isLegacy ? ret : ret.descriptor || ret)
      }

  return decorator
}

function thrower(): never {
  throw new Error("This decoration modifies the class prototype and cannot be reset.")
}

export { LazyGetter, ResultSelectorFn }
