// Mock for robots-parser
const mockRobots = {
  isAllowed: jest.fn(() => true),
  isDisallowed: jest.fn(() => false)
};

const robotsParser = jest.fn(() => mockRobots);

module.exports = robotsParser;
module.exports.default = robotsParser;