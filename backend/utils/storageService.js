const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const ErrorResponse = require('./errorResponse');
const { promisify } = require('util');
const sharp = require('sharp');

class StorageService {
  constructor() {
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    this.s3 = new AWS.S3();
    this.cloudfront = new AWS.CloudFront();
    this.bucket = process.env.AWS_S3_BUCKET;
    this.cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

    // Initialize multer for different file types
    this.initializeMulter();
  }

  /**
   * Initialize multer with different configurations
   */
  initializeMulter() {
    // Audio upload configuration
    this.audioUpload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucket,
        acl: 'private',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const fileName = this.generateFileName('audio', file.originalname);
          cb(null, `audio/${fileName}`);
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/flac'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ErrorResponse('Invalid file type. Only MP3, WAV, and FLAC files are allowed.', 400));
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
      }
    });

    // Image upload configuration
    this.imageUpload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucket,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const fileName = this.generateFileName('image', file.originalname);
          cb(null, `images/${fileName}`);
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ErrorResponse('Invalid file type. Only JPEG, PNG, and WebP files are allowed.', 400));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      }
    });

    // Document upload configuration
    this.documentUpload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucket,
        acl: 'private',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const fileName = this.generateFileName('document', file.originalname);
          cb(null, `documents/${fileName}`);
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ErrorResponse('Invalid file type. Only PDF and Word documents are allowed.', 400));
        }
      },
      limits: {
        fileSize: 25 * 1024 * 1024 // 25MB
      }
    });
  }

  /**
   * Generate unique filename
   */
  generateFileName(prefix, originalName) {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `${prefix}-${timestamp}-${hash}${ext}`;
  }

  /**
   * Upload audio file
   */
  async uploadAudio(file, metadata = {}) {
    try {
      const upload = promisify(this.audioUpload.single('audio'));
      await upload(file);

      const key = file.key;
      const url = await this.generateSignedUrl(key);

      return {
        key,
        url,
        metadata: {
          ...metadata,
          size: file.size,
          mimetype: file.mimetype,
          duration: metadata.duration
        }
      };
    } catch (error) {
      console.error('Audio upload error:', error);
      throw new ErrorResponse('Failed to upload audio file', 500);
    }
  }

  /**
   * Upload and process image
   */
  async uploadImage(file, options = {}) {
    try {
      const { width, height, quality = 90 } = options;

      // Process image with sharp if dimensions are specified
      if (width || height) {
        const buffer = await sharp(file.buffer)
          .resize(width, height, {
            fit: 'cover',
            withoutEnlargement: true
          })
          .toFormat('webp', { quality })
          .toBuffer();

        const params = {
          Bucket: this.bucket,
          Key: `images/${this.generateFileName('image', 'processed.webp')}`,
          Body: buffer,
          ContentType: 'image/webp',
          ACL: 'public-read'
        };

        await this.s3.upload(params).promise();
        return `https://${this.cloudfrontDomain}/${params.Key}`;
      }

      // Upload original if no processing needed
      const upload = promisify(this.imageUpload.single('image'));
      await upload(file);
      return `https://${this.cloudfrontDomain}/${file.key}`;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload image', 500);
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(file, metadata = {}) {
    try {
      const upload = promisify(this.documentUpload.single('document'));
      await upload(file);

      const key = file.key;
      const url = await this.generateSignedUrl(key);

      return {
        key,
        url,
        metadata: {
          ...metadata,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      console.error('Document upload error:', error);
      throw new ErrorResponse('Failed to upload document', 500);
    }
  }

  /**
   * Generate signed URL for private files
   */
  async generateSignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn
      };

      return await this.s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('Signed URL generation error:', error);
      throw new ErrorResponse('Failed to generate signed URL', 500);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error('File deletion error:', error);
      throw new ErrorResponse('Failed to delete file', 500);
    }
  }

  /**
   * Create CloudFront invalidation
   */
  async invalidateCache(paths) {
    try {
      const params = {
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: paths.length,
            Items: paths.map(path => `/${path}`)
          }
        }
      };

      await this.cloudfront.createInvalidation(params).promise();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw new ErrorResponse('Failed to invalidate cache', 500);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      const data = await this.s3.headObject(params).promise();
      return {
        contentType: data.ContentType,
        size: data.ContentLength,
        lastModified: data.LastModified,
        metadata: data.Metadata
      };
    } catch (error) {
      console.error('Metadata retrieval error:', error);
      throw new ErrorResponse('Failed to get file metadata', 500);
    }
  }

  /**
   * Copy file within bucket
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const params = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      };

      await this.s3.copyObject(params).promise();
      return `https://${this.cloudfrontDomain}/${destinationKey}`;
    } catch (error) {
      console.error('File copy error:', error);
      throw new ErrorResponse('Failed to copy file', 500);
    }
  }
}

module.exports = new StorageService();
