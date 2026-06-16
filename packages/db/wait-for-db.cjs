const net = require('net')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const match = url.match(/@([^:]+):(\d+)/)
const host = match ? match[1] : 'localhost'
const port = match ? parseInt(match[2], 10) : 5432

async function wait() {
  for (let i = 1; i <= 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(port, host, () => {
          socket.end()
          resolve()
        })
        socket.on('error', reject)
        socket.setTimeout(3000, () => {
          socket.destroy()
          reject(new Error('Connection timed out'))
        })
      })
      console.log('Database is ready')
      process.exit(0)
    } catch (err) {
      console.log(`Waiting for database... attempt ${i}/30`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  console.error('Database not ready after 60 seconds, exiting')
  process.exit(1)
}

wait()
