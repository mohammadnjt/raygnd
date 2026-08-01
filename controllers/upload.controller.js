const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "tmp";
    if (req.query.type === "gold" || req.body.type === "gold") folder = "gold";
    let uploadPath = path.join(__dirname, "../uploads/" + folder);
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowedExts.includes(ext) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("فقط فرمت‌های تصویر (jpg, jpeg, png, gif, webp) مجاز هستند."));
    }
  },
});

exports.uploadMiddleware = upload.single("file");

exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "فایلی ارسال نشده است." });
  }

  const domain = process.env.DOMAIN_URL || "https://raygnd.blhgroups.ir";
  let folder = "tmp";
  if (req.query.type === "gold" || req.body.type === "gold") folder = "gold";
  const relativePath = `/uploads/${folder}/${req.file.filename}`;
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
