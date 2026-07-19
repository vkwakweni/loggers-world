const express = require('express');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  // TODO: no error handling on listen() — e.g. EADDRINUSE if the port is already taken crashes the process uncaught
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

module.exports = app;
