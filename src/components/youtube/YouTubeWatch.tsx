import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Loader2, Users, MessageCircle, Bell, BellOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { YouTubeWatchParty } from './YouTubeWatchParty';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadAlgorithmState,
  recordEngagement,
  toggleSubscribe,
  extractTopics,
  rankVideos,
  type VideoItem,
  type AlgorithmState,
} from '@/lib/shortsAlgorithm';

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
  thumbnail: string;
}

interface RelatedVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface Comment {
  id: string;
  text: string;
  timestamp: number;
}

interface YouTubeWatchProps {
  videoId: string;
  onBack: () => void;
  onVideoSelect: (videoId: string) => void;
}

export function YouTubeWatch({ videoId, onBack, onVideoSelect }: YouTubeWatchProps) {
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [algoState, setAlgoState] = useState<AlgorithmState>(() => loadAlgorithmState(user?.id));
  const containerRef = useRef<HTMLDivElement>(null);
  const watchStartTime = useRef<number>(Date.now());

  const isLiked = algoState.likedVideos.includes(videoId);
  const isDisliked = algoState.dislikedVideos.includes(videoId);
  const isSubscribed = video ? algoState.subscribedChannels.includes(video.channelTitle) : false;

  // Load comments from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`yt_comments_${videoId}`);
      if (stored) setComments(JSON.parse(stored));
      else setComments([]);
    } catch { setComments([]); }
  }, [videoId]);

  // Record watch duration on unmount or video change
  useEffect(() => {
    watchStartTime.current = Date.now();
    return () => {
      if (video) {
        const watchMs = Date.now() - watchStartTime.current;
        const newState = recordEngagement(
          loadAlgorithmState(), videoId, video.channelTitle, video.title,
          { watchDurationMs: watchMs }
        );
        setAlgoState(newState);
      }
    };
  }, [videoId, video?.channelTitle]);

  // Save to watch history in database
  const saveToHistory = async (videoData: VideoDetails) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('youtube_watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoData.id)
        .single();

      if (existing) {
        await supabase.from('youtube_watch_history')
          .update({ watched_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('youtube_watch_history').insert({
          user_id: user.id,
          video_id: videoData.id,
          title: videoData.title,
          channel_title: videoData.channelTitle,
          thumbnail: videoData.thumbnail,
        });
      }
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const fetchVideoDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'video', videoId }
      });
      if (error) throw error;

      const item = data.items?.[0];
      if (item) {
        const videoData: VideoDetails = {
          id: item.id,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          channelTitle: item.snippet?.channelTitle || '',
          channelId: item.snippet?.channelId || '',
          viewCount: item.statistics?.viewCount || '0',
          likeCount: item.statistics?.likeCount || '0',
          publishedAt: item.snippet?.publishedAt || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || '',
        };
        setVideo(videoData);
        saveToHistory(videoData);

        // Record initial view engagement
        const state = loadAlgorithmState();
        const newState = recordEngagement(state, videoId, videoData.channelTitle, videoData.title, { watchDurationMs: 1000 });
        setAlgoState(newState);
      }

      // Fetch related videos
      const { data: relatedData } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'search', query: item?.snippet?.title?.split(' ').slice(0, 3).join(' ') || '', maxResults: 12 }
      });

      if (relatedData?.items) {
        const currentAlgoState = loadAlgorithmState();
        const now = Date.now();
        const relatedItems: VideoItem[] = relatedData.items
          .filter((r: any) => (r.id?.videoId || r.id) !== videoId)
          .map((r: any) => ({
            id: r.id?.videoId || r.id,
            title: r.snippet?.title || '',
            thumbnail: r.snippet?.thumbnails?.medium?.url || '',
            channelTitle: r.snippet?.channelTitle || '',
            fetchedAt: now,
            topicTags: extractTopics(r.snippet?.title || ''),
          }));

        // Rank related videos using algorithm
        const ranked = rankVideos(currentAlgoState, relatedItems);
        setRelatedVideos(ranked.map(v => ({
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail,
          channelTitle: v.channelTitle,
        })));
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideoDetails(); }, [videoId]);

  const formatCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleLike = () => {
    if (!video) return;
    const newLiked = !isLiked;
    const newState = recordEngagement(algoState, videoId, video.channelTitle, video.title, {
      liked: newLiked,
      disliked: false,
    });
    setAlgoState(newState);
    if (newLiked) toast.success('Liked! Your feed will show more like this.');
  };

  const handleDislike = () => {
    if (!video) return;
    const newDisliked = !isDisliked;
    const newState = recordEngagement(algoState, videoId, video.channelTitle, video.title, {
      disliked: newDisliked,
      liked: false,
    });
    setAlgoState(newState);
    if (newDisliked) toast('Got it. We\'ll tune your recommendations.');
  };

  const handleSubscribe = () => {
    if (!video) return;
    const newState = toggleSubscribe(algoState, video.channelTitle);
    setAlgoState(newState);
    const isSub = newState.subscribedChannels.includes(video.channelTitle);
    toast.success(isSub ? `Subscribed to ${video.channelTitle}` : `Unsubscribed from ${video.channelTitle}`);
  };

  const handleComment = () => {
    if (!commentText.trim() || !video) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      timestamp: Date.now(),
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    setCommentText('');

    try { localStorage.setItem(`yt_comments_${videoId}`, JSON.stringify(updated)); } catch {}

    // Record comment engagement
    const newState = recordEngagement(algoState, videoId, video.channelTitle, video.title, { commented: true });
    setAlgoState(newState);
    toast.success('Comment added! This helps tune your feed.');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://youtube.com/watch?v=${videoId}`);
      toast.success('Link copied to clipboard!');
    } catch { toast.error('Failed to copy link'); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Main Video Section */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto">
        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black flex-shrink-0">
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
              title={video?.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        {/* Video Info */}
        <div className="flex-1 overflow-y-auto p-4">
          {video && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{formatCount(video.viewCount)} views</span>
                <span>•</span>
                <span>{formatDate(video.publishedAt)}</span>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Like/Dislike pill */}
                <div className="flex items-center rounded-full bg-muted/50 overflow-hidden">
                  <Button
                    variant="ghost"
                    className={`gap-2 rounded-none rounded-l-full border-r border-border/30 ${
                      isLiked ? 'bg-primary/20 text-primary' : ''
                    }`}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? parseInt(video.likeCount) + 1 : formatCount(video.likeCount)}
                  </Button>
                  <Button
                    variant="ghost"
                    className={`gap-2 rounded-none rounded-r-full ${
                      isDisliked ? 'bg-destructive/20 text-destructive' : ''
                    }`}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                <Button variant="ghost" className="gap-2 rounded-full" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>

                <Button
                  variant="ghost"
                  className="gap-2 rounded-full"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className={`w-5 h-5 ${showComments ? 'fill-current text-primary' : ''}`} />
                  {comments.length > 0 ? comments.length : 'Comment'}
                </Button>

                <Button
                  variant="ghost"
                  className="gap-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                  onClick={() => setShowWatchParty(true)}
                >
                  <Users className="w-5 h-5" />
                  Watch Party
                </Button>
              </div>

              {/* Channel */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                    {video.channelTitle[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{video.channelTitle}</p>
                    {isSubscribed && (
                      <p className="text-xs text-muted-foreground">Subscribed</p>
                    )}
                  </div>
                </div>
                <Button
                  className={`rounded-full gap-2 ${
                    isSubscribed 
                      ? 'bg-muted text-foreground hover:bg-muted/80'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                  onClick={handleSubscribe}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments ({comments.length})
                  </h3>
                  
                  <div className="flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-background/50 rounded-full"
                      onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!commentText.trim()}
                      size="icon"
                      className="rounded-full bg-red-500 hover:bg-red-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-2 rounded-lg bg-background/50">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {user?.username || 'You'} • {new Date(comment.timestamp).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-foreground">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <div className={`text-sm text-foreground whitespace-pre-wrap ${!showDescription ? 'line-clamp-3' : ''}`}>
                  {video.description}
                </div>
                {video.description.length > 200 && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-sm text-primary mt-2 hover:underline"
                  >
                    {showDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Videos Sidebar */}
      <div className="w-full lg:w-96 lg:border-l border-border/50 lg:overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Recommended</h3>
          <div className="space-y-3">
            {relatedVideos.map((related) => (
              <button
                key={related.id}
                onClick={() => onVideoSelect(related.id)}
                className="flex gap-3 w-full text-left group hover:bg-muted/30 p-2 rounded-lg transition-colors"
              >
                <div className="relative w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden">
                  <img
                    src={related.thumbnail}
                    alt={related.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                    {related.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{related.channelTitle}</p>
                  {algoState.subscribedChannels.includes(related.channelTitle) && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                      Subscribed
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Watch Party Overlay */}
      {showWatchParty && (
        <YouTubeWatchParty
          onClose={() => setShowWatchParty(false)}
          videoId={videoId}
          videoTitle={video?.title}
        />
      )}
    </div>
  );
}
