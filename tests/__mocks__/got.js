// Mock for got HTTP client
const mockResponse = {
  body: '<html><head><title>Test</title></head><body><h1>Test Content</h1></body></html>',
  statusCode: 200,
  headers: { 'content-type': 'text/html' }
};

const mockGot = jest.fn().mockResolvedValue(mockResponse);
mockGot.get = jest.fn().mockResolvedValue(mockResponse);
mockGot.head = jest.fn().mockResolvedValue({ statusCode: 200 });
mockGot.extend = jest.fn(() => mockGot);

// Mock HTTPError class
class HTTPError extends Error {
  constructor(message, response) {
    super(message);
    this.name = 'HTTPError';
    this.response = response;
  }
}

mockGot.HTTPError = HTTPError;

module.exports = mockGot;
module.exports.default = mockGot;
module.exports.HTTPError = HTTPError;