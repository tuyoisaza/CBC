require('dotenv').config()
const scheduler = require('./scheduler')

console.log('CBC Content Engine Scheduler Started')
scheduler.start()

// Keep the process alive
process.stdin.resume()
