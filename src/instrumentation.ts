export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      console.error('[uncaughtException]', err)
    })
    process.on('unhandledRejection', (reason) => {
      console.error('[unhandledRejection]', reason)
    })
  }
}
