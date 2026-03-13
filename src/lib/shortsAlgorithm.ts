/**
 * YouTube Shorts Recommendation Algorithm
 * 
 * Inspired by YouTube's actual algorithm, adapted for client-side:
 * - Tracks user engagement signals (likes, watch duration, skips)
 * - Diversifies content by avoiding same-creator repetition
 * - Weights content based on user preferences learned over time
 * - Incorporates trending/fresh content discovery
 * 
 * Key ranking factors (per YouTube's published approach):
 * 1. Watch duration / completion rate
 * 2. Likes and engagement
 * 3. Content variety (no same-creator back-to-back)
 * 4. User preference matching via topic affinity
 * 5. Freshness / discovery of new content
 */

export interface ShortItem {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  fetchedAt: number;
  topicTags: string[];
}

interface EngagementRecord {
  videoId: string;
  channelTitle: string;
  liked: boolean;
  watchDurationMs: number;
  skipped: boolean; // swiped past in < 2 seconds
  looped: boolean;  // watched past 100% (re-watch)
  topicTags: string[];
  timestamp: number;
}

interface TopicAffinity {
  topic: string;
  score: number; // -1 to 1, negative = disliked
}

export interface AlgorithmState {
  engagementHistory: EngagementRecord[];
  topicAffinities: TopicAffinity[];
  channelAffinities: Record<string, number>; // channel -> score
  lastShownChannels: string[]; // recent channels to avoid repetition
  queryRotation: number;
}

const STORAGE_KEY = 'solarnova_shorts_algo';
const MAX_HISTORY = 200;
const DIVERSITY_WINDOW = 5; // avoid same creator in last N shorts

// Search queries organized by topic category for diverse content
const TOPIC_QUERIES: Record<string, string[]> = {
  comedy: ['funny shorts', 'comedy shorts', 'meme compilation shorts'],
  music: ['music shorts', 'singing shorts', 'dance shorts'],
  gaming: ['gaming shorts', 'game highlights shorts'],
  education: ['facts shorts', 'science shorts', 'did you know shorts'],
  satisfying: ['satisfying shorts', 'oddly satisfying compilation'],
  trending: ['trending shorts 2025', 'viral shorts today'],
  lifestyle: ['life hack shorts', 'cooking shorts', 'fitness shorts'],
  nature: ['nature shorts', 'animal shorts', 'cute pets shorts'],
  creative: ['art shorts', 'animation shorts', 'creative shorts'],
  tech: ['tech shorts', 'gadget shorts'],
};

const ALL_QUERIES = Object.values(TOPIC_QUERIES).flat();

export function loadAlgorithmState(): AlgorithmState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    engagementHistory: [],
    topicAffinities: [],
    channelAffinities: {},
    lastShownChannels: [],
    queryRotation: 0,
  };
}

