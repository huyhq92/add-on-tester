const { addonBuilder } = require('stremio-addon-sdk');

const manifest = {
    id: "org.thayhuy.ophim",
    name: "OPhim của Thầy HUY",
    version: "1.0.5",
    description: "Addon xem phim tổng hợp từ OPhim",
    icon: "https://raw.githubusercontent.com/huyhq92/add-on-tester/refs/heads/main/ophim/ophim.ico",
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    catalogs: [
        { type: 'movie', id: 'phim-moi', name: 'OPhim - Mới Cập Nhật' }
    ],
    idPrefixes: ["ophim_"]
};

const builder = new addonBuilder(manifest);
const BASE_API = "https://ophim1.com/v1/api";

function getImageUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    return "https://img.ophim.live/uploads/movies/" + path;
}

builder.defineCatalogHandler(async function(args) {
    try {
        const response = await fetch(`${BASE_API}/danh-sach/phim-moi?page=1`);
        const json = await response.json();
        const items = json.data?.items || [];

        const metas = items.map(function(item) {
            return {
                id: "ophim_" + item.slug,
                type: args.type,
                name: item.name,
                poster: getImageUrl(item.thumb_url),
                background: getImageUrl(item.poster_url),
                year: item.year || 0
            };
        });
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async function(args) {
    try {
        var slug = args.id.replace("ophim_", "");
        const response = await fetch(`${BASE_API}/phim/${slug}`);
        const json = await response.json();
        const movie = json.movie || json.data?.item || {};
        const rawEpisodes = json.episodes || json.data?.item?.episodes || [];

        var videoList = [];
        rawEpisodes.forEach(function(server) {
            if (server.server_data) {
                server.server_data.forEach(function(ep, index) {
                    videoList.push({
                        id: args.id + "_e" + (index + 1),
                        title: server.server_name + " - " + ep.name,
                        episode: index + 1,
                        season: 1
                    });
                });
            }
        });

        return {
            meta: {
                id: args.id,
                type: args.type,
                name: movie.name || "",
                poster: getImageUrl(movie.thumb_url),
                background: getImageUrl(movie.poster_url),
                description: (movie.content || "").replace(/<[^>]*>/g, ""),
                releaseInfo: String(movie.year || ""),
                videos: videoList
            }
        };
    } catch (e) {
        return { meta: null };
    }
});

builder.defineStreamHandler(async function(args) {
    try {
        var parts = args.id.split("_e");
        var movieSlug = parts[0].replace("ophim_", "");
        var epIndex = parseInt(parts[1], 10) - 1 || 0;

        const response = await fetch(`${BASE_API}/phim/${movieSlug}`);
        const json = await response.json();
        const episodes = json.episodes || json.data?.item?.episodes || [];

        var streamUrl = "";
        for (var i = 0; i < episodes.length; i++) {
            var server = episodes[i];
            if (server.server_data && server.server_data[epIndex]) {
                streamUrl = server.server_data[epIndex].link_m3u8 || server.server_data[epIndex].link_embed || "";
                break;
            }
        }

        if (!streamUrl) return { streams: [] };

        return {
            streams: [
                {
                    title: "OPhim HD (Chính Thức)",
                    url: streamUrl,
                    behaviorHints: {
                        proxyHeaders: {
                            request: {
                                "User-Agent": "Mozilla/5.0",
                                "Referer": "https://ophim1.com"
                            }
                        }
                    }
                }
            ]
        };
    } catch (e) {
        return { streams: [] };
    }
});

module.exports = builder.getInterface();
