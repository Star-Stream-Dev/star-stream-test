import { Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface ShortData {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface ShortsPlayerProps {
  short: ShortData;
  muted: boolean;
  liked: boolean;
  onToggleMute: () => void;
  onToggleLike: () => void;
  onShare: () => void;
}

export function ShortsPlayer({ short, muted, liked, onToggleMute, onToggleLike, onShare }: ShortsPlayerProps) {
  return (
    <div className="relative w-full max-w-[400px] h-full max-h-[90vh] bg-black rounded-xl overflow-hidden">
      {/* Video Player */}
      <div className="absolute inset-0">
        <iframe
          key={short.id}
          src={`https://www.youtube.com/embed/${short.id}?autoplay=1&loop=1&playlist=${short.id}&controls=0&modestbranding=1&rel=0${muted ? '&mute=1' : ''}`}
          title={short.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Overlay Controls */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
          <p className="text-white font-semibold mb-1">@{short.channelTitle}</p>
          <p className="text-white/90 text-sm line-clamp-2">{short.title}</p>
        </div>

        {/* Side Actions */}
        <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4 pointer-events-auto">
          <button onClick={onToggleLike} className="flex flex-col items-center gap-1">
            <div className={`p-3 rounded-full ${liked ? 'bg-red-500' : 'bg-black/50'} hover:bg-black/70 transition-colors`}>
              <Heart className={`w-6 h-6 ${liked ? 'text-white fill-white' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs">Like</span>
          </button>
          
          <button className="flex flex-col items-center gap-1">
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">Comment</span>
          </button>
          
          <button onClick={onShare} className="flex flex-col items-center gap-1">
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">Share</span>
          </button>
          
          <button className="flex flex-col items-center gap-1">
            <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
              <MoreVertical className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
