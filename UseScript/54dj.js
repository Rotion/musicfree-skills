/* MusicFree 插件 - 54DJ 舞曲网 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE_URL = 'https://www.54dj.com';
const REFERER = BASE_URL + '/';

const TOP_CATEGORIES = [
    { title: '热门分类', data: [
        { id: 'forum/category-41', name: '中文串烧', cover: '' },
        { id: 'forum/category-1', name: '深圳串烧', cover: '' },
        { id: 'forum/category-3', name: '深圳中文', cover: '' },
        { id: 'forum/category-2', name: 'Bounce', cover: '' },
        { id: 'forum/category-36', name: 'HOUSE', cover: '' },
        { id: 'forum/category-48', name: 'Electro', cover: '' },
    ]},
    { title: '风格专区', data: [
        { id: 'forum/category-44', name: '越南专区', cover: '' },
        { id: 'forum/category-46', name: 'Vina House', cover: '' },
        { id: 'forum/category-45', name: 'Lak House', cover: '' },
        { id: 'forum/category-37', name: '中文舞曲', cover: '' },
        { id: 'forum/category-35', name: '外文舞曲', cover: '' },
        { id: 'forum/category-30', name: '经典怀旧', cover: '' },
    ]},
    { title: '榜单推荐', data: [
        { id: 'ranks', name: 'DJ舞曲榜', cover: '' },
        { id: 'cate/exclusive', name: '首发推荐', cover: '' },
        { id: 'albums', name: '热门专辑', cover: '' },
        { id: 'playlists', name: 'DJ歌单', cover: '' },
        { id: 'forum/category-42', name: '现场串烧', cover: '' },
        { id: 'forum/category-24', name: '中英文串烧', cover: '' },
    ]},
];

async function _fetch(url, options = {}) {
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': UA,
                'Referer': options.referer || REFERER,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
            timeout: options.timeout || 20000,
            maxRedirects: 5,
        });
        return res.data;
    } catch (err) {
        console.error('[54DJ] fetch error:', url, err.message);
        return '';
    }
}

function _parseTrackList($) {
    const songs = [];
    const seen = new Set();

    $('.track-list-item').each((i, el) => {
        const $el = $(el);
        const idText = $el.find('.track-list-number').text().trim();
        const id = idText.match(/\d+/) ? idText.match(/\d+/)[0] : '';
        const titleEl = $el.find('.track-list-name-text');
        const title = titleEl.text().trim();
        const href = titleEl.attr('href') || '';
        const category = $el.find('a[href*="forum/category"]').text().trim();
        const infoSpans = $el.find('.track-list-name-bt span').map((j, sp) => $(sp).text().trim()).get();
        const coverEl = $el.find('img');
        const cover = coverEl.attr('data-src') || coverEl.attr('src') || '';

        if (!id || !title || seen.has(id)) return;
        seen.add(id);

        songs.push({
            id,
            title: title.replace(/\s+/g, ' '),
            artist: category || '54DJ',
            cover: cover && !cover.startsWith('data:') ? cover : '',
            album: infoSpans.filter(s => s && s.length < 30).slice(0, 2).join(' '),
            href,
        });
    });

    return songs;
}

function _extractListenUrl(html) {
    const m = html.match(/listenUrl\s*:\s*["']([^"']+?)["']/i);
    if (m) return m[1];

    const m2 = html.match(/https?:\/\/cdn\.54dj\.vip[^"'<>\s]+\.(?:m4a|mp3|ogg)/i);
    if (m2) return m2[0];

    return '';
}

function _extractSongId(idStr) {
    if (!idStr) return '';
    // 优先匹配末尾的数字（如 "54dj_92305" → "92305"）
    const m = idStr.match(/(\d+)$/);
    if (m) return m[1];
    // 回退：匹配第一串数字
    const m2 = idStr.match(/\d+/);
    return m2 ? m2[0] : '';
}

function _hasNextPage($) {
    let hasNext = false;
    $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if ((text === '下一页' || text.includes('»') || text === 'next' ||
             (href.includes('page=') && (text === '»' || text.match(/^\d+$/)))) ) {
            hasNext = true;
        }
    });
    return hasNext;
}

module.exports = {
    platform: '54DJ舞曲',
    version: '1.0.0',
    author: '54dj.com',
    srcUrl: BASE_URL,
    cacheControl: 'no-cache',
    supportedSearchType: ['music'],

    async search(query, page, type) {
        if (type && type !== 'music') {
            return { isEnd: true, data: [] };
        }

        try {
            const url = BASE_URL + '/searches?q=' + encodeURIComponent(query) + '&page=' + (page || 1);
            const html = await _fetch(url);
            if (!html) return { isEnd: true, data: [] };

            const $ = cheerio.load(html);
            const rawSongs = _parseTrackList($);

            const data = rawSongs.slice(0, 50).map(s => ({
                id: '54dj_' + s.id,
                title: s.title,
                artist: s.artist,
                album: s.album,
                artwork: s.cover,
                url: s.href || (BASE_URL + '/topics/' + s.id),
                rawLrc: '',
            }));

            const hasNext = _hasNextPage($) && rawSongs.length >= 10;
            return { isEnd: !hasNext, data };
        } catch (err) {
            console.error('[54DJ] search error:', err.message);
            return { isEnd: true, data: [] };
        }
    },

    async getMediaSource(musicItem, quality) {
        try {
            let songId = _extractSongId(musicItem.id);

            if (!songId && musicItem.url) {
                const m = musicItem.url.match(/\/topics\/(\d+)/);
                if (m) songId = m[1];
            }

            if (!songId) {
                return { url: '' };
            }

            const detailUrl = BASE_URL + '/topics/' + songId;
            const html = await _fetch(detailUrl, { referer: REFERER });
            if (!html) return { url: '' };

            const audioUrl = _extractListenUrl(html);
            if (!audioUrl) {
                return { url: '' };
            }

            return {
                url: audioUrl,
                headers: {
                    'User-Agent': UA,
                    'Referer': REFERER,
                },
            };
        } catch (err) {
            console.error('[54DJ] getMediaSource error:', err.message);
            return { url: '' };
        }
    },

    async getLyric(musicItem) {
        return {
            rawLrc: '[ti:' + (musicItem.title || '') + ']\n[ar:' + (musicItem.artist || '54DJ') + ']\n[00:00.00]本歌曲来自 54DJ 舞曲网\n[00:03.00]舞曲试听版\n',
        };
    },

    async getMusicInfo(musicItem) {
        return {};
    },

    async getTopLists() {
        const result = [];
        for (const group of TOP_CATEGORIES) {
            result.push({
                title: group.title,
                data: group.data.map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.name,
                    cover: '',
                    playCount: 0,
                })),
            });
        }
        return result;
    },

    async getTopListDetail(topListItem, page) {
        try {
            const id = topListItem && topListItem.id ? topListItem.id : '';
            const name = topListItem && topListItem.name ? topListItem.name : '榜单';
            if (!id) return { isEnd: true, musicList: [], topListItem };

            const pageNum = page || 1;
            const url = BASE_URL + '/' + id + (id.includes('?') ? '&' : '?') + 'page=' + pageNum;

            const html = await _fetch(url);
            if (!html) return { isEnd: true, musicList: [], topListItem };

            const $ = cheerio.load(html);
            const rawSongs = _parseTrackList($);

            const musicList = rawSongs.slice(0, 50).map(s => ({
                id: '54dj_' + s.id,
                title: s.title,
                artist: s.artist,
                album: s.album,
                artwork: s.cover,
                url: s.href || (BASE_URL + '/topics/' + s.id),
                rawLrc: '',
            }));

            const hasNext = _hasNextPage($) && rawSongs.length >= 10;
            return {
                isEnd: !hasNext,
                musicList,
                topListItem,
            };
        } catch (err) {
            console.error('[54DJ] getTopListDetail error:', err.message);
            return { isEnd: true, musicList: [], topListItem };
        }
    },
};
