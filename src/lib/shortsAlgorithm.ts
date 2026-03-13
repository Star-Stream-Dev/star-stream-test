/**
 * YouTube Recommendation Algorithm
 * 
 * Full-platform recommendation engine inspired by YouTube's actual algorithm.
 * Tracks user engagement signals across all YouTube features:
 * - Likes, dislikes, comments, subscribes
 * - Watch duration / completion rate  
 * - Skips (Shorts)
 * - Content variety (no same-creator repetition)
 * - Topic affinity learning over time
 * - Channel subscriptions boost
 * - Discovery factor for new content
 */

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  fetchedAt: number;
  topicTags: string[];
}

// Keep backward compat alias
export type ShortItem = VideoItem;

interface EngagementRecord {
  videoId: string;
  channelTitle: string;
  liked: boolean;
  disliked: boolean;
  commented: boolean;
  watchDurationMs: number;
  skipped: boolean;
  looped: boolean;
  topicTags: string[];
  timestamp: number;
}

interface TopicAffinity {
  topic: string;
  score: number; // -1 to 1
}

export interface AlgorithmState {
  engagementHistory: EngagementRecord[];
  topicAffinities: TopicAffinity[];
  channelAffinities: Record<string, number>;
  subscribedChannels: string[];
  lastShownChannels: string[];
  queryRotation: number;
  // Video-level engagement for UI state
  likedVideos: string[];
  dislikedVideos: string[];
  commentedVideos: string[];
}

const STORAGE_KEY_PREFIX = 'solarnova_yt_algo';
const LEGACY_KEY = 'solarnova_shorts_algo';
const MAX_HISTORY = 300;
const DIVERSITY_WINDOW = 5;

function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
}

// Search queries organized by topic category
const TOPIC_QUERIES: Record<string, string[]> = {
  comedy: ['funny shorts', 'comedy shorts', 'meme compilation shorts', 'funny videos', 'comedy videos'],
  music: ['music shorts', 'singing shorts', 'dance shorts', 'music videos', 'new music', 'top songs'],
  gaming: ['gaming shorts', 'game highlights shorts', 'gaming videos', 'gameplay', 'game review'],
  education: ['facts shorts', 'science shorts', 'did you know shorts', 'educational videos', 'how to', 'tutorial'],
  satisfying: ['satisfying shorts', 'oddly satisfying compilation', 'satisfying videos', 'asmr'],
  trending: ['trending shorts 2025', 'viral shorts today', 'trending videos', 'viral videos'],
  lifestyle: ['life hack shorts', 'cooking shorts', 'fitness shorts', 'recipe videos', 'workout videos'],
  nature: ['nature shorts', 'animal shorts', 'cute pets shorts', 'nature documentary', 'wildlife'],
  creative: ['art shorts', 'animation shorts', 'creative shorts', 'art timelapse', 'diy projects'],
  tech: ['tech shorts', 'gadget shorts', 'tech review', 'new technology', 'gadget review'],
  entertainment: ['movie trailer', 'tv show clips', 'celebrity', 'entertainment news'],
  sports: ['sports highlights', 'best plays', 'sports compilation', 'game highlights'],
};

const ALL_QUERIES = Object.values(TOPIC_QUERIES).flat();

/** Topic keyword matching */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  comedy: ['funny', 'comedy', 'meme', 'laugh', 'joke', 'prank', 'humor', 'hilarious', 'lol'],
  music: ['music', 'song', 'sing', 'dance', 'beat', 'rap', 'pop', 'rock', 'hip hop', 'album', 'lyric', 'mv', 'official video'],
  gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'roblox', 'gta', 'valorant', 'gameplay', 'playthrough', 'walkthrough'],
  education: ['fact', 'learn', 'science', 'history', 'how to', 'tutorial', 'explain', 'did you know', 'educational'],
  satisfying: ['satisfying', 'asmr', 'relaxing', 'soothing', 'compilation', 'calming'],
  trending: ['viral', 'trending', 'challenge', 'trend'],
  lifestyle: ['hack', 'recipe', 'cook', 'fitness', 'workout', 'routine', 'food', 'vlog', 'daily', 'morning'],
  nature: ['nature', 'animal', 'pet', 'dog', 'cat', 'wildlife', 'ocean', 'forest'],
  creative: ['art', 'draw', 'paint', 'animation', 'creative', 'design', 'diy', 'craft'],
  tech: ['tech', 'gadget', 'phone', 'computer', 'ai', 'robot', 'app', 'review', 'unbox'],
  entertainment: ['movie', 'film', 'trailer', 'show', 'celebrity', 'drama', 'series'],
  sports: ['sport', 'football', 'basketball', 'soccer', 'nba', 'nfl', 'goal', 'match'],
};

