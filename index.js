const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = async (req, res) => {
  // CORS headers
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

    // Regex patterns to detect platform
    const patterns = {
      youtube: /(?:youtube\.com|youtu\.be)/i,
      twitter: /(?:twitter\.com|x\.com)/i,
      tiktok: /(?:tiktok\.com|vt\.tiktok\.com)/i,
      facebook: /(?:facebook\.com|fb\.watch)/i,
      instagram: /instagram\.com/i,
      gdrive: /drive\.google\.com/i
    };

    // API backend paths + extractors
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
            if (typeof first === "string") return first;
          }
          if (d.hd) return d.hd;
          if (d.sd) return d.sd;
          return null;
        }
      },
      tiktok: {
        path: "tiktok",
        extract: d => d?.url || d?.play || null
      },
      facebook: {
        path: "facebook",
        extract: d => {
          if (!d) return null;
          if (d.hd) return d.hd;
          if (d.sd) return d.sd;
          return null;
        }
      },
      instagram: {
        path: "instagram",
        extract: d => d?.url || null
      },
      gdrive: {
        path: "gdrive",
        extract: d => d?.url || null
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

    const selected = platforms[platform];
    const apiUrl = `https://backend1.tioo.eu.org/${selected.path}?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    const data = response.data;
    const downloadUrl = selected.extract(data);

    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: "Unable to extract video URL" });
    }

    // Special handling for YouTube: download -> upload to transfer.sh
    if (platform === "youtube") {
      const tempFile = path.join(os.tmpdir(), `ytvideo-${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFile);
      const videoStream = await axios.get(downloadUrl, { responseType: "stream" });
      await new Promise((resolve, reject) => {
        videoStream.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
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

    // Other platforms: direct link
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
                      
