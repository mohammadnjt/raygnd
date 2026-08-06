const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "tmp";
    const type = req.query.type || req.body.type;
    if (type === "gold") folder = "gold";
    else if (type === "profile" || type === "avatar") folder = "profile";

    const uploadPath = path.join(__dirname, "../uploads/" + folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    if (allowedExts.includes(ext) || (file.mimetype && file.mimetype.startsWith("image/"))) {
      cb(null, true);
    } else {
      cb(new Error("فقط فرمت‌های تصویر (jpg, jpeg, png, gif, webp) مجاز هستند."));
    }
  },
});

exports.uploadMiddleware = (req, res, next) => {
  if (req.setTimeout) {
    req.setTimeout(300000); // 5 minutes upload timeout
  }

  const uploadFields = upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "ufile", maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ success: false, message: "حجم فایل بیش از حد مجاز است (حداکثر ۲۰ مگابایت)." });
        }
        return res.status(400).json({ success: false, message: `خطا در آپلود فایل: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || "خطا در آپلود فایل" });
    }

    if (!req.file && req.files) {
      const keys = Object.keys(req.files);
      if (keys.length > 0 && req.files[keys[0]] && req.files[keys[0]][0]) {
        req.file = req.files[keys[0]][0];
      }
    }

    next();
  });
};

exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "فایلی ارسال نشده است." });
  }

  const domain = process.env.DOMAIN_URL || "https://raygnd.blhgroups.ir";
  let folder = "tmp";
  const type = req.query.type || req.body.type;
  if (type === "gold") folder = "gold";
  else if (type === "profile" || type === "avatar") folder = "profile";

  if (req.file.destination) {
    if (req.file.destination.endsWith("gold")) folder = "gold";
    else if (req.file.destination.endsWith("profile")) folder = "profile";
  }

  let finalFilename = req.file.filename;

  try {
    const ext = require('path').extname(req.file.originalname).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) || (req.file.mimetype && req.file.mimetype.startsWith("image/"));
    
    // Don't convert SVG or if it's already webp
    if (isImage && ext !== '.svg' && ext !== '.webp') {
      const sharp = require('sharp');
      const originalPath = req.file.path;
      const webpFilename = finalFilename.replace(require('path').extname(finalFilename), '.webp');
      const webpPath = require('path').join(req.file.destination, webpFilename);
      
      await sharp(originalPath)
        .webp({ quality: 90 }) // high quality
        .toFile(webpPath);
        
      // Delete original file
      require('fs').unlinkSync(originalPath);
      finalFilename = webpFilename;
    }
  } catch (err) {
    console.error("Image conversion error:", err);
    // If conversion fails, fallback to the originally uploaded file
  }

  const relativePath = `/uploads/${folder}/${finalFilename}`;
  const fullUrl = `${domain}${relativePath}`;

  return res.json({
    success: true,
    message: "فایل با موفقیت آپلود شد.",
    data: {
      path: relativePath,
      url: fullUrl,
    },
  });
};

