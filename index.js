const axios = require("axios");

module.exports = async (req, res) => {
  // CORS headers so it works in browsers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Missing 'url' parameter"
      });
    }

    const base = "https://backend1.tioo.eu.org";

    // Platform patterns & paths
    const platforms = [
      { name: "tiktok", regex: /tiktok\.com/, path: "ttdl" },
      { name: "twitter", regex: /twitter\.com|x\.com/, path: "tweetdl" },
      { name: "gdrive", regex: /drive\.google\.com/, path: "gdrive" },
      { name: "facebook", regex: /facebook\.com|fb\.watch/, path: "fbdown" },
      { name: "instagram", regex: /instagram\.com/, path: "igdl" },
      { name: "youtube", regex: /youtube\.com|youtu\.be/, path: "ytdl" }
    ];

    // Detect platform
    const match = platforms.find(p => p.regex.test(url));
    if (!match) {
      return res.status(400).json({
        success: false,
        error: "Unsupported platform"
      });
    }

    const apiUrl = `${base}/${match.path}?url=${encodeURIComponent(url)}`;

    const response = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const data = response.data;

    // Recursively collect all URLs from the object
    const urls = [];
    function collectUrls(obj) {
      if (typeof obj === "string") {
        if (/^https?:\/\/.+/.test(obj)) urls.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(collectUrls);
      } else if (typeof obj === "object" && obj !== null) {
        Object.values(obj).forEach(collectUrls);
      }
    }
    collectUrls(data);

    if (urls.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Unable to extract video URL"
      });
    }

    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform: match.name,
      download_urls: urls
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message || "Server error"
    });
  }
};
      
