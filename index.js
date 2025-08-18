const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Only GET requests are allowed" });
  }

  const url = req.query.url;
  let platform = req.query.platform ? req.query.platform.toLowerCase() : null;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing 'url' parameter. Provide ?url=<video-url>"
    });
  }

  // Detect platform automatically if not provided
  if (!platform) {
    if (/youtube\.com|youtu\.be/i.test(url)) platform = "youtube";
    else if (/twitter\.com|x\.com/i.test(url)) platform = "twitter";
    else if (/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(url)) platform = "tiktok";
    else if (/facebook\.com|fb\.watch|share\/r\//i.test(url)) platform = "facebook";
    else if (/instagram\.com|instagr\.am/i.test(url)) platform = "instagram";
    else if (/drive\.google\.com|docs\.google\.com\/uc/i.test(url)) platform = "gdrive";
  }

  if (!platform) return res.status(400).json({ success: false, error: "Unsupported platform or URL." });

  try {
    let downloadUrl = null;

    switch (platform) {
      case "youtube": {
        const apiResp = await axios.get(
          `https://dev-priyanshi.onrender.com/api/youtubev2?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        downloadUrl = apiResp.data?.api?.mediaItems?.[0]?.mediaUrl || null;
        break;
      }

      case "twitter": {
        const apiResp = await axios.get(
          `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const data = apiResp.data;
        downloadUrl = data?.data?.url?.[0]?.hd || data?.data?.url?.[0]?.sd || null;
        break;
      }

      case "tiktok": {
        const apiResp = await axios.get(
          `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const data = apiResp.data;
        if (data?.data?.video) {
          downloadUrl = Array.isArray(data.data.video)
            ? data.data.video[0]
            : data.data.video;
        } else {
          downloadUrl = null;
        }
        break;
      }

      case "facebook": {
        const apiResp = await axios.get(
          `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const d = apiResp.data?.data;
        downloadUrl = d?.HD || d?.Normal_video || null;
        break;
      }

      case "instagram": {
        const apiResp = await axios.get(
          `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const d = apiResp.data?.data;
        downloadUrl = d?.result?.[0]?.url || null;
        break;
      }

      case "gdrive": {
        const apiResp = await axios.get(
          `https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const d = apiResp.data?.data;
        downloadUrl = d?.result?.downloadUrl || null;
        break;
      }
    }

    if (!downloadUrl) {
      return res.status(404).json({ success: false, error: "Unable to extract download URL." });
    }

    return res.json({
      success: true,
      creator: "MinatoCodes",
      platform,
      download_url: downloadUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
  
