const axios = require('axios');
const cheerio = require('cheerio');
const BASE_URL = 'https://www.aaz.cx';
const PLAY_API = 'https://www.aaz.cx/js/play.php';

module.exports = {
    platform: "AAZ音乐搜索",
    version: "0.0.2",
    author: 'Rotion',
    name: 'AAZ音乐搜索',
    type: 'music',
    cacheControl: "no-cache",
    supportedSearchType: ['music'],
    
    async search(query, page, type) {
        if (type !== 'music') return { isEnd: true, data: [] };
        const url = `${BASE_URL}/so/${encodeURIComponent(query)}.html`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': BASE_URL
            }
        });
        const $ = cheerio.load(res.data);
        const songs = [];
        $('.lkmusic_list ul li').each((i, el) => {
            const $li = $(el);
            const url = $li.find('.pic a').attr('href');
            const idMatch = url.match(/\/m\/([a-f0-9]+)\.html/);
            if (!idMatch) return;
            const id = idMatch[1];
            const title = $li.find('.name .url').attr('title') || $li.find('.name .url').text();
            const artist = $li.find('.singer .sname').text() || $li.find('.singer').text();
            const artwork = $li.find('.pic img').attr('src');
            const durationStr = $li.find('.playtime').text();
            let duration = 0;
            if (durationStr) {
                const [m, s] = durationStr.split(':').map(Number);
                duration = m * 60 + s;
            }
            const parts = title.split(' - ');
            const songTitle = parts.length > 1 ? parts[parts.length - 1].trim() : title.trim();
            const songArtist = parts.length > 1 ? parts[0].trim() : (artist.trim() || '未知');
            songs.push({ id: String(id), title: songTitle, artist: songArtist, album: '', artwork, duration });
        });
        return { isEnd: songs.length < 40, data: songs };
    },
    
    async getMediaSource(musicItem, quality) {
        const res = await axios.post(PLAY_API, { id: musicItem.id, type: 'music' }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `${BASE_URL}/m/${musicItem.id}.html`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (!res.data || !res.data.url) throw new Error('无法获取音频链接');
        return { url: res.data.url, headers: { 'Referer': BASE_URL } };
    },
    
    async getLyric(musicItem) {
        try {
            const res = await axios.post(PLAY_API, { id: musicItem.id, type: 'music' }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `${BASE_URL}/m/${musicItem.id}.html`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });
            
            if (!res.data || !res.data.lrc || typeof res.data.lrc !== 'string') {
                return { rawLrc: '' };
            }
            
            const lrcUrl = res.data.lrc;
            if (!lrcUrl.startsWith('http')) {
                return { rawLrc: '' };
            }
            
            const lrcRes = await axios.get(lrcUrl, {
                headers: { 
                    'Referer': BASE_URL,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000,
                responseType: 'text'
            });
            
            let lrcContent = typeof lrcRes.data === 'string' ? lrcRes.data : '';
            
            if (lrcContent) {
                lrcContent = lrcContent.replace(/\r\n/g, '\n').trim();
                if (!lrcContent.startsWith('[')) {
                    lrcContent = '';
                }
            }
            
            return { rawLrc: lrcContent };
        } catch (e) {
            return { rawLrc: '' };
        }
    },
    
    async getTopLists() {
        const url = `${BASE_URL}/list/new.html`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(res.data);
        const lists = [];
        $('.ilingku_fl li a').each((i, el) => {
            const $a = $(el);
            const href = $a.attr('href');
            const idMatch = href.match(/\/list\/([a-z0-9]+)\.html/);
            if (!idMatch) return;
            lists.push({ id: idMatch[1], title: $a.text().trim(), artwork: '' });
        });
        return [{ title: '热门榜单', data: lists.slice(0, 10) }];
    },
    
    async getTopListDetail(topListItem, page) {
        const url = `${BASE_URL}/list/${topListItem.id}.html`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(res.data);
        const songs = [];
        $('.play_list ul li').each((i, el) => {
            const $li = $(el);
            const url = $li.find('.name a').attr('href');
            const idMatch = url.match(/\/m\/([a-f0-9]+)\.html/);
            if (!idMatch) return;
            const title = $li.find('.name a').attr('title') || $li.find('.name a').text();
            const parts = title.split(' - ');
            songs.push({ id: idMatch[1], title: parts.length > 1 ? parts[parts.length - 1].trim() : title.trim(), artist: parts.length > 1 ? parts[0].trim() : '未知', album: '', artwork: '', duration: 0 });
        });
        if (songs.length === 0) {
            $('.lkmusic_list ul li').each((i, el) => {
                const $li = $(el);
                const url = $li.find('.pic a').attr('href');
                const idMatch = url.match(/\/m\/([a-f0-9]+)\.html/);
                if (!idMatch) return;
                const title = $li.find('.name .url').attr('title') || $li.find('.name .url').text();
                const artist = $li.find('.singer .sname').text() || $li.find('.singer').text();
                const artwork = $li.find('.pic img').attr('src');
                const durationStr = $li.find('.playtime').text();
                let duration = 0;
                if (durationStr) {
                    const [m, s] = durationStr.split(':').map(Number);
                    duration = m * 60 + s;
                }
                const parts = title.split(' - ');
                songs.push({ id: idMatch[1], title: parts.length > 1 ? parts[parts.length - 1].trim() : title.trim(), artist: parts.length > 1 ? parts[0].trim() : (artist.trim() || '未知'), album: '', artwork, duration });
            });
        }
        return { isEnd: songs.length < 40, musicList: songs, topListItem: { title: topListItem.title, artwork: topListItem.artwork } };
    }
};
