// Mock for p-limit
const pLimit = jest.fn((limit) => {
  return jest.fn((fn) => fn());
});

module.exports = pLimit;
module.exports.default = pLimit;