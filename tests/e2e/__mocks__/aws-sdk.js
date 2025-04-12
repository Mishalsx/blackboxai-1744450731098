// Mock AWS SDK
const mockS3Instance = {
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Location: 'https://test-bucket.s3.amazonaws.com/test-file',
      Key: 'test-file'
    })
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  getSignedUrl: jest.fn().mockReturnValue('https://test-bucket.s3.amazonaws.com/test-file?signed')
};

class S3 {
  constructor() {
    return mockS3Instance;
  }
}

module.exports = {
  S3,
  mockS3Instance,
  config: {
    update: jest.fn()
  }
};
