const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extensionByMimeType[file.mimetype] || path.extname(file.originalname).slice(1);
    cb(null, `post_${Date.now()}_${Math.round(Math.random() * 1e9)}.${ext}`);
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

module.exports = { uploadPostImage };
