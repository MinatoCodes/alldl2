const axios = require("axios");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url, platform } = req.query;

  if (!url || !platform) {
    return res.status(400).json({ success: false, error: "Missing url or platform" });
  }

  const platforms = {
    youtube: {
      path: (videoUrl) =>
        `https://dev-priyanshi.onrender.com/api/youtubev2?url=${encodeURIComponent(videoUrl)}`,
      extract: async (d) => {
        try {
          const mediaUrl = d?.data?.api?.mediaItems?.[0]?.mediaUrl;
          if (!mediaUrl) return null;

          const mediaRes = await axios.get(mediaUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          return mediaRes?.data?.response?.fileUrl || null;
        } catch {
          return null;
        }
      }
    },
    twitter: {
      path: "twitter",
      extract: (d) => {
        if (!d) return null;
        if (Array.isArray(d.url) && d.url.length) {
          const first = d.url[0];
          if (first && typeof first === "object") return first.hd || first.sd || null;
          if (typeof first === "string") return first;
        }
        if (d.hd || d.sd) return d.hd || d.sd;
        return null;
      }
    },
    // ... keep your other platform configs here unchanged
  };

  const selected = platforms[platform];
  if (!selected) {
    return res.status(400).json({ success: false, error: "Unsupported platform" });
  }

  try {
    const apiPath =
      typeof selected.path === "function" ? selected.path(url) : selected.path;
    const response = await axios.get(apiPath, { headers: { "User-Agent": "Mozilla/5.0" } });

    const downloadUrl = selected.extract.constructor.name === "AsyncFunction"
      ? await selected.extract(response.data)
      : selected.extract(response.data);

    if (!downloadUrl) {
      return res.status(500).json({ success: false, error: "Unable to extract video URL" });
    }

    res.json({ success: true, download_url: downloadUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
          
