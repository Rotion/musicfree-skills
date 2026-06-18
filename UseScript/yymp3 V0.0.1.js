const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.yymp3.com';

module.exports = {
    platform: "YYMP3音乐搜索",
    version: "0.0.1",
    author: 'Rotion',
    type: 'music',
    cacheControl: "no-cache",
    name: 'YYMP3音乐搜索',
    type: 'music',
    supportedSearchType: ['music'],
    
    async search(query, page, type) {
        if (type !== 'music') return { isEnd: true, data: [] };
        try {
            const res = await axios.post(`${BASE_URL}/search/`, {
                key: query,
                tp: 1
            }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const $ = cheerio.load(res.data);
            const songs = [];
            
            // 查找歌曲链接
            const links = $('a');
            links.each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/Play/')) {
                    const match = href.match(/\/Play\/(\d+)\/(\d+)\.htm/);
                    if (match) {
                        const artistId = match[1];
                        const songId = match[2];
                        const text = $(el).text().trim();
                        if (text && !text.includes('试听') && !text.includes('歌词')) {
                            const parts = text.split(' - ');
                            const title = parts.length > 1 ? parts[parts.length - 1].trim() : text;
                            const artist = parts.length > 1 ? parts[0].trim() : '未知';
                            songs.push({ 
                                id: `${artistId}_${songId}`, 
                                title, 
                                artist, 
                                album: '', 
                                artwork: '', 
                                duration: 0 
                            });
                        }
                    }
                }
            });
            
            // 去重
            const uniqueSongs = songs.filter((song, index, self) => 
                index === self.findIndex(s => s.id === song.id)
            );
            
            return { isEnd: uniqueSongs.length < 20, data: uniqueSongs.slice(0, 40) };
        } catch (e) {
            console.error('搜索失败:', e.message);
            return { isEnd: true, data: [] };
        }
    },
    
    async getMediaSource(musicItem, quality) {
        const [artistId, songId] = musicItem.id.split('_');
        try {
            const res = await axios.get(`${BASE_URL}/Play/${artistId}/${songId}.htm`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            // 提取歌曲数据
            const songDataMatch = res.data.match(/\$song_data\[0\]="([^"]+)"/);
            if (!songDataMatch) throw new Error('无法获取歌曲数据');
            
            const songInfo = songDataMatch[1].split('|');
            // 格式: song_id|song_name|artist_id|artist_name|file_path|album_id||
            const filePath = songInfo[4];
            if (!filePath) throw new Error('无法获取音频路径');
            
            // 使用 ting9.yymp3.com 域名并将 .wma 转换为 .mp3
            const audioUrl = `https://ting9.yymp3.com/${filePath.replace('.wma', '.mp3')}`;
            return { url: audioUrl, headers: { 'Referer': BASE_URL } };
        } catch (e) {
            console.error('获取音频失败:', e.message);
            throw new Error('无法获取音频链接');
        }
    },
    
    async getLyric(musicItem) {
        const [artistId, songId] = musicItem.id.split('_');
        try {
            const res = await axios.get(`${BASE_URL}/Play/${artistId}/${songId}.htm`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            // 提取歌词数据（从HTML注释中）
            const lyricMatch = res.data.match(/<!--([\s\S]*?)-->/);
            if (!lyricMatch) return { rawLrc: '' };
            
            const lyricContent = lyricMatch[1];
            if (!lyricContent.includes('onclick="To(')) return { rawLrc: '' };
            
            // 解析时间戳格式的歌词
            const lrcLines = [];
            const timeTagRegex = /<div id="T_(\d+)" onclick="To\('\d+'\)">([^<]+)<\/div>/g;
            let match;
            
            while ((match = timeTagRegex.exec(lyricContent)) !== null) {
                const time = parseInt(match[1]);
                const text = match[2].trim();
                if (text) {
                    const minutes = Math.floor(time / 60);
                    const seconds = time % 60;
                    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    lrcLines.push(`[${formattedTime}]${text}`);
                }
            }
            
            return { rawLrc: lrcLines.join('\n') };
        } catch (e) {
            console.error('获取歌词失败:', e.message);
            return { rawLrc: '' };
        }
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
            
            // 获取排行榜链接
            const links = $('a');
            links.each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.includes('/top/') && text) {
                    const match = href.match(/\/top\/([^.]+)\.html?/);
                    if (match && !lists.find(l => l.id === match[1])) {
                        lists.push({ id: match[1], title: text, artwork: '' });
                    }
                }
            });
            
            return [{ title: '热门榜单', data: lists.slice(0, 10) }];
        } catch (e) {
            console.error('获取排行榜失败:', e.message);
            return [];
        }
    },
    
    async getTopListDetail(topListItem, page) {
        try {
            const res = await axios.get(`${BASE_URL}/top/${topListItem.id}.htm`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL
                }
            });
            
            const $ = cheerio.load(res.data);
            const songs = [];
            
            // 查找歌曲链接
            const links = $('a');
            links.each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('/Play/')) {
                    const match = href.match(/\/Play\/(\d+)\/(\d+)\.htm/);
                    if (match) {
                        const artistId = match[1];
                        const songId = match[2];
                        const text = $(el).text().trim();
                        if (text && !text.includes('试听') && !text.includes('歌词') && !text.includes('更多')) {
                            const parts = text.split(' - ');
                            const title = parts.length > 1 ? parts[parts.length - 1].trim() : text;
                            const artist = parts.length > 1 ? parts[0].trim() : '未知';
                            songs.push({ 
                                id: `${artistId}_${songId}`, 
                                title, 
                                artist, 
                                album: '', 
                                artwork: '', 
                                duration: 0 
                            });
                        }
                    }
                }
            });
            
            // 去重
            const uniqueSongs = songs.filter((song, index, self) => 
                index === self.findIndex(s => s.id === song.id)
            );
            
            return { isEnd: uniqueSongs.length < 20, musicList: uniqueSongs.slice(0, 40), topListItem };
        } catch (e) {
            console.error('获取排行榜详情失败:', e.message);
            return { isEnd: true, musicList: [], topListItem };
        }
    }
};