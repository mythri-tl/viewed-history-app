const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'viewed-history/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image'
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are supported'));
    }

    cb(null, true);
  }
});

const uploadPostImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image file size must be less than 5MB' });
    }

    return res.status(400).json({ message: err.message || 'Invalid image upload' });
  });
};

module.exports = { upload, uploadPostImage };
