require('dotenv').config();

const app = require('./server');
const scheduler = require('./scheduler');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`CBC Content Engine — HTTP on :${PORT}`);
});

scheduler
  .start()
  .then(() => console.log('\n🚀 CBC Content Engine scheduler running\n'))
  .catch((err) => console.error('Scheduler start failed:', err.message));
