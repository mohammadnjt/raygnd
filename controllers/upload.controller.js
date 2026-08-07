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
  console.log(`[Upload] Upload middleware triggered for path: ${req.originalUrl}, method: ${req.method}`);
  console.log(`[Upload] Request body:`, req.body);
  console.log(`[Upload] Request query:`, req.query);
  
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
      console.error(`[Upload Error] Multer error:`, err);
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

    if (req.file) {
       console.log(`[Upload] File received by multer:`, req.file.originalname, req.file.mimetype, req.file.size);
    } else {
       console.log(`[Upload Warning] No file received by multer.`);
    }

    next();
  });
};

exports.uploadFile = async (req, res) => {
  console.log(`[Upload] uploadFile controller triggered`);
  if (!req.file) {
    console.error(`[Upload Error] No file found in request`);
    return res.status(400).json({ success: false, message: "فایلی ارسال نشده است." });
  }

  const domain = process.env.DOMAIN_URL || "https://raygnd.blhgroups.ir";
  let folder = "tmp";
  if (req.file.destination) {
    const parts = req.file.destination.replace(/\\/g, '/').split('/');
    folder = parts[parts.length - 1]; // "tmp", "gold", "profile"
  }

  // Move the file if req.body.type resolves to a different target folder now
  const type = req.query.type || req.body.type;
  let targetFolder = folder;
  if (type === "gold") targetFolder = "gold";
  else if (type === "profile" || type === "avatar") targetFolder = "profile";

  if (targetFolder !== folder) {
    try {
      const fs = require('fs');
      const path = require('path');
      const oldPath = req.file.path;
      const newDest = path.join(__dirname, "../uploads/", targetFolder);
      if (!fs.existsSync(newDest)) {
         fs.mkdirSync(newDest, { recursive: true });
      }
      const newPath = path.join(newDest, req.file.filename);
      fs.renameSync(oldPath, newPath);
      
      req.file.destination = newDest;
      req.file.path = newPath;
      folder = targetFolder;
      console.log(`[Upload] Moved file from tmp to target folder: ${targetFolder}`);
    } catch(err) {
      console.error(`[Upload Error] Could not move file to ${targetFolder}:`, err);
    }
  }

  console.log(`[Upload] Determined destination folder: ${folder}`);

  let finalFilename = req.file.filename;

  try {
    const ext = require('path').extname(req.file.originalname).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) || (req.file.mimetype && req.file.mimetype.startsWith("image/"));
    
    // Don't convert SVG or if it's already webp
    if (isImage && ext !== '.svg' && ext !== '.webp') {
      console.log(`[Upload] Image identified for webp conversion: ${req.file.originalname}`);
      const sharp = require('sharp');
      const originalPath = req.file.path;
      
      const extStr = require('path').extname(finalFilename);
      const webpFilename = extStr ? finalFilename.replace(extStr, '.webp') : finalFilename + '.webp';
      const webpPath = require('path').join(req.file.destination, webpFilename);
      
      await sharp(originalPath)
        .webp({ quality: 90 }) // high quality
        .toFile(webpPath);
        
      // Delete original file
      require('fs').unlinkSync(originalPath);
      finalFilename = webpFilename;
      console.log(`[Upload] Image successfully converted to: ${finalFilename}`);
    } else {
      console.log(`[Upload] File skipped webp conversion (ext: ${ext}, isImage: ${isImage})`);
    }
  } catch (err) {
    console.error(`[Upload Error] Image conversion error:`, err);
    // If conversion fails, fallback to the originally uploaded file
  }

  const relativePath = `/uploads/${folder}/${finalFilename}`;
  const fullUrl = `${domain}${relativePath}`;
  
  console.log(`[Upload Success] Final file path: ${relativePath}, Final URL: ${fullUrl}`);

  return res.json({
    success: true,
    message: "فایل با موفقیت آپلود شد.",
    data: {
      path: relativePath,
      url: fullUrl,
    },
  });
};

