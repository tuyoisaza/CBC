function ts(): string {
  return new Date().toISOString()
}

function format(level: string, module: string, context: Record<string, unknown>, message: string): string {
  const ctx = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context, jsonReplacer)}`
    : ''
  return `${ts()} [${level}] [${module}]${ctx} ${message}`
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack?.split('\n').slice(0, 3).join('|') }
  }
  return value
}

export function createLogger(module: string) {
  return {
    info(context: Record<string, unknown>, message: string) {
      console.log(format('INFO', module, context, message))
    },
    warn(context: Record<string, unknown>, message: string) {
      console.warn(format('WARN', module, context, message))
    },
    error(context: Record<string, unknown>, message: string) {
      console.error(format('ERROR', module, context, message))
    },
  }
}
