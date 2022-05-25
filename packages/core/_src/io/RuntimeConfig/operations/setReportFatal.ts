/**
 * @tsplus fluent ets/RuntimeConfig setReportFatal
 */
export function setReportFatal_(self: RuntimeConfig, reportFatal: (defect: unknown) => void): RuntimeConfig {
  return self.copy({ reportFatal })
}

/**
 * @tsplus static ets/RuntimeConfig/Aspects enableCurrentFiber
 */
export const setReportFatal = Pipeable(setReportFatal_)
