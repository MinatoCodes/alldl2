const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ytdl = require("ytdl-core");

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

    // Regex patterns for auto-detection
    const patterns = {
      youtube: /(?:youtube\.com|youtu\.be)/i,
      twitter: /(?:twitter\.com|x\.com)/i,
      tiktok: /(?:tiktok\.com|vt\.tiktok\.com)/i,
      facebook: /(?:facebook\.com|fb\.watch)/i,
      instagram: /instagram\.com/i,
      gdrive: /drive\.google\.com/i
    };

    // Extractor logic for each platform
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
      twitter: {
        path: "twitter",
        extract: d => {
          if (!d) return null;
          if (Array.isArray(d.url) && d.url.length) {
            const first = d.url[0];
            if (first && typeof first === "object") return first.hd || first.sd || null;
            if (typeof d.url[0] === "string") return d.url[0];
          }
          if (d.url && typeof d.url === "object") return d.url.hd || d.url.sd || null;
          return null;
        }
      },
      tiktok: {
        path: "ttdl",
        extract: d => {
          if (!d) return null;
          if (Array.isArray(d.video) && d.video.length) return d.video[0];
          if (typeof d.video === "string" && d.video) return d.video;
          if (Array.isArray(d.url) && d.url.length) return d.url[0];
          if (typeof d.url === "string" && d.url) return d.url;
          return null;
        }
      },
      facebook: {
        path: "fbdown",
        extract: d => {
          if (!d) return null;
          return d.HD || d.hd || d.Normal_video || d.Normal_Video || d.url || null;
        }
      },
      instagram: {
        path: "igdl",
        extract: d => {
          if (!d) return null;
          if (Array.isArray(d) && d.length) {
            const first = d[0];
            if (first) {
              if (Array.isArray(first.video) && first.video.length) return first.video[0];
              if (first.url) return first.url;
            }
          }
          if (Array.isArray(d.video) && d.video.length) return d.video[0];
          if (typeof d.url === "string" && d.url) return d.url;
          if (Array.isArray(d.url) && d.url.length) return d.url[0];
          return null;
        }
      },
      gdrive: {
        path: "gdrive",
        extract: d => {
          if (!d) return null;
          if (d.data && (d.data.downloadUrl || d.data.download)) return d.data.downloadUrl || d.data.download;
          if (d.downloadUrl) return d.downloadUrl;
          return null;
        }
      }
    };

    // Auto-detect platform if not given
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

    // Special handling for YouTube with ytdl-core
    if (platform === "youtube") {
      const tempFile = path.join(os.tmpdir(), `ytvideo-${Date.now()}.mp4`);

      await new Promise((resolve, reject) => {
        ytdl(url, { quality: "highest" })
          .pipe(fs.createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const fileName = path.basename(tempFile);
      const uploadStream = fs.createReadStream(tempFile);
      const uploadResponse = await axios.put(`https://transfer.sh/${fileName}`, uploadStream, {
        headers: { "Content-Type": "application/octet-stream" }
      });

      fs.unlink(tempFile, () => {});
      return res.json({
        success: true,
        creator: "MinatoCodes",
        platform,
        transfer_url: uploadResponse.data
      });
    }

    // Other platforms → fetch from backend and extract URL
    const selected = platforms[platform];
    const apiUrl = `https://backend1.tioo.eu.org/${selected.path}?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    const data = response.data;

    const downloadUrl = selected.extract(data);
    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: "Unable to extract video URL" });
    }

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
            
