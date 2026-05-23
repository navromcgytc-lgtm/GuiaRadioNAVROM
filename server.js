const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

app.use(express.json({ limit: "200mb" }));

app.post("/mix", async (req, res) => {
  console.log("MIX REQUEST RECEIVED");
  try {

    const {
      video_url,
      audio_b64,
      audio_mime
    } = req.body;

    if (!video_url || !audio_b64) {
      return res.status(400).json({
        ok: false,
        error: "missing_video_or_audio"
      });
    }

    const id = uuidv4();

    const tempDir = "/tmp";

    const videoPath = path.join(tempDir, `${id}_video.mp4`);
    const audioPath = path.join(tempDir, `${id}_audio.mp3`);
    const outputPath = path.join(tempDir, `${id}_final.mp4`);

    // Descargar video
    const videoResponse = await axios({
      url: video_url,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(videoPath);

    videoResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Guardar audio
    fs.writeFileSync(
      audioPath,
      Buffer.from(audio_b64, "base64")
    );

    // Mezclar
    await new Promise((resolve, reject) => {

      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest"
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);

    });

    // Aquí puedes luego subir a Supabase Storage
    // o devolver temporalmente.

    return res.json({
      ok: true,
      final_video_url: publicUrl
    });

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: "mix_failed",
      detail: String(e)
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("NAVROM Mixer running on port", PORT);
});
