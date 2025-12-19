import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';

const RECORDS_DIR = process.env.RECORDS_PATH || './records';

const ALLOWED_MIMES = [
  'audio/mpeg',      // .mp3
  'audio/wav',       // .wav
  'audio/ogg',       // .ogg
  'audio/webm',      // .webm audio
  'audio/x-m4a',     // .m4a
  'video/mp4',       // .mp4
  'video/webm',      // .webm video
  'video/ogg',       // .ogv
];

const MAX_SIZE = parseInt(process.env.MAX_RECORDING_SIZE || '104857600'); // 100MB default

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const saleId = req.params.saleId;
    if (!saleId) {
      return cb(new Error('saleId es requerido'), '');
    }

    const dir = path.join(RECORDS_DIR, saleId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuid()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: audio/video`));
  }
};

export const uploadRecording = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
  },
});

export { RECORDS_DIR, ALLOWED_MIMES, MAX_SIZE };
