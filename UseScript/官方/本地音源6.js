"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const axios_1 = require("axios");
const pageSize = 30;



// 时间转换文字
function Hms(timestamp) {
    let date = new Date(timestamp * 1000);
    let hours = String(date.getHours() - 8).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}



// 计算歌曲大小
function Size(size) {
    if (!size) return '无法计算';
    let units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (size >= 1024) {
        size /= 1024;
        i++;
    }
    size = i ? size.toFixed(2) : size;
    return `${size} ${units[i]}`;
}



// 获取 "登录" 信息
function getLogin() {
    let _a, _b;
    let {
        uin,
        qm_keyst
    } = (_b = (_a = env === null || env === void 0 ? void 0 : env.getUserVariables) === null || _a === void 0 ? void 0 : _a.call(env)) !== null && _b !== void 0 ? _b : {};
    _a = String(qm_keyst).split(/qm_keyst=/i);
    qm_keyst = (_a[1] || _a[0]).split(/;|&|\n/i)[0];
    _b = String(uin).split(/uin=/i);
    uin = (_b[1] || _b[0]).split(/;|&|\n/i)[0];
    if (!qm_keyst || !uin || !(qm_keyst.match('W_X') || qm_keyst.match('Q_H_L'))) {
        qm_keyst = false;
        uin = 0;
    } else {
        uin = Number(uin);
    }
    return {
        isLogin: uin && qm_keyst,
        qm_keyst,
        uin
    }
}



// 歌曲信息
function formatMusicItem(_) {
    let f = _.file;
    let name = _.name || _.songname || _.title || _.mvname;
    let singer = (_.singer && _.singer.map(_ => _.name).join('&')) || _.singername || "";
    let interval = Hms((_.interval || _.duration) * 1000);

    let songId = _.mid || _.songmid;
    let albumName = _.albumname || (_.album && (_.album.name || _.album.title));
    let albumId = _.albummid || (_.album && _.album.mid) || "";
    let picUrl = (albumId && `T002 _ ${albumId}`) || (_.vs && _.vs[1] && `T062 _ ${_.vs[1]}`) || "";
    if (picUrl != "") picUrl = "https://y.gtimg.cn/music/photo_new/" + picUrl.replace(" _ ", "R500x500M000") + ".jpg";
    let qualitys = [];
    for (let k of ['128mp3', '320mp3', 'flac', 'hires']) {
        if (f['size_' + k]) {
            qualitys.push({
                type: {
                    '128mp3': "128k",
                    '320mp3': "320k",
                    'flac': "flac",
                    'hires': "flac24bit"
                }[k],
                size: Size(f['size_' + k])
            });
        }
    }
    let strMediaMid = f.media_mid;
    let albumMid = _.album && _.album.mid;

    return {
        id: _.id || _.songid,
        songmid: songId,
        title: name,
        artist: singer,
        artwork: picUrl,
        album: albumName,
        // lrc: _.lyric,
        albumid: _.albumid || (_.album && _.album.id),
        albummid: albumId,

        interval: interval,
        qualitys: qualitys,
        strMediaMid: strMediaMid,
        content: _.pay.payplay || _.pay.pay_play || "0"
    };
}



// 专辑信息
function formatAlbumItem(_) {
    let _ = _.songInfo || _;
    let albumMID = _.albumMid || _.albumMID || _.album_mid || _.albummid;
    return {
        id: _.albumID || _.albumid || _.id,
        albumMID: albumMID,
        title: _.albumName || _.album_name || _.name,
        artwork: _.albumPic ||
            (albumMID && `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMID}.jpg`) || _.pic,
        date: _.publicTime || _.pub_time || _.publish_date,
        singerID: _.singerID || _.singer_id,
        artist: String(_.singerName || _.singer_name || _.singer || "").replace(/<\/?em>/gi, ""),
        singerMID: _.singerMID || _.singer_mid,
        description: _.desc || _.description,
    };
}



// 歌单信息
function formatSheetItem(_) {
    return {
        title: String(_.dissname || _.title || _.name || "").replace(/<\/?em>/gi, ""),
        artwork: _.imgurl || _.cover_url_big || _.cover_url_medium || _.cover_url_small || (_.cover && (_.cover.big_url || _.cover.medium_url || _.cover.small_url)) || _.logo || _.pic,
        id: _.dissid || _.tid,
        content: 2,
        // createAt: item.createtime,
        // worksNums: item.song_count,
        // createTime: item.createTime,
        // description: item.introduction,
        // playCount: item.listennum,
        // artist: (_b = (_a = item.creator) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
    };
}



