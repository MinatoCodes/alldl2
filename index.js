const axios = require("axios");
const baseUrl= "https://secret-alldl.vercel.app/api/alldl";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // accept url from query or body (GET or POST)
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

  // platform handlers (YouTube uses the Priyanshi API + second request)
  const platforms = {
    youtube: {
      path: (videoUrl) => `https://dev-priyanshi.onrender.com/api/youtubev2?url=${encodeURIComponent(videoUrl)}`,
      extract: async (apiResponse) => {
        try {
          // mediaUrl is at $.data.api.mediaItems[0].mediaUrl
          const mediaUrl = apiResponse?.data?.api?.mediaItems?.[0]?.mediaUrl;
          if (!mediaUrl) return null;

          // fetch the mediaUrl (it returns JSON that contains response.fileUrl)
          const mediaRes = await axios.get(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });

          // try common locations for the file URL
          const fileUrl =
            mediaRes?.data?.response?.fileUrl ||
            mediaRes?.data?.fileUrl ||
            mediaRes?.data?.response?.file ||
            null;

          return fileUrl || null;
        } catch (err) {
          // don't throw — return null so main handler returns a consistent error response
          console.error("youtube extractor error:", err.message || err);
          return null;
        }
      }
    },

    twitter: {
      path: (videoUrl) => `{baseUrl}?url=${encodeURIComponent(videoUrl)}`,
      extract: (d) => {
        if (!d) return null;
        if (Array.isArray(d.url) && d.url.length) {
          const first = d.url[0];
          if (first && typeof first === "object") return first.hd || first.sd || null;
          if (typeof first === "string") return first;
        }
        if (d.url && typeof d.url === "object") return d.url.hd || d.url.sd || null;
        return null;
      }
    },

    tiktok: {
      path: (videoUrl) => `{baseUrl}?url=${encodeURIComponent(videoUrl)}`,
      extract: (d) => {
        if (!d) return null;
        if (Array.isArray(d.video) && d.video.length) return d.video[0];
        if (typeof d.video === "string" && d.video) return d.video;
        if (Array.isArray(d.url) && d.url.length) return d.url[0];
        if (typeof d.url === "string" && d.url) return d.url;
        return null;
      }
    },

    facebook: {
      path: (videoUrl) => `{baseUrl}?url=${encodeURIComponent(videoUrl)}`,
      extract: (d) => d?.HD || d?.hd || d?.Normal_video || d?.Normal_Video || d?.url || null
    },

    instagram: {
      path: (videoUrl) => `{baseUrl}?url=${encodeURIComponent(videoUrl)}`,
      extract: (d) => {
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
      path: (videoUrl) => `{baseUrl}?url=${encodeURIComponent(videoUrl)}`,
      extract: (d) => {
        if (!d) return null;
        if (d.data && (d.data.downloadUrl || d.data.download)) return d.data.downloadUrl || d.data.download;
        if (d.downloadUrl) return d.downloadUrl;
        return null;
      }
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
  }

  if (!platform || !platforms[platform]) {
    return res.status(400).json({ success: false, error: "Unsupported or undetectable platform from provided URL." });
  }

  const selected = platforms[platform];

  try {
    const apiUrl = typeof selected.path === "function" ? selected.path(url) : `${selected.path}${encodeURIComponent(url)}`;

    const apiResp = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    // always await the extractor (works for both sync and async)
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
    
