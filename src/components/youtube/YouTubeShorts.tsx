import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShortsPlayer } from './ShortsPlayer';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ShortItem,
  type AlgorithmState,
  loadAlgorithmState,
  recordEngagement,
  rankShorts,
  trackShown,
  getRecommendedQueries,
  extractTopics,
  getAlgorithmInsights,
} from '@/lib/shortsAlgorithm';

interface YouTubeShortsProps {
  onBack: () => void;
}

export function YouTubeShorts({ onBack }: YouTubeShortsProps) {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [algoState, setAlgoState] = useState<AlgorithmState>(() => loadAlgorithmState(user?.id));
  const [showAlgoTag, setShowAlgoTag] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const viewStartTime = useRef<number>(Date.now());
  const fetchedQuerySets = useRef(0);

  // Fetch shorts using algorithm-recommended queries
  const fetchShorts = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const currentState = loadAlgorithmState(user?.id);
      // Get 3 diverse queries based on user preferences
      const queries = getRecommendedQueries(currentState, 3);
      
      // Fetch from multiple queries in parallel for diversity
      const results = await Promise.allSettled(
        queries.map(query =>
          supabase.functions.invoke('youtube-api', {
            body: { action: 'shorts', query, maxResults: 15 }
          })
        )
      );

      const allItems: ShortItem[] = [];
      const now = Date.now();

      for (const result of results) {
        if (result.status === 'fulfilled' && !result.value.error) {
          const items = result.value.data?.items || [];
          for (const item of items) {
            const id = item.id?.videoId || item.id;
            const title = item.snippet?.title || '';
            allItems.push({
              id,
              title,
              thumbnail: item.snippet?.thumbnails?.high?.url || '',
              channelTitle: item.snippet?.channelTitle || '',
              fetchedAt: now,
              topicTags: extractTopics(title),
            });
          }
        }
      }

      // Deduplicate
      const seen = new Set<string>();
      const unique = allItems.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      // Rank using algorithm
      const ranked = rankShorts(currentState, unique);

      if (isLoadMore) {
        setShorts(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newShorts = ranked.filter(s => !existingIds.has(s.id));
          return [...prev, ...newShorts];
        });
      } else {
        setShorts(ranked);
      }
      
      fetchedQuerySets.current++;
    } catch (error) {
      console.error('Error fetching shorts:', error);
      toast.error('Failed to load Shorts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchShorts();
  }, [fetchShorts]);

  // Lock body scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  // Load more when near end
  useEffect(() => {
    if (currentIndex >= shorts.length - 3 && shorts.length > 0 && !loadingMore) {
      fetchShorts(true);
    }
  }, [currentIndex, shorts.length, loadingMore, fetchShorts]);

  // Track watch duration and engagement on navigation
  const recordCurrentEngagement = useCallback((skipped: boolean) => {
    const current = shorts[currentIndex];
    if (!current) return;

    const watchDurationMs = Date.now() - viewStartTime.current;
    const looped = watchDurationMs > 30000; // watched > 30s = likely looped

    const newState = recordEngagement(
      algoState,
      current.id,
      current.channelTitle,
      current.title,
      { watchDurationMs, skipped, looped }
    );
    setAlgoState(newState);
  }, [shorts, currentIndex, algoState]);

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (isScrolling.current) return;
    isScrolling.current = true;
    setTimeout(() => { isScrolling.current = false; }, 300);

    // Record engagement for current short before navigating
    const watchTime = Date.now() - viewStartTime.current;
    const isSkip = watchTime < 2000; // Less than 2 seconds = skip
    recordCurrentEngagement(isSkip);

    setCurrentIndex(prev => {
      const next = direction === 'up' ? Math.max(0, prev - 1) : Math.min(shorts.length - 1, prev + 1);
      if (next !== prev) {
        // Track shown for diversity
        const nextShort = shorts[next];
        if (nextShort) {
          setAlgoState(s => trackShown(s, nextShort.channelTitle));
        }
        viewStartTime.current = Date.now();
        
        // Flash algo tag briefly
        setShowAlgoTag(true);
        setTimeout(() => setShowAlgoTag(false), 1500);
      }
      return next;
    });
  }, [shorts, recordCurrentEngagement]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        handleScroll(e.key === 'ArrowUp' ? 'up' : 'down');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleScroll]);

  // Wheel scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) handleScroll('down');
      else if (e.deltaY < 0) handleScroll('up');
    };
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [handleScroll]);

  // Touch scroll
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 50) handleScroll(diff > 0 ? 'down' : 'up');
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleScroll]);

  const toggleLike = (id: string) => {
    const current = shorts[currentIndex];
    if (!current) return;
    
    const isNowLiked = !liked.has(id);
    setLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });

    // Record like engagement
    const newState = recordEngagement(
      algoState,
      current.id,
      current.channelTitle,
      current.title,
      { liked: isNowLiked }
    );
    setAlgoState(newState);
  };

  const handleShare = async (short: ShortItem) => {
    try {
      await navigator.clipboard.writeText(`https://youtube.com/shorts/${short.id}`);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
        <p className="text-white/60 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Curating your feed...
        </p>
      </div>
    );
  }

  const currentShort = shorts[currentIndex];
  const insights = getAlgorithmInsights(algoState);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Back Button */}
      <button
        onClick={() => {
          recordCurrentEngagement(false);
          onBack();
        }}
        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Algorithm personalization indicator */}
      {showAlgoTag && insights.topTopics.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 text-xs animate-fade-in">
          <TrendingUp className="w-3 h-3" />
          <span>For you · {insights.topTopics[0]}</span>
        </div>
      )}

      {/* Navigation Arrows */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        <button
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleScroll('down')}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Short Video */}
      {currentShort && (
        <ShortsPlayer
          short={currentShort}
          muted={muted}
          liked={liked.has(currentShort.id)}
          onToggleMute={() => setMuted(!muted)}
          onToggleLike={() => toggleLike(currentShort.id)}
          onShare={() => handleShare(currentShort)}
        />
      )}

      {/* Counter & Loading */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <span className="text-white/70 text-sm">
          {currentIndex + 1} / {shorts.length}
        </span>
        {loadingMore && (
          <span className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading more...
          </span>
        )}
      </div>
    </div>
  );
}