// 基础参数
function getComm(headerx = {}, isHead) {
    let ct = 11;
    let {
        uin,
        qm_keyst
    } = getLogin();
    let cv = uin || 948168827; // 0
    let tk = qm_keyst || "Q_H_L_5FBMRs-uicpIQo8Ymt3v0w1f0DAyJwQMdLJPVKmmOQZRQZkuz8AfB1Q";
    let headers = Object.assign({
        "Referer": "https://y.qq.com/",
        "User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
        "Cookie": "qm_keyst=" + tk + "; uin=" + cv
    }, headerx || {});
    if (isHead) {
        return headers
    }
    return {
        headers,
        params: {
            comm: { // 基础信息
                "cv": cv + "",
                "ct": ct + "",
                "format": "json",
                "inCharset": "utf-8",
                "outCharset": "utf-8",
                "notice": 0,
                "platform": "yqq.json", // wk_v15.json, h5
                "needNewCode": 1,
                "uin": cv,
                "g_tk_new_20200303": cv,
                "g_tk": cv,


                // APP信息相关？
                "tmeAppID": "qqmusiclight", // qqmusic
                "nettype": 'NETWORK_WIFI', // 网络状态？
                "tmeLoginType": "2", // 1-微信，2-QQ？
                "devicelevel": "31", // 装置等级？
                "os_ver": ct, // 系统版本
                "v": cv + "",


                // 账号信息相关？
                "qq": cv + "", // qq号
                "authst": tk, // 未知
                "tmeLoginMethod": "1",
                "fPersonality": "0",
                "phonetype": '0',
            }
        }
    }
};




// 音质参数
const qualityMap = {
    "low": {
        s: "M500",
        e: ".mp3",
    },
    "standard": {
        s: "M800",
        e: ".mp3",
    },
    "high": {
        s: "F000",
        e: ".flac",
    },
    "super": {
        s: "RS01",
        e: ".flac",
    },

    "size_24aac": {},
    "size_48aac": {
        s: "C200",
        e: ".m4a",
    },
    "size_96aac": {
        s: "C400",
        e: ".m4a",
    },
    "size_192aac": {
        s: "C600",
        e: ".m4a",
    },
    "size_128mp3": {
        s: "M500",
        e: ".mp3",
    },
    "size_320mp3": {
        s: "M800",
        e: ".mp3",
    },
    "size_96ogg": {
        s: "O400",
        e: ".ogg",
    },
    "size_192ogg": {
        s: "O600",
        e: ".ogg",
    },
    "size_ape": {
        s: "A000",
        e: ".ape",
    },
    "size_flac": {
        s: "F000",
        e: ".flac",
    },
    "size_hires": {
        s: "RS01",
        e: ".flac",
    },
    "size_new[2]": { // 杜比全景声?
        s: "Q001",
        e: ".flac",
    },
    "size_new[1]": { // 臻品全景声?
        s: "Q000",
        e: ".flac",
    },
    "size_new[0]": { // 臻品母带2.0
        s: "AI00",
        e: ".flac",
    },
    "size_360ra": {},
    "size_dolby": {},
    "size_dts": {},
    "size_try": { // 试听接口
        s: "RS02",
        e: ".mp3",
    }
};



// post请求
async function ajax(data = {}, headerx = {}) {
    let {
        headers,
        params
    } = getComm(headerx);
    let body = function(body) {
        if (data.req_1 != undefined) {
            body = Object.assign(data, body);
        } else {
            body.data = data;
        }
        return JSON.stringify(body)
    }(params);
    body = (await (0, axios_1.default)({
        url: "https://u6.y.qq.com/cgi-bin/musicu.fcg",
        method: "POST",
        data: body,
        headers: headers,
        xsrfCookieName: "XSRF-TOKEN",
        withCredentials: true,
    })).data || {};
    if (!data.req_1) {
        body = body.data || {};
    }
    return body.data || {};
}



// 排行分类
async function getTopLists() {
    let group1 = [];
    let group2 = await ajax({
        module: "musicToplist.ToplistInfoServer",
        method: "GetAll",
        param: {}
    });
    group2.group.map(_ => {
        let group3 = [];
        _.toplist.map(__ => {
            if (!/MV|畅销|有声/.test(__.title)) {
                group3.push({
                    id: __.topId,
                    description: __.intro.replace(/<br>/gi, "\n"),
                    title: __.title,
                    // period: __.period,
                    coverImg: __.headPicUrl || __.frontPicUrl,
                    content: 3
                });
            }
        });
        group1.push({
            title: _.groupName,
            data: group3
        });
    });
    return group1;
}