export function loadAlgorithmState(userId?: string): AlgorithmState {
  try {
    const key = getStorageKey(userId);
    // Try user-specific key first, fall back to legacy
    const stored = localStorage.getItem(key) || (!userId ? localStorage.getItem(LEGACY_KEY) : null);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate legacy state
      return {
        engagementHistory: parsed.engagementHistory || [],
        topicAffinities: parsed.topicAffinities || [],
        channelAffinities: parsed.channelAffinities || {},
        subscribedChannels: parsed.subscribedChannels || [],
        lastShownChannels: parsed.lastShownChannels || [],
        queryRotation: parsed.queryRotation || 0,
        likedVideos: parsed.likedVideos || [],
        dislikedVideos: parsed.dislikedVideos || [],
        commentedVideos: parsed.commentedVideos || [],
      };
    }
  } catch {}
  return {
    engagementHistory: [],
    topicAffinities: [],
    channelAffinities: {},
    subscribedChannels: [],
    lastShownChannels: [],
    queryRotation: 0,
    likedVideos: [],
    dislikedVideos: [],
    commentedVideos: [],
  };
}

function saveAlgorithmState(state: AlgorithmState, userId?: string): void {
  try {
    if (state.engagementHistory.length > MAX_HISTORY) {
      state.engagementHistory = state.engagementHistory.slice(-MAX_HISTORY);
    }
    if (state.likedVideos.length > 500) state.likedVideos = state.likedVideos.slice(-500);
    if (state.dislikedVideos.length > 500) state.dislikedVideos = state.dislikedVideos.slice(-500);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    // Clean up legacy key
    if (!userId) localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

/** Extract topic tags from a video title */
export function extractTopics(title: string): string[] {
  const lower = title.toLowerCase();
  const topics: string[] = [];
  
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      topics.push(topic);
    }
  }
  
  return topics.length > 0 ? topics : ['general'];
}

/** Record a user engagement event — works for both Shorts and regular videos */
export function recordEngagement(
  state: AlgorithmState,
  videoId: string,
  channelTitle: string,
  title: string,
  engagement: {
    liked?: boolean;
    disliked?: boolean;
    commented?: boolean;
    subscribed?: boolean;
    watchDurationMs?: number;
    skipped?: boolean;
    looped?: boolean;
  },
  userId?: string
): AlgorithmState {
  const topicTags = extractTopics(title);
  
  const existingIdx = state.engagementHistory.findIndex(r => r.videoId === videoId);
  const record: EngagementRecord = existingIdx >= 0 
    ? { ...state.engagementHistory[existingIdx] }
    : {
        videoId, channelTitle, liked: false, disliked: false, commented: false,
        watchDurationMs: 0, skipped: false, looped: false, topicTags, timestamp: Date.now(),
      };
  
  if (engagement.liked !== undefined) {
    record.liked = engagement.liked;
    if (engagement.liked) record.disliked = false; // mutual exclusion
  }
  if (engagement.disliked !== undefined) {
    record.disliked = engagement.disliked;
    if (engagement.disliked) record.liked = false;
  }
  if (engagement.commented) record.commented = true;
  if (engagement.watchDurationMs !== undefined) record.watchDurationMs = Math.max(record.watchDurationMs, engagement.watchDurationMs);
  if (engagement.skipped) record.skipped = true;
  if (engagement.looped) record.looped = true;
  record.timestamp = Date.now();
  
  const newHistory = existingIdx >= 0
    ? [...state.engagementHistory.slice(0, existingIdx), ...state.engagementHistory.slice(existingIdx + 1), record]
    : [...state.engagementHistory, record];
  
  const newAffinities = updateTopicAffinities(state.topicAffinities, topicTags, engagement);
  
  // Update channel affinities
  const newChannelAffinities = { ...state.channelAffinities };
  const channelScore = newChannelAffinities[channelTitle] || 0;
  let channelDelta = 0;
  if (engagement.liked) channelDelta += 0.3;
  if (engagement.disliked) channelDelta -= 0.4;
  if (engagement.commented) channelDelta += 0.2;
  if (engagement.subscribed) channelDelta += 0.5;
  if (engagement.skipped) channelDelta -= 0.2;
  if (engagement.looped) channelDelta += 0.2;
  if ((engagement.watchDurationMs || 0) > 5000) channelDelta += 0.1;
  newChannelAffinities[channelTitle] = Math.max(-1, Math.min(1, channelScore + channelDelta));
  
  // Update subscribed channels
  let newSubscribed = [...state.subscribedChannels];
  if (engagement.subscribed === true && !newSubscribed.includes(channelTitle)) {
    newSubscribed.push(channelTitle);
  }
  
  // Update liked/disliked/commented video lists
  let newLiked = [...state.likedVideos];
  let newDisliked = [...state.dislikedVideos];
  let newCommented = [...state.commentedVideos];
  
  if (engagement.liked === true) {
    if (!newLiked.includes(videoId)) newLiked.push(videoId);
    newDisliked = newDisliked.filter(id => id !== videoId);
  } else if (engagement.liked === false) {
    newLiked = newLiked.filter(id => id !== videoId);
  }
  
  if (engagement.disliked === true) {
    if (!newDisliked.includes(videoId)) newDisliked.push(videoId);
    newLiked = newLiked.filter(id => id !== videoId);
  } else if (engagement.disliked === false) {
    newDisliked = newDisliked.filter(id => id !== videoId);
  }
  
  if (engagement.commented && !newCommented.includes(videoId)) {
    newCommented.push(videoId);
  }
  
  const newState: AlgorithmState = {
    ...state,
    engagementHistory: newHistory,
    topicAffinities: newAffinities,
    channelAffinities: newChannelAffinities,
    subscribedChannels: newSubscribed,
    likedVideos: newLiked,
    dislikedVideos: newDisliked,
    commentedVideos: newCommented,
  };
  
  saveAlgorithmState(newState, userId);
  return newState;
}

