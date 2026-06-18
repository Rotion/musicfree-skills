const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.djyyy.com';

module.exports = {
    platform: "DJ耶耶耶",
    version: "0.0.1",
    author: 'Rotion',
    type: 'music',
    cacheControl: "no-cache",
    name: 'DJ耶耶耶',
    type: 'music',
    supportedSearchType: ['music'],
    
    async search(query, page, type) {
        if (type !== 'music') return { isEnd: true, data: [] };
        try {
            const res = await axios.get(`${BASE_URL}/search.php`, {
                params: {
                    key: query,
                    ac: 'dj'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            const $ = cheerio.load(res.data);
            const songs = [];
            
            $('ul li[data-id]').each((i, el) => {
                const $li = $(el);
                const id = $li.attr('data-id');
                const url = $li.find('a[href*="/play/"]').attr('href');
                if (id && url) {
                    const title = $li.find('a[href*="/play/"] span font').text().trim() || 
                                  $li.find('a[href*="/play/"]').text().trim();
                    const durationStr = $li.find('span').eq(2).text().trim();
                    let duration = 0;
                    if (durationStr) {
                        const parts = durationStr.split(':');
                        if (parts.length === 3) {
                            duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                        } else if (parts.length === 2) {
                            duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        }
                    }
                    songs.push({ 
                        id: String(id), 
                        title, 
                        artist: '未知', 
                        album: '', 
                        artwork: '', 
                        duration 
                    });
                }
            });
            
            return { isEnd: songs.length < 20, data: songs.slice(0, 40) };
        } catch (e) {
            return { isEnd: true, data: [] };
        }
    },
    
    async getMediaSource(musicItem, quality) {
        try {
            // 1. 获取播放页面
            const songUrl = `${BASE_URL}/play/${musicItem.id}.html`;
            const res = await axios.get(songUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            // 2. 查找神秘脚本URL
            const tScriptMatch = res.data.match(/src="(\/t\/[^"]+)"/);
            if (!tScriptMatch) throw new Error('无法获取播放脚本');
            
            const tScriptUrl = `${BASE_URL}${tScriptMatch[1]}`;
            
            // 3. 获取脚本内容（包含音频URL）
            const scriptRes = await axios.get(tScriptUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': songUrl
                }
            });
            
            // 4. 提取音频URL
            const playUrlMatch = scriptRes.data.match(/playurl\s*=\s*['"]([^'"]+)['"]/);
            if (!playUrlMatch) throw new Error('无法获取音频链接');
            
            let audioUrl = playUrlMatch[1];
            // 处理转义字符
            audioUrl = audioUrl.replace(/\\\//g, '/');
            // 解码Unicode字符
            audioUrl = audioUrl.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            });
            
            return { url: audioUrl, headers: { 'Referer': songUrl } };
        } catch (e) {
            throw new Error('无法获取音频链接');
        }
    },
    
    async getLyric(musicItem) {
        return { rawLrc: '' };
    },
    
    async getTopLists() {
        try {
            const res = await axios.get(BASE_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            const $ = cheerio.load(res.data);
            const lists = [];
            
            // 获取导航菜单中的分类作为排行榜
            $('.nav li a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.startsWith('/') && text && !text.includes('首页') && !text.includes('会员')) {
                    // 提取ID
                    const idMatch = href.match(/\/([^/]+)\/x_1\.html/);
                    const id = idMatch ? idMatch[1] : href.replace('/', '');
                    if (!lists.find(l => l.id === id)) {
                        lists.push({ id, title: text, artwork: '' });
                    }
                }
            });
            
            return [{ title: 'DJ分类', data: lists.slice(0, 10) }];
        } catch (e) {
            return [];
        }
    },
    
    async getTopListDetail(topListItem, page) {
        try {
            const url = `${BASE_URL}/${topListItem.id}/x_${page}.html`;
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            const $ = cheerio.load(res.data);
            const songs = [];
            
            $('ul li[data-id]').each((i, el) => {
                const $li = $(el);
                const id = $li.attr('data-id');
                const url = $li.find('a[href*="/play/"]').attr('href');
                if (id && url) {
                    const title = $li.find('a[href*="/play/"] font').text().trim() || 
                                  $li.find('a[href*="/play/"]').text().trim();
                    const durationStr = $li.find('span').eq(2).text().trim();
                    let duration = 0;
                    if (durationStr) {
                        const parts = durationStr.split(':');
                        if (parts.length === 3) {
                            duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                        } else if (parts.length === 2) {
                            duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        }
                    }
                    songs.push({ 
                        id: String(id), 
                        title, 
                        artist: '未知', 
                        album: '', 
                        artwork: '', 
                        duration 
                    });
                }
            });
            
            return { isEnd: songs.length < 20, musicList: songs.slice(0, 40), topListItem };
        } catch (e) {
            return { isEnd: true, musicList: [], topListItem };
        }
    }
};