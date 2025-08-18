const axios = require("axios");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = (req.query && req.query.url) || (req.body && req.body.url);
  let platform = (req.query && req.query.platform) || (req.body && req.body.platform) || null;
  platform = platform ? platform.toString().trim().toLowerCase() : null;

  if (!url) {
    return res.status(400).json({ success: false, error: "Missing 'url' parameter. Provide ?url=<video-url> or { url } in body." });
  }

  // patterns to auto-detect platform from URL
  const patterns = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    twitter: /(?:twitter\.com|x\.com)/i,
    tiktok: /(?:tiktok\.com|vt\.tiktok\.com)/i,
    facebook: /(?:facebook\.com|fb\.watch)/i,
    instagram: /instagram\.com/i,
    gdrive: /drive\.google\.com/i
  };

  // platform handlers with fixed extractors
  const platforms = {
    youtube: {
      path: (v) => `https://dev-priyanshi.onrender.com/api/youtubev2?url=${encodeURIComponent(v)}`,
      extract: async (d) => {
        try {
          const mediaUrl = d?.data?.api?.mediaItems?.[0]?.mediaUrl;
          if (!mediaUrl) return null;
          const mediaRes = await axios.get(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
          return mediaRes?.data?.response?.fileUrl || mediaRes?.data?.fileUrl || mediaRes?.data?.response?.file || null;
        } catch (err) {
          console.error("youtube extractor error:", err.message || err);
          return null;
        }
      }
    },
    twitter: {
      path: (v) => `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(v)}`,
      extract: (d) => {
        if (!d) return null;
        // prefer HD, fallback to SD
        const urls = Array.isArray(d.url) ? d.url : [d.url];
        for (const u of urls) {
          if (u && typeof u === "object" && u.hd) return u.hd;
        }
        for (const u of urls) {
          if (u && typeof u === "object" && u.sd) return u.sd;
        }
        return null;
      }
    },
    tiktok: {
      path: (v) => `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(v)}`,
      extract: (d) => {
        if (!d) return null;
        // use first video from array
        if (Array.isArray(d.video) && d.video.length) return d.video[0];
        if (typeof d.video === "string") return d.video;
        if (Array.isArray(d.url) && d.url.length) return d.url[0];
        if (typeof d.url === "string") return d.url;
        return null;
      }
    },
    facebook: {
      path: (v) => `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(v)}`,
      extract: (d) => d?.HD || d?.hd || d?.Normal_video || d?.Normal_Video || d?.url || null
    },
    instagram: {
      path: (v) => `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(v)}`,
      extract: (d) => {
        if (!d) return null;
        const result = d.data?.result?.[0];
        if (result) return result.url || result.video?.[0] || null;
        return null;
      }
    },
    gdrive: {
      path: (v) => `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(v)}`,
      extract: (d) => d?.data?.downloadUrl || d?.data?.download || d?.downloadUrl || null
    }
  };

  // auto-detect platform if not provided
  if (!platform) {
    for (const key of Object.keys(patterns)) {
      if (patterns[key].test(String(url))) {
        platform = key;
        break;
      }
    }
    // detect direct Google Drive download link
    if (/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?export=download&id=)/i.test(url)) {
      platform = "gdrive";
    }
  }

  if (!platform || !platforms[platform]) {
    return res.status(400).json({ success: false, error: "Unsupported or undetectable platform from provided URL." });
  }

  try {
    const selected = platforms[platform];
    const apiUrl = typeof selected.path === "function" ? selected.path(url) : `${selected.path}${encodeURIComponent(url)}`;
    const apiResp = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    const downloadUrl = await selected.extract(apiResp.data);

    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: "Unable to extract file URL from platform API." });
    }

    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform,
      download_url: downloadUrl
    });
  } catch (err) {
    console.error("main handler error:", err.message || err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
    