/** Toggle subscribe to a channel */
export function toggleSubscribe(state: AlgorithmState, channelTitle: string): AlgorithmState {
  const isSubscribed = state.subscribedChannels.includes(channelTitle);
  const newSubscribed = isSubscribed
    ? state.subscribedChannels.filter(c => c !== channelTitle)
    : [...state.subscribedChannels, channelTitle];
  
  const newChannelAffinities = { ...state.channelAffinities };
  const current = newChannelAffinities[channelTitle] || 0;
  newChannelAffinities[channelTitle] = isSubscribed 
    ? Math.max(-1, current - 0.5)
    : Math.min(1, current + 0.5);
  
  const newState = {
    ...state,
    subscribedChannels: newSubscribed,
    channelAffinities: newChannelAffinities,
  };
  saveAlgorithmState(newState);
  return newState;
}

function updateTopicAffinities(
  current: TopicAffinity[],
  topics: string[],
  engagement: { liked?: boolean; disliked?: boolean; commented?: boolean; subscribed?: boolean; skipped?: boolean; looped?: boolean; watchDurationMs?: number }
): TopicAffinity[] {
  const affinityMap = new Map(current.map(a => [a.topic, a.score]));
  
  for (const topic of topics) {
    const existing = affinityMap.get(topic) || 0;
    let delta = 0;
    
    if (engagement.liked) delta += 0.15;
    if (engagement.disliked) delta -= 0.2;
    if (engagement.commented) delta += 0.1;
    if (engagement.subscribed) delta += 0.2;
    if (engagement.looped) delta += 0.1;
    if (engagement.skipped) delta -= 0.1;
    if ((engagement.watchDurationMs || 0) > 30000) delta += 0.1; // 30s+ for regular videos
    if ((engagement.watchDurationMs || 0) > 8000) delta += 0.05;
    if ((engagement.watchDurationMs || 0) < 2000 && !engagement.liked) delta -= 0.05;
    
    affinityMap.set(topic, Math.max(-1, Math.min(1, existing + delta)));
  }
  
  return Array.from(affinityMap.entries()).map(([topic, score]) => ({ topic, score }));
}

/** Get diversified search queries based on user preferences */
export function getRecommendedQueries(state: AlgorithmState, count: number = 3, shortsOnly: boolean = false): string[] {
  const affinityMap = new Map(state.topicAffinities.map(a => [a.topic, a.score]));
  
  const topicWeights: { topic: string; weight: number; queries: string[] }[] = [];
  
  for (const [topic, queries] of Object.entries(TOPIC_QUERIES)) {
    const affinity = affinityMap.get(topic) || 0;
    const weight = Math.max(0.1, 1 + affinity * 0.8);
    
    // Filter queries for shorts if needed
    const filteredQueries = shortsOnly 
      ? queries.filter(q => q.includes('shorts'))
      : queries;
    
    if (filteredQueries.length > 0) {
      topicWeights.push({ topic, weight, queries: filteredQueries });
    }
  }
  
  // Add subscribed channel queries as bonus
  if (!shortsOnly && state.subscribedChannels.length > 0) {
    const subQueries = state.subscribedChannels.slice(0, 5).map(c => `${c} latest`);
    topicWeights.push({ topic: '_subscribed', weight: 2, queries: subQueries });
  }
  
  const totalWeight = topicWeights.reduce((sum, t) => sum + t.weight, 0);
  const selected: string[] = [];
  const usedTopics = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let rand = Math.random() * totalWeight;
    for (const tw of topicWeights) {
      if (usedTopics.has(tw.topic)) continue;
      rand -= tw.weight;
      if (rand <= 0) {
        const query = tw.queries[Math.floor(Math.random() * tw.queries.length)];
        selected.push(query);
        usedTopics.add(tw.topic);
        break;
      }
    }
    if (selected.length <= i) {
      const all = shortsOnly ? ALL_QUERIES.filter(q => q.includes('shorts')) : ALL_QUERIES;
      selected.push(all[Math.floor(Math.random() * all.length)]);
    }
  }
  
  return selected;
}

