const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    let platform = (req.query.platform || "").toString().trim().toLowerCase() || null;
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ success: false, error: "Missing 'url' parameter" });
    }

    const patterns = {
      youtube: /(?:youtube\.com|youtu\.be)/i,
      twitter: /(?:twitter\.com|x\.com)/i,
      tiktok: /(?:tiktok\.com|vt\.tiktok\.com)/i,
      facebook: /(?:facebook\.com|fb\.watch)/i,
      instagram: /instagram\.com/i,
      gdrive: /drive\.google\.com/i
    };

    const platforms = {
      youtube: {
        path: "youtube",
        extract: d => {
          if (!d) return null;
          if (Array.isArray(d.mp4) && d.mp4.length) return d.mp4[0];
          if (typeof d.mp4 === "string" && d.mp4) return d.mp4;
          if (Array.isArray(d.url) && d.url.length) return d.url[0];
          if (typeof d.url === "string" && d.url) return d.url;
          if (typeof d.mp4 === "object" && d.mp4?.url) return d.mp4.url;
          return null;
        }
      },
      twitter: { path: "twitter", extract: d => null },
      tiktok: { path: "ttdl", extract: d => null },
      facebook: { path: "fbdown", extract: d => null },
      instagram: { path: "igdl", extract: d => null },
      gdrive: { path: "gdrive", extract: d => null }
    };

    if (!platform) {
      for (const key of Object.keys(patterns)) {
        if (patterns[key].test(url)) {
          platform = key;
          break;
        }
      }
    }

    if (!platform || !platforms[platform]) {
      return res.status(400).json({ success: false, error: "Unsupported or undetectable platform" });
    }

    const selected = platforms[platform];
    const apiUrl = `https://backend1.tioo.eu.org/${selected.path}?url=${encodeURIComponent(url)}`;

    const response = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 20000
    });
    const data = response.data;
    const downloadUrl = selected.extract(data);

    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: "Unable to extract video URL" });
    }

    if (platform === "youtube") {
      // 1. Download video to temp file
      const tempFile = path.join(__dirname, `yt_${Date.now()}.mp4`);
      const videoStream = await axios({
        method: "GET",
        url: downloadUrl,
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempFile);
        videoStream.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // 2. Upload to Catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(tempFile));

      const catboxRes = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders()
      });

      // 3. Cleanup temp file
      fs.unlink(tempFile, () => {});

      return res.json({
        success: true,
        creator: "MinatoCodes",
        platform,
        catbox_url: catboxRes.data
      });
    }

    // default (non-youtube)
    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform,
      download_url: downloadUrl
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
    
