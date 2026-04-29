const express = require('express');
const multer = require('multer');
const { toFile } = require('groq-sdk');
const Groq = require('groq-sdk');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    const audioFile = await toFile(req.file.buffer, req.file.originalname || 'recording.webm');
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'json',
      temperature: 0,
    });

    return res.json({
      success: true,
      text: transcription.text || '',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
