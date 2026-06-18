/* MusicFree 插件 - 36DJ 舞曲网 */
module.exports = {
    platform: '36DJ舞曲',
    version: '1.0.0',
    author: '36dj.com',
    srcUrl: 'https://www.36dj.com/',
    cacheControl: 'no-cache',
    supportedSearchType: ['music'],

    _UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    _audioServer: 'https://tn1.72djapp.cn/',
    _referer: 'https://www.36dj.com/',

    _TOP_GROUPS: [
        {
            title: '分类舞曲',
            data: [
                { id: 'xc', title: '新潮舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'zw', title: '中文舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' },
                { id: 'my', title: '慢摇舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'yw', title: '英文舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' },
                { id: 'html/new', title: '最新舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'html/good', title: '推荐舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' }
            ]
        },
        {
            title: '热门榜单',
            data: [
                { id: 'top', title: 'DJ舞曲榜', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'top/dianyin', title: '电音', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' },
                { id: 'top/nvsheng', title: '女声DJ', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'top/chezaidj', title: '车载DJ', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' },
                { id: 'top/zwdjcs', title: '全中文', artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg' },
                { id: 'top/yingwendj', title: '英文舞曲', artwork: 'https://img.72djapp.cn/images/36tu/pc302.jpg' }
            ]
        }
    ],

    async search(query, page, type) {
        if (type !== 'music') {
            return { isEnd: true, data: [] };
        }

        try {
            const $ = await this._postSearch(query);
            const songs = this._parseSongList($);
            const isEnd = songs.length < 10 || !this._hasNextPage($);

            return {
                isEnd: isEnd,
                data: songs.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist || '36DJ',
                    album: '36DJ舞曲',
                    artwork: 'https://img.72djapp.cn/images/36tu/pc201.jpg'
                }))
            };
        } catch (e) {
            console.error('[36DJ] search error:', e.message);
            return { isEnd: true, data: [] };
        }
    },

    async getMediaSource(musicItem, quality) {
        try {
            const detailHtml = await this._fetch(
                'https://www.36dj.com/play/' + musicItem.id + '.html',
                { headers: { 'User-Agent': this._UA, 'Referer': this._referer } }
            );

            const infoMatch = detailHtml.match(/"playurl"\s*:\s*"([^"]+)"/);
            if (!infoMatch || !infoMatch[1]) {
                throw new Error('playurl not found');
            }

            const playurl = infoMatch[1];
            const url = this._audioServer + playurl;

            return {
                url: url,
                headers: {
                    'User-Agent': this._UA,
                    'Referer': this._referer
                }
            };
        } catch (e) {
            console.error('[36DJ] getMediaSource error:', e.message);
            return { url: '' };
        }
    },

    async getLyric(musicItem) {
        try {
            const detailHtml = await this._fetch(
                'https://www.36dj.com/play/' + musicItem.id + '.html',
                { headers: { 'User-Agent': this._UA, 'Referer': this._referer } }
            );

            const nameMatch = detailHtml.match(/var\s+music_name\s*=\s*"([^"]+)"/);
            const songName = nameMatch ? nameMatch[1] : musicItem.title;

            let lyricText = '[00:00.00] ' + songName + '\n';
            lyricText += '[00:03.00] 来源: 36DJ舞曲网\n';
            lyricText += '[00:06.00] 类型: DJ 舞曲\n';
            lyricText += '[00:10.00] 此歌曲为 DJ 混音作品\n';
            lyricText += '[00:14.00] 享受音乐节拍\n';

            const infoMatch = detailHtml.match(/var\s+info\s*=\s*(\{[^;]+\})/);
            if (infoMatch) {
                lyricText += '[00:18.00] info: ' + infoMatch[1].replace(/[\r\n]/g, ' ').substring(0, 60) + '\n';
            }

            return {
                rawLrc: lyricText
            };
        } catch (e) {
            console.error('[36DJ] getLyric error:', e.message);
            return { rawLrc: '' };
        }
    },

    async getMusicInfo(musicItem) {
        return {};
    },

    async getTopLists() {
        return this._TOP_GROUPS;
    },

    async getTopListDetail(topListItem, page) {
        try {
            const id = topListItem.id;
            const pageUrl = page > 1
                ? 'https://www.36dj.com/' + id + '/index_' + page + '.html'
                : 'https://www.36dj.com/' + id + '/';

            const html = await this._fetch(pageUrl, {
                headers: { 'User-Agent': this._UA, 'Referer': this._referer }
            });

            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            const songs = this._parseSongList($);
            const isEnd = songs.length < 10 || !this._hasNextPage($);

            return {
                isEnd: isEnd,
                musicList: songs.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist || '36DJ',
                    album: '36DJ舞曲',
                    artwork: topListItem.artwork || 'https://img.72djapp.cn/images/36tu/pc201.jpg'
                })),
                topListItem: {
                    title: topListItem.title,
                    artwork: topListItem.artwork
                }
            };
        } catch (e) {
            console.error('[36DJ] getTopListDetail error:', e.message);
            return { isEnd: true, musicList: [], topListItem: { title: topListItem.title, artwork: '' } };
        }
    },

    async _fetch(url, options) {
        try {
            const axios = require('axios');
            const res = await axios.get(url, Object.assign({ timeout: 15000 }, options));
            return res.data;
        } catch (e) {
            console.error('[36DJ] _fetch error:', url, e.message);
            throw e;
        }
    },

    async _postSearch(query) {
        const axios = require('axios');
        const res = await axios.post(
            'https://www.36dj.com/e/search/index.php',
            'classid=1&keyboard=' + encodeURIComponent(query) + '&show=title&tempid=1',
            {
                headers: {
                    'User-Agent': this._UA,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': this._referer
                },
                timeout: 15000
            }
        );
        const cheerio = require('cheerio');
        return cheerio.load(res.data);
    },

    _parseSongList($) {
        const songs = [];
        const seenIds = new Set();

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const match = href.match(/\/play\/(\d+)\.html$/);
            if (!match) return;

            const id = match[1];
            if (seenIds.has(id)) return;
            seenIds.add(id);

            let title = $(el).text().trim();
            if (!title || title.length < 2) return;

            let artist = '36DJ';
            const parentLi = $(el).closest('li');
            if (parentLi.length > 0) {
                const emTexts = parentLi.find('em').map((j, emEl) => $(emEl).text().trim()).get();
                for (const t of emTexts) {
                    if (t && t.length > 1 && t.length < 20 && !t.match(/^\d+/) && !t.match(/^\d+\.\d+/) && !t.match(/\d+掳/)) {
                        artist = t;
                        break;
                    }
                }
            }

            songs.push({
                id: id,
                title: title.substring(0, 200),
                artist: artist
            });

            if (songs.length >= 50) return false;
        });

        return songs;
    },

    _hasNextPage($) {
        let hasNext = false;
        $('a').each((i, el) => {
            const text = $(el).text();
            const href = $(el).attr('href');
            if (text && (text.includes('下一页') || text.includes('next'))) {
                hasNext = true;
                return false;
            }
            if (href && href.match(/index[_]?\d+\.html/)) {
                hasNext = true;
            }
        });
        return hasNext;
    }
};
