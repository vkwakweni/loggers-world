/**
 * Builds a minimal fake Express `res` that supports the chained
 * `res.status(code).json(body)` / `res.status(code).send()` calls the
 * controllers use, and records what was sent for assertions.
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

module.exports = { createMockRes };
