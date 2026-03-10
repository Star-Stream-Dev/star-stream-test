import { useState, useEffect } from 'react';
import { Megaphone, Send, Trash2, Edit2, MessageCircle, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { censorText } from '@/lib/profanityFilter';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  announcement_id: string;
  display_name: string;
  comment: string;
  created_at: string;
}

export function Announcements() {
  const { user, isAdmin, sessionToken } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  
  // Comment states
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>(null);
  const [commentDisplayName, setCommentDisplayName] = useState('');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to realtime updates
    const announcementChannel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, 
        () => fetchAnnouncements())
      .subscribe();

    const commentChannel = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcement_comments' },
        (payload) => {
          const newComment = payload.new as Comment;
          setComments(prev => ({
            ...prev,
            [newComment.announcement_id]: [...(prev[newComment.announcement_id] || []), newComment]
          }));
        })
      .subscribe();

    return () => {
      supabase.removeChannel(announcementChannel);
      supabase.removeChannel(commentChannel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load announcements');
      console.error(error);
    } else {
      setAnnouncements(data || []);
      // Fetch comments for all announcements
      for (const announcement of data || []) {
        fetchComments(announcement.id);
      }
    }
    setIsLoading(false);
  };

  const fetchComments = async (announcementId: string) => {
    const { data } = await supabase
      .from('announcement_comments')
      .select('*')
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(prev => ({ ...prev, [announcementId]: data }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newContent.trim()) return;

    const { error } = await supabase.rpc('create_announcement', {
      p_session_token: sessionToken!,
      p_title: newTitle.trim(),
      p_content: newContent.trim()
    });

    if (error) {
      setError('Failed to create announcement');
      console.error(error);
    } else {
      setNewTitle('');
      setNewContent('');
      setShowCreateForm(false);
      fetchAnnouncements();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;

    const { error } = await supabase.rpc('update_announcement', {
      p_session_token: sessionToken!,
      p_announcement_id: id,
      p_title: newTitle.trim(),
      p_content: newContent.trim()
    });

    if (error) {
      setError('Failed to update announcement');
      console.error(error);
    } else {
      setEditingId(null);
      setNewTitle('');
      setNewContent('');
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this announcement?')) return;

    const { error } = await supabase.rpc('delete_announcement', {
      p_session_token: sessionToken!,
      p_announcement_id: id
    });

    if (error) {
      setError('Failed to delete announcement');
      console.error(error);
    } else {
      fetchAnnouncements();
    }
  };

  const handleComment = async (announcementId: string) => {
    if (!user || !commentDisplayName.trim() || !commentText.trim()) return;

    const censoredComment = censorText(commentText.trim());
    const censoredName = censorText(commentDisplayName.trim());

    const { error } = await supabase.from('announcement_comments').insert({
      announcement_id: announcementId,
      user_id: user.id,
      display_name: censoredName,
      comment: censoredComment
    });

    if (error) {
      setError('Failed to post comment');
      console.error(error);
    } else {
      setCommentText('');
    }
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Announcements
        </h2>
        <p className="text-muted-foreground text-lg">
          Latest news and updates from the team
        </p>
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm mb-6">
          {error}
        </div>
      )}

      {/* Admin Create Button */}
      {isAdmin && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mb-6 flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow"
        >
          <Plus className="w-5 h-5" />
          New Announcement
        </button>
      )}

      {/* Create Form */}
      {isAdmin && showCreateForm && (
        <div className="bg-gradient-card border border-border/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Create Announcement</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Content"
              rows={4}
              className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
            <button
              type="submit"
              className="bg-gradient-primary hover:opacity-90 text-foreground font-bold py-2 px-6 rounded-lg transition-all duration-300"
            >
              Post Announcement
            </button>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className="bg-gradient-card border border-border/30 rounded-xl p-8 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-gradient-card border border-border/30 rounded-xl overflow-hidden">
              {/* Announcement Header */}
              <div className="p-6">
                {editingId === announcement.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                      className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(announcement.id)}
                        className="bg-primary hover:opacity-90 text-foreground font-bold py-2 px-4 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setNewTitle(''); setNewContent(''); }}
                        className="bg-muted hover:opacity-90 text-foreground py-2 px-4 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{announcement.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(announcement)}
                            className="p-2 text-primary hover:text-secondary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 text-destructive hover:opacity-80 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-foreground/80 whitespace-pre-wrap">{announcement.content}</p>
                  </>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t border-border/30">
                <button
                  onClick={() => setExpandedAnnouncement(
                    expandedAnnouncement === announcement.id ? null : announcement.id
                  )}
                  className="w-full px-6 py-3 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>{comments[announcement.id]?.length || 0} Comments</span>
                  </div>
                </button>

                {expandedAnnouncement === announcement.id && (
                  <div className="px-6 pb-6">
                    {/* Comments List */}
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {(comments[announcement.id] || []).map((comment) => (
                        <div key={comment.id} className="bg-background/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-primary text-sm">{comment.display_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-foreground/80 text-sm">{comment.comment}</p>
                        </div>
                      ))}
                      {(comments[announcement.id]?.length || 0) === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-2">No comments yet</p>
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={commentDisplayName}
                        onChange={(e) => setCommentDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleComment(announcement.id)}
                          disabled={!commentDisplayName.trim() || !commentText.trim()}
                          className="bg-gradient-primary hover:opacity-90 p-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
