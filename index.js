const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Missing 'url' parameter"
      });
    }

    const base = "https://backend1.tioo.eu.org";

    // Platform patterns and their API paths
    const platforms = [
      { name: "tiktok",    regex: /tiktok\.com/,               path: "ttdl",    getUrl: d => d.video?.[0] },
      { name: "twitter",   regex: /twitter\.com|x\.com/,       path: "twitter", getUrl: d => d.url?.[0]?.hd || d.url?.[0]?.sd },
      { name: "gdrive",    regex: /drive\.google\.com/,        path: "gdrive",  getUrl: d => d.data?.downloadUrl },
      { name: "facebook",  regex: /facebook\.com|fb\.watch/,   path: "fbdown",  getUrl: d => d.hd || d.sd },
      { name: "instagram", regex: /instagram\.com/,            path: "igdl",    getUrl: d => d.video?.[0] },
      { name: "youtube",   regex: /youtube\.com|youtu\.be/,    path: "youtube",    getUrl: d => d.url?.[0] }
    ];

    // Detect platform
    const match = platforms.find(p => p.regex.test(url));
    if (!match) {
      return res.status(400).json({
        success: false,
        error: "Unsupported platform"
      });
    }

    // Build API URL
    const apiUrl = `${base}/${match.path}?url=${encodeURIComponent(url)}`;

    // Fetch data from backend
    const response = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const downloadUrl = match.getUrl(response.data);

    if (!downloadUrl) {
      return res.status(500).json({
        success: false,
        error: "Unable to extract video URL"
      });
    }

    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform: match.name,
      download_url: downloadUrl
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message || "Server error"
    });
  }
};
      
