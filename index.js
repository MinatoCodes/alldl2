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

  // Hardcoded platform detection
  if (!platform) {
    if (/twitter\.com|x\.com/i.test(url)) platform = "twitter";
    else if (/tiktok\.com|vm\.tiktok\.com/i.test(url)) platform = "tiktok";
    else if (/facebook\.com|fb\.watch|share\/r\//i.test(url)) platform = "facebook";
    else if (/instagram\.com|instagr\.am/i.test(url)) platform = "instagram";
    else if (/drive\.google\.com|docs\.google\.com\/uc/i.test(url)) platform = "gdrive";
  }

  if (!platform) return res.status(400).json({ success: false, error: "Unsupported platform or URL." });

  try {
    let downloadUrl = null;

    switch (platform) {
      case "twitter": {
        const apiResp = await axios.get(`https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        downloadUrl = apiResp.data?.url?.[0]?.hd || apiResp.data?.url?.[0]?.sd || apiResp.data?.url || null;
        break;
      }

      case "tiktok": {
        const apiResp = await axios.get(`https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        downloadUrl = apiResp.data?.video?.[0] || apiResp.data?.video || apiResp.data?.url?.[0] || apiResp.data?.url || null;
        break;
      }

      case "facebook": {
        const apiResp = await axios.get(`https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        downloadUrl = apiResp.data?.data?.HD || apiResp.data?.data?.Normal_video || null;
        break;
      }

      case "instagram": {
        const apiResp = await axios.get(`https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        downloadUrl = apiResp.data?.data?.result?.[0]?.url || null;
        break;
      }

      case "gdrive": {
        const apiResp = await axios.get(`https://secret-alldl.vercel.app/api/alldl?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        downloadUrl = apiResp.data?.data?.result?.downloadUrl || null;
        break;
      }
    }

    if (!downloadUrl) return res.status(404).json({ success: false, error: "Unable to extract download URL." });

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
    