// 排行详情
async function getTopListDetail(topListItem, page = 1) {
    let _ = await ajax({
        module: "musicToplist.ToplistInfoServer",
        method: "GetDetail",
        param: {
            "topId": topListItem.id,
            "offset": (page - 1) * pageSize,
            "num": pageSize,
            "period": ""
        }
    });
    return Object.assign(Object.assign({}, topListItem), {
        isEnd: _.data.totalNum <= page * pageSize,
        musicList: _.songInfoList
            .map(formatMusicItem)
    });
}



// 歌单分类
async function getRecommendSheetTags() {
    let group1, group2 = [];
    let group3 = await ajax({
        module: "music.playlist.PlaylistSquare",
        method: "GetAllTag",
        param: {}
    });
    group3.v_group.map(_ => {
        if (_.group_id) {
            let name = _.group_name.replace('热门', '推荐');
            let group4 = [];
            (_.v_item || []).map(_ => {
                group4.push({
                    title: _.name.replace("歌单", ""),
                    id: _.id
                });
            });
            if (name == '推荐') {
                group4.push({
                    title: '最新',
                    id: 'new'
                }, {
                    title: '最热',
                    id: 'hot'
                }, {
                    title: '免费',
                    id: 3418
                });
                group1 = group4;
            } else {
                group2.push({
                    title: name,
                    data: group4
                });
            }
        }
    });
    return {
        pinned: group1,
        data: group2,
    };
}



// 歌单列表
async function getRecommendSheetsByTag(tag, page) {
    let _, t1 = tag === null || tag === void 0 || (tag && tag.id);
    if (t1 === "" || t1 === true) { // 推荐
        _ = await ajax({
            module: "music.playlist.PlaylistSquare",
            method: "GetRecommendWhole",
            param: {
                IsReqFeed: true,
                FeedReq: {
                    From: (page - 1) * pageSize,
                    Size: pageSize
                }
            }
        }, {
            Cookie: ""
        });
    } else if (t1 == 9527) { // ai
        _ = await ajax({
            module: 'music.playlist.AiPlCategory',
            method: 'get_ai_category_content',
            param: {
                category_id: 9527,
                size: pageSize,
                page: (page - 1),
                use_page: page
            }
        });
    } else if (t1 == 'new' || t1 == 'hot') { // 最新/最热
        _ = await ajax({
            module: 'playlist.PlayListPlazaServer',
            method: 'get_playlist_by_tag',
            param: {
                id: 10000000,
                sin: (page - 1) * pageSize,
                size: pageSize,
                order: t1 == 'new' ? 2 : 5,
                cur_page: page
            }
        });
    } else {
        _ = await ajax({
            module: 'playlist.PlayListCategoryServer',
            method: 'get_category_content',
            param: {
                titleid: +t1,
                caller: '0',
                category_id: +t1,
                size: pageSize,
                page: page - 1,
                use_page: 1,
            }
        });
    }
    _ = _.FeedRsp || _.content || _;
    let list1 = _.list || _.List || _.v_item || _.v_playlist || [];
    let list2 = [];
    let total1 = page * pageSize;
    let total2 = _.sum || _.total || _.total_cnt || _.FromLimit || (total1 - pageSize + list.length);

    list1.map(_ => {
        _ = _.Playlist ? _.Playlist.basic : _.basic || _;
        list2.push(formatSheetItem(_));
    });
    return {
        isEnd: total2 <= total1,
        data: list2,
    };
}



// 歌单详情
async function getMusicSheetInfo(sheet, page = 1) {
    let total1 = page * pageSize;
    let _ = await ajax({
        module: "music.srfDissInfo.aiDissInfo",
        method: "uniform_get_Dissinfo",
        param: {
            "disstid": +sheet.id,
            "enc_host_uin": "",
            "tag": 1,
            "userinfo": 1,
            "song_begin": total1 - pageSize,
            "song_num": pageSize,
            // "orderlist": 1,
            // "onlysonglist": 0,
        }
    });
    let musicList = _.songlist || [];
    let total2 = _.songnum || _.total_song_num || (total1 - pageSize + musicList.length);
    if (musicList.length == total2) total2 = 1;
    return {
        isEnd: total2 <= total1,
        musicList: musicList.map(formatMusicItem)
    };
}



