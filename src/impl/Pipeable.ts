/**
 * @since 2.0.0
 */
export const pipeArguments = <A>(self: A, args: IArguments): unknown => {
  switch (args.length) {
    case 1:
      return args[0](self)
    case 2:
      return args[1](args[0](self))
    case 3:
      return args[2](args[1](args[0](self)))
    case 4:
      return args[3](args[2](args[1](args[0](self))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](self)))))
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](self))))))
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))))
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))))
    default: {
      let ret = self
      for (let i = 0, len = args.length; i < len; i++) {
        ret = args[i](ret)
      }
      return ret
    }
  }
}