/** Score and rank videos based on user preferences */
export function rankVideos(state: AlgorithmState, videos: VideoItem[]): VideoItem[] {
  if (videos.length === 0) return videos;
  
  const affinityMap = new Map(state.topicAffinities.map(a => [a.topic, a.score]));
  const watchedIds = new Set(state.engagementHistory.map(r => r.videoId));
  const skippedIds = new Set(state.engagementHistory.filter(r => r.skipped).map(r => r.videoId));
  const dislikedIds = new Set(state.dislikedVideos);
  const subscribedSet = new Set(state.subscribedChannels);
  
  const scored = videos.map(video => {
    let score = 0;
    const topics = video.topicTags.length > 0 ? video.topicTags : extractTopics(video.title);
    
    // 1. Topic affinity (strongest signal)
    const topicScore = topics.reduce((sum, t) => sum + (affinityMap.get(t) || 0), 0) / Math.max(topics.length, 1);
    score += topicScore * 3;
    
    // 2. Channel affinity
    const channelAffinity = state.channelAffinities[video.channelTitle] || 0;
    score += channelAffinity * 2;
    
    // 3. Subscribed channel boost
    if (subscribedSet.has(video.channelTitle)) score += 2;
    
    // 4. Penalize watched/skipped/disliked
    if (watchedIds.has(video.id)) score -= 3;
    if (skippedIds.has(video.id)) score -= 8;
    if (dislikedIds.has(video.id)) score -= 15;
    
    // 5. Diversity - penalize recently shown channels
    const recentIdx = state.lastShownChannels.indexOf(video.channelTitle);
    if (recentIdx >= 0) score -= (DIVERSITY_WINDOW - recentIdx) * 0.5;
    
    // 6. Discovery factor
    score += (Math.random() - 0.3) * 1.5;
    
    // 7. Freshness
    const ageMin = (Date.now() - video.fetchedAt) / 60000;
    if (ageMin < 5) score += 0.5;
    
    return { video, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // Diversity constraint
  const result: VideoItem[] = [];
  const remaining = scored.map(s => s.video);
  const recentCreators: string[] = [];
  
  while (remaining.length > 0) {
    let picked = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (!recentCreators.includes(remaining[i].channelTitle)) {
        picked = i;
        break;
      }
    }
    if (picked === -1) picked = 0;
    
    const item = remaining.splice(picked, 1)[0];
    result.push(item);
    recentCreators.push(item.channelTitle);
    if (recentCreators.length > 3) recentCreators.shift();
  }
  
  return result;
}

// Backward compat alias
export const rankShorts = rankVideos;

/** Update last-shown channels for diversity tracking */
export function trackShown(state: AlgorithmState, channelTitle: string): AlgorithmState {
  const lastShown = [...state.lastShownChannels, channelTitle];
  if (lastShown.length > DIVERSITY_WINDOW) lastShown.shift();
  const newState = { ...state, lastShownChannels: lastShown };
  saveAlgorithmState(newState);
  return newState;
}

/** Get algorithm stats for display */
export function getAlgorithmInsights(state: AlgorithmState): {
  topTopics: string[];
  totalWatched: number;
  topChannels: string[];
  subscribedCount: number;
  likedCount: number;
} {
  const sorted = [...state.topicAffinities].sort((a, b) => b.score - a.score);
  const topTopics = sorted.slice(0, 3).filter(t => t.score > 0).map(t => t.topic);
  
  const channelEntries = Object.entries(state.channelAffinities).sort((a, b) => b[1] - a[1]);
  const topChannels = channelEntries.slice(0, 3).filter(([, s]) => s > 0).map(([c]) => c);
  
  return {
    topTopics,
    totalWatched: state.engagementHistory.length,
    topChannels,
    subscribedCount: state.subscribedChannels.length,
    likedCount: state.likedVideos.length,
  };
}