// 匹配歌单链接
async function importMusicSheet(urlLike) {
    let id = (urlLike.match(/^(\d+)$/) || [])[1];
    if (!urlLike.match(/y\.qq\.com|(music|wx\.y)\.gtimg\.cn/i)) {
        return false;
    }
    if (!id) {
        id = (urlLike.match(/.*(\/details\/.*id=|\/playlist\/|playlist_v2.*?[\?&]id=)(\d+)/i) || [])[2];
    }
    if (!id) {
        return false;
    }

    // 手动遍历歌单数据
    let e = 0;
    let page = 1;
    let list = [];
    do {
        try {
            let {
                isEnd,
                musicList
            } = await getMusicSheetInfo({
                id
            }, page);
            list.push(...musicList);
            if (isEnd) {
                break;
            }
        } catch (err) {
            if (e > 3) {
                break;
            } else {
                page--;
                e++;
            }
        }
    } while (page++);
    return list;
}



// 搜索内容
async function search(query, page, type) {
    let _type = {
        music: {
            type: 0,
            path: "item_song"
        },
        album: {
            type: 2,
            path: "item_album"
        },
        sheet: {
            type: 3,
            path: "item_songlist"
        },
        artist: {
            type: 1,
            path: "singer"
        },
        lyric: {
            type: 7,
            path: "item_song"
        }
    }[type];
    let _ = await ajax({
        module: "music.search.SearchCgiService",
        method: "DoSearchForQQMusicLite", // DoSearchForQQMusicDesktop
        param: {
            // "remoteplace": "txt.yqq.top", // txt.mqq.all
            // "searchid": R(17,"1234567890"),
            "query": query,
            "search_type": _type.type,
            "num_per_page": pageSize,
            "page_num": page,
            "nqc_flag": 0,
            "grp": 1
        }
    });

    let list = _.body[_type.path] || [];
    let total1 = page * pageSize;
    let total2 = _.meta.sum || (total1 - pageSize + list.length);
    if (type === "music") {
        list = list.map(formatMusicItem)
    } else if (type === "album") {
        list = list.map(formatAlbumItem);
    } else if (type === "artist") {
        list = list.map((_) => ({
            name: _.singerName,
            id: _.singerID,
            singerMID: _.singerMID,
            avatar: _.singerPic,
            worksNum: _.songNum,
        }));
    } else if (type === "sheet") {
        list = list.map(formatSheetItem);
    } else if (type === "lyric") {
        list = list.map((it) => (Object.assign(formatMusicItem(it), {
            rawLrcTxt: it.content
        })));
    }

    return {
        isEnd: total2 <= total1,
        data: list,
    };
}



// 专辑详情
async function getAlbumInfo(albumItem) {
    let _ = await ajax({
        module: "music.musichallAlbum.AlbumSongList",
        method: "GetAlbumSongList",
        param: {
            "albumMid": albumItem.albumMID,
            "order": 2,
            "begin": 0,
            "num": -1
        },
    });
    return {
        musicList: _.songList
            .map((item) => formatMusicItem(item.songInfo))
    };
}



// 歌手详情
async function getArtistWorks(artistItem, page, type) {
    let param, order = type === "music" ? 1 : 0;
    if (order) {
        param = {
            module: "musichall.song_list_server",
            method: "GetSingerSongList"
        }
    } else {
        param = {
            module: "music.musichallAlbum.AlbumListServer",
            method: "GetAlbumList"
        }
    }
    param.param = {
        "singerMid": artistItem.singerMID,
        "order": order,
        "begin": (page - 1) * pageSize,
        "num": pageSize,
        // "songNumTag": 0,
        // "singerID": 0
    }
    let _ = await ajax(param);
    let list = _[order ? "songList" : "albumList"] || [];
    let total1 = page * pageSize;
    let total2 = _.totalNum || _.total || (total1 - pageSize + list.length);
    if (order) {
        list = list.map((item) => formatMusicItem(item.songInfo));
    } else {
        list = list.map(formatAlbumItem);
    };
    return {
        isEnd: total2 <= total1,
        data: list
    };
}



// 获取歌词
async function getLyric(musicItem) {
    let res = (
        await axios_1.default.get(`http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${musicItem.songmid}&pcachetime=${new Date().getTime()}&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&format=json&nobase64=1`, {
            headers: getComm({}, true)
        })
    ).data;
    return {
        rawLrc: res.lyric,
    };
}



