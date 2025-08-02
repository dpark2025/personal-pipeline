// Mock for normalize-url
const normalizeUrl = jest.fn((url) => {
  // Simple normalization mock
  return url.replace(/\/$/, '') || url;
});

module.exports = normalizeUrl;
module.exports.default = normalizeUrl;