function saveAlgorithmState(state: AlgorithmState): void {
  try {
    // Trim history to prevent storage bloat
    if (state.engagementHistory.length > MAX_HISTORY) {
      state.engagementHistory = state.engagementHistory.slice(-MAX_HISTORY);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Extract topic tags from a video title */
export function extractTopics(title: string): string[] {
  const lower = title.toLowerCase();
  const topics: string[] = [];
  
  const topicKeywords: Record<string, string[]> = {
    comedy: ['funny', 'comedy', 'meme', 'laugh', 'joke', 'prank', 'humor'],
    music: ['music', 'song', 'sing', 'dance', 'beat', 'rap', 'pop', 'rock', 'hip hop'],
    gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'roblox', 'gta', 'valorant'],
    education: ['fact', 'learn', 'science', 'history', 'how to', 'tutorial', 'explain', 'did you know'],
    satisfying: ['satisfying', 'asmr', 'relaxing', 'soothing', 'compilation'],
    trending: ['viral', 'trending', 'challenge', 'trend'],
    lifestyle: ['hack', 'recipe', 'cook', 'fitness', 'workout', 'routine', 'food'],
    nature: ['nature', 'animal', 'pet', 'dog', 'cat', 'wildlife', 'ocean'],
    creative: ['art', 'draw', 'paint', 'animation', 'creative', 'design', 'diy'],
    tech: ['tech', 'gadget', 'phone', 'computer', 'ai', 'robot', 'app'],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      topics.push(topic);
    }
  }
  
  return topics.length > 0 ? topics : ['general'];
}

/** Record a user engagement event */
export function recordEngagement(
  state: AlgorithmState,
  videoId: string,
  channelTitle: string,
  title: string,
  engagement: {
    liked?: boolean;
    watchDurationMs?: number;
    skipped?: boolean;
    looped?: boolean;
  }
): AlgorithmState {
  const topicTags = extractTopics(title);
  
  // Find existing record or create new
  const existingIdx = state.engagementHistory.findIndex(r => r.videoId === videoId);
  const record: EngagementRecord = existingIdx >= 0 
    ? { ...state.engagementHistory[existingIdx] }
    : {
        videoId,
        channelTitle,
        liked: false,
        watchDurationMs: 0,
        skipped: false,
        looped: false,
        topicTags,
        timestamp: Date.now(),
      };
  
  // Update with new engagement data
  if (engagement.liked !== undefined) record.liked = engagement.liked;
  if (engagement.watchDurationMs !== undefined) record.watchDurationMs = Math.max(record.watchDurationMs, engagement.watchDurationMs);
  if (engagement.skipped) record.skipped = true;
  if (engagement.looped) record.looped = true;
  record.timestamp = Date.now();
  
  // Update history
  const newHistory = existingIdx >= 0
    ? [...state.engagementHistory.slice(0, existingIdx), ...state.engagementHistory.slice(existingIdx + 1), record]
    : [...state.engagementHistory, record];
  
  // Update topic affinities
  const newAffinities = updateTopicAffinities(state.topicAffinities, topicTags, engagement);
  
  // Update channel affinities
  const newChannelAffinities = { ...state.channelAffinities };
  const channelScore = newChannelAffinities[channelTitle] || 0;
  if (engagement.liked) {
    newChannelAffinities[channelTitle] = Math.min(channelScore + 0.3, 1);
  } else if (engagement.skipped) {
    newChannelAffinities[channelTitle] = Math.max(channelScore - 0.2, -1);
  } else if (engagement.looped) {
    newChannelAffinities[channelTitle] = Math.min(channelScore + 0.2, 1);
  } else if ((engagement.watchDurationMs || 0) > 5000) {
    newChannelAffinities[channelTitle] = Math.min(channelScore + 0.1, 1);
  }
  
  const newState: AlgorithmState = {
    ...state,
    engagementHistory: newHistory,
    topicAffinities: newAffinities,
    channelAffinities: newChannelAffinities,
  };
  
  saveAlgorithmState(newState);
  return newState;
}

function updateTopicAffinities(
  current: TopicAffinity[],
  topics: string[],
  engagement: { liked?: boolean; skipped?: boolean; looped?: boolean; watchDurationMs?: number }
): TopicAffinity[] {
  const affinityMap = new Map(current.map(a => [a.topic, a.score]));
  
  for (const topic of topics) {
    const existing = affinityMap.get(topic) || 0;
    let delta = 0;
    
    if (engagement.liked) delta += 0.15;
    if (engagement.looped) delta += 0.1;
    if (engagement.skipped) delta -= 0.1;
    if ((engagement.watchDurationMs || 0) > 8000) delta += 0.05;
    if ((engagement.watchDurationMs || 0) < 2000 && !engagement.liked) delta -= 0.05;
    
    affinityMap.set(topic, Math.max(-1, Math.min(1, existing + delta)));
  }
  
  return Array.from(affinityMap.entries()).map(([topic, score]) => ({ topic, score }));
}

/** Get diversified search queries based on user preferences */
export function getRecommendedQueries(state: AlgorithmState, count: number = 3): string[] {
  const affinityMap = new Map(state.topicAffinities.map(a => [a.topic, a.score]));
  
  // Weight topics by affinity score
  const topicWeights: { topic: string; weight: number; queries: string[] }[] = [];
  
  for (const [topic, queries] of Object.entries(TOPIC_QUERIES)) {
    const affinity = affinityMap.get(topic) || 0;
    // Base weight of 1, modified by affinity (-1 to +1)
    // Even disliked topics get a small chance (discovery factor)
    const weight = Math.max(0.1, 1 + affinity * 0.8);
    topicWeights.push({ topic, weight, queries });
  }
  
  // Weighted random selection of topics
  const totalWeight = topicWeights.reduce((sum, t) => sum + t.weight, 0);
  const selected: string[] = [];
  const usedTopics = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let rand = Math.random() * totalWeight;
    for (const tw of topicWeights) {
      if (usedTopics.has(tw.topic)) continue;
      rand -= tw.weight;
      if (rand <= 0) {
        // Pick a random query from this topic
        const query = tw.queries[Math.floor(Math.random() * tw.queries.length)];
        selected.push(query);
        usedTopics.add(tw.topic);
        break;
      }
    }
    // Fallback if no selection made
    if (selected.length <= i) {
      const fallback = ALL_QUERIES[Math.floor(Math.random() * ALL_QUERIES.length)];
      selected.push(fallback);
    }
  }
  
  return selected;
}

