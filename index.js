const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const platform = req.query.platform || req.url.split("/").slice(-1)[0];
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ success: false, error: "Missing 'url' parameter" });
    }

    // Map backend paths and extraction rules
    const platforms = {
      youtube: {
        path: "youtube",
        extract: d => d.mp4?.[0] || null
      },
      twitter: {
        path: "twitter",
        extract: d => d.url?.[0]?.hd || d.url?.[0]?.sd || null
      },
      tiktok: {
        path: "ttdl",
        extract: d => d.video?.[0] || null
      },
      facebook: {
        path: "fbdown",
        extract: d => d.HD || d.Normal_video || null
      },
      instagram: {
        path: "igdl",
        extract: d => d.video?.[0] || null
      },
      gdrive: {
        path: "gdrive",
        extract: d => d.data?.downloadUrl || null
      }
    };

    const selected = platforms[platform?.toLowerCase()];
    if (!selected) {
      return res.status(400).json({ success: false, error: "Unsupported platform" });
    }

    const apiUrl = `https://backend1.tioo.eu.org/${selected.path}?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

    const downloadUrl = selected.extract(response.data);

    if (!downloadUrl) {
      return res.status(500).json({ success: false, error: "Unable to extract video URL" });
    }

    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform: platform.toLowerCase(),
      download_url: downloadUrl
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
        
