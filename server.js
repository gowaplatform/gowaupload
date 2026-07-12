require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(
  /\/+$/,
  ""
);
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 128;
const MAX_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const UPLOAD_DIR_RAW = process.env.UPLOAD_DIR || "files";
const FILES_DIR = path.isAbsolute(UPLOAD_DIR_RAW)
  ? UPLOAD_DIR_RAW
  : path.join(__dirname, UPLOAD_DIR_RAW);

const ALLOWED_LIST = (process.env.ALLOWED_EXTENSIONS ||
  "zip,mp4,ogg,aac,mp3,xls,xlsx,doc,docx,txt,jpg,jpeg,png,gif,csv")
  .split(",")
  .map((ext) => ext.trim().toLowerCase().replace(/^\./, ""))
  .filter(Boolean);

const ALLOWED_EXT = new Set(ALLOWED_LIST.map((ext) => `.${ext}`));
const ALLOWED_LABEL = ALLOWED_LIST.join(", ");

if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

function sanitizeOriginalName(name) {
  return path
    .basename(name)
    .replace(/[^\w.\-()\s\u00C0-\u024F]/gi, "_")
    .slice(0, 180);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeOriginalName(
      path.basename(file.originalname, path.extname(file.originalname))
    );
    cb(null, `${randomUUID()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(
        new Error(`Formato não permitido. Use: ${ALLOWED_LABEL}.`)
      );
    }
    cb(null, true);
  },
});

function cleanupOldFiles() {
  const now = Date.now();
  fs.readdir(FILES_DIR, (err, files) => {
    if (err) return;
    for (const file of files) {
      if (file === ".gitkeep") continue;
      const full = path.join(FILES_DIR, file);
      fs.stat(full, (statErr, stats) => {
        if (statErr || !stats.isFile()) return;
        if (now - stats.mtimeMs > RETENTION_MS) {
          fs.unlink(full, () => {});
        }
      });
    }
  });
}

cleanupOldFiles();
setInterval(cleanupOldFiles, 60 * 60 * 1000);

app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/files",
  express.static(FILES_DIR, {
    setHeaders(res, filePath) {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${path.basename(filePath).replace(/^[^_]+_/, "")}"`
      );
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "GoWAUpload" });
});

app.get("/api/config", (_req, res) => {
  res.json({
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    maxFileSizeBytes: MAX_SIZE,
    allowedExtensions: ALLOWED_LIST,
    retentionDays: RETENTION_DAYS,
    appUrl: APP_URL,
  });
});

app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: `Arquivo muito grande. O tamanho máximo é ${MAX_FILE_SIZE_MB} MB.`,
        });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const fileUrl = `${APP_URL}/files/${encodeURIComponent(req.file.filename)}`;
    const expiresAt = new Date(Date.now() + RETENTION_MS).toISOString();

    res.json({
      success: true,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      url: fileUrl,
      expiresAt,
      retentionDays: RETENTION_DAYS,
    });
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`GoWAUpload rodando em ${APP_URL} (porta ${PORT})`);
  console.log(
    `Upload: ${FILES_DIR} | Máx: ${MAX_FILE_SIZE_MB} MB | Retenção: ${RETENTION_DAYS} dias`
  );
});