/** Score and rank shorts based on user preferences */
export function rankShorts(state: AlgorithmState, shorts: ShortItem[]): ShortItem[] {
  if (shorts.length === 0) return shorts;
  
  const affinityMap = new Map(state.topicAffinities.map(a => [a.topic, a.score]));
  const watchedIds = new Set(state.engagementHistory.map(r => r.videoId));
  const skippedIds = new Set(
    state.engagementHistory.filter(r => r.skipped).map(r => r.videoId)
  );
  
  // Score each short
  const scored = shorts.map(short => {
    let score = 0;
    
    // 1. Topic affinity (strongest signal)
    const topics = short.topicTags.length > 0 ? short.topicTags : extractTopics(short.title);
    const topicScore = topics.reduce((sum, t) => sum + (affinityMap.get(t) || 0), 0) / Math.max(topics.length, 1);
    score += topicScore * 3;
    
    // 2. Channel affinity
    const channelAffinity = state.channelAffinities[short.channelTitle] || 0;
    score += channelAffinity * 2;
    
    // 3. Penalize already-watched content
    if (watchedIds.has(short.id)) score -= 5;
    if (skippedIds.has(short.id)) score -= 10;
    
    // 4. Diversity bonus - penalize if same channel shown recently
    const recentChannelIdx = state.lastShownChannels.indexOf(short.channelTitle);
    if (recentChannelIdx >= 0) {
      score -= (DIVERSITY_WINDOW - recentChannelIdx) * 0.5;
    }
    
    // 5. Discovery factor - small random boost for exploration
    score += (Math.random() - 0.3) * 1.5;
    
    // 6. Freshness bonus for recently fetched content
    const ageMinutes = (Date.now() - short.fetchedAt) / 60000;
    if (ageMinutes < 5) score += 0.5;
    
    return { short, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Apply diversity constraint: no same creator back-to-back
  const result: ShortItem[] = [];
  const remaining = scored.map(s => s.short);
  const recentCreators: string[] = [];
  
  while (remaining.length > 0) {
    // Find first item whose creator isn't in recent window
    let picked = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (!recentCreators.includes(remaining[i].channelTitle)) {
        picked = i;
        break;
      }
    }
    // If all are from recent creators, just take the first
    if (picked === -1) picked = 0;
    
    const item = remaining.splice(picked, 1)[0];
    result.push(item);
    
    recentCreators.push(item.channelTitle);
    if (recentCreators.length > 3) recentCreators.shift();
  }
  
  return result;
}

/** Update last-shown channels for diversity tracking */
export function trackShown(state: AlgorithmState, channelTitle: string): AlgorithmState {
  const lastShown = [...state.lastShownChannels, channelTitle];
  if (lastShown.length > DIVERSITY_WINDOW) lastShown.shift();
  
  const newState = { ...state, lastShownChannels: lastShown };
  saveAlgorithmState(newState);
  return newState;
}

/** Get algorithm stats for debug/display */
export function getAlgorithmInsights(state: AlgorithmState): {
  topTopics: string[];
  totalWatched: number;
  topChannels: string[];
} {
  const sorted = [...state.topicAffinities].sort((a, b) => b.score - a.score);
  const topTopics = sorted.slice(0, 3).filter(t => t.score > 0).map(t => t.topic);
  
  const channelEntries = Object.entries(state.channelAffinities).sort((a, b) => b[1] - a[1]);
  const topChannels = channelEntries.slice(0, 3).filter(([, s]) => s > 0).map(([c]) => c);
  
  return {
    topTopics,
    totalWatched: state.engagementHistory.length,
    topChannels,
  };
}
