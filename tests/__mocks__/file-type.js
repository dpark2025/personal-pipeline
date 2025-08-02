// Mock for file-type
const fileTypeFromFile = jest.fn(async (filePath) => {
  if (filePath.endsWith('.pdf')) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  if (filePath.endsWith('.txt')) {
    return { ext: 'txt', mime: 'text/plain' };
  }
  if (filePath.endsWith('.md')) {
    return { ext: 'md', mime: 'text/markdown' };
  }
  // Default to text
  return { ext: 'txt', mime: 'text/plain' };
});

module.exports = { fileTypeFromFile };
module.exports.default = { fileTypeFromFile };
module.exports.fileTypeFromFile = fileTypeFromFile;