// 从平台获取链接
async function getMediaSource(musicItem, quality = 'low') {
    let url, rawLrc, artwork;
    let {
        uin,
        isLogin
    } = getLogin();

    // 获取歌曲支持的最大音质
    let qualitys = ["low", "standard", "high", "super"];
    let ii = qualitys.indexOf(quality);
    for (; ii >= musicItem.qualitys.length; ii--) {};
    quality = qualitys[ii];

    try {
        if (!isLogin && musicItem.content == "1") {
            throw new Error('is vip music');
        }
        let guid = (Math.random() * 10000000).toFixed(0);
        let songId = musicItem.songmid;
        let strMediaMid = musicItem.strMediaMid; // songId | vs[4] | vs[3]
        let id = ""; // songId
        let typeObj = qualityMap[quality];
        let filename = `${typeObj.s}${id}${strMediaMid}${typeObj.e}`;
        let __ = await ajax({
            module: "vkey.GetVkeyServer", // music.vkey.GetVkey
            method: "CgiGetVkey", // GetUrl
            param: {
                "guid": guid,
                "platform": "20",
                "filename": [filename],
                "songmid": [songId],
                "songtype": [0],
                "uin": (uin || "") + "",
                "loginflag": 1
            }
        });
        url = __.midurlinfo[0].purl;
        if (url && url != "") {
            url = __.sip[0] + url;
        } else {
            throw new Error('no get purl');
        }
    } catch (isVipMusic) { // 没有登录 / 登录过期 / 没有会员
        return await getMediaJiexi(musicItem, ii);
    }
    return {
        artwork,
        rawLrc,
        url,
    }
}



// 从解析获取链接 (lx-music-api-server)
// 基于 https://github.com/lxmusics/lx-music-api-server 实现的两个公益音源
async function getMediaJiexi(musicItem, quality = 0) {
    let url, rawLrc, artwork, res, qualitys = ["128k", "320k", "flac", "flac24bit"];
    try { // By: ikun0014
        // 反馈群组: https://t.me/ikunshare_qun
        // MusicFree: https://mf.ikunshare.com/plugins.json
        // LX Music: https://lxmusic.ikunshare.com/script
        res = (
            await axios_1.default.get(`https://lxmusic.ikunshare.com/url/tx/${musicItem.songmid}/${qualitys[quality]}`)
        ).data;
        url = res.data;
    } catch (err1) {
        try { // By: Huibq
            // 反馈群组：https://t.me/+Xh7BWUUPqUZlMDU1
            // MusicFree: https://raw.niuma666bet.buzz/Huibq/keep-alive/master/Music_Free/myPlugins.json
            // LX Music: https://raw.niuma666bet.buzz/Huibq/keep-alive/master/render_api.js
            res = (
                await axios_1.default.get(`https://lxmusicapi.onrender.com/url/tx/${musicItem.songmid}/${qualitys[quality>1?1:quality]}`, {
                    headers: {
                        "X-Request-Key": "share-v2"
                    }
                })
            ).data;
            url = res.url;
        } catch (err2) { // 无法解析 (数字专辑/资源错误)
            return null;
        }
    }
    return {
        artwork,
        rawLrc,
        url,
    }
}



// 返回函数
module.exports = {
    platform: "QQ音乐",
    author: '反馈Q群@365976134',
    version: "2024.12.02",
    // srcUrl: "",
    cacheControl: "no-cache",
    description: "支持配置会员Cookie",
    userVariables: [{
            key: "uin",
            name: "uin",
        },
        {
            key: "qm_keyst",
            name: "qm_keyst",
        }
    ],
    hints: {
        importMusicSheet: [
            "QQ音乐APP：自建歌单-分享-分享到微信好友/QQ好友；然后点开并复制链接，直接粘贴即可",
            "H5：复制URL并粘贴，或者直接输入纯数字歌单ID即可",
            "导入时间和歌单大小有关，请耐心等待",
        ]
    },
    primaryKey: ['id', 'songmid'],
    supportedSearchType: ["music", "album", "sheet", "artist", "lyric"],
    search,
    getMediaSource,
    getLyric,
    getAlbumInfo,
    getArtistWorks,
    importMusicSheet,
    getTopLists,
    getTopListDetail,
    getRecommendSheetTags,
    getRecommendSheetsByTag,
    getMusicSheetInfo
};