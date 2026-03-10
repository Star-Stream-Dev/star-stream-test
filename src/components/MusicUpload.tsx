import { useState, useRef } from 'react';
import { Upload, X, Music, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MusicUploadProps {
  onUploadComplete: () => void;
}

export function MusicUpload({ onUploadComplete }: MusicUploadProps) {
  const { user, sessionToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
        toast.error('Please select an MP3 file');
        return;
      }
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.mp3$/i, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !user) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = 'mp3';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('music')
        .upload(fileName, selectedFile, {
          contentType: 'audio/mpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file');
        return;
      }

      // Add metadata to database
      const { error: dbError } = await supabase.rpc('add_uploaded_music', {
        p_session_token: sessionToken!,
        p_title: title.trim(),
        p_artist: artist.trim() || 'Unknown Artist',
        p_file_path: fileName,
      });

      if (dbError) {
        console.error('Database error:', dbError);
        // Clean up uploaded file
        await supabase.storage.from('music').remove([fileName]);
        toast.error('Failed to save music metadata');
        return;
      }

      toast.success('Music uploaded successfully!');
      setTitle('');
      setArtist('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload');
    }
    setIsUploading(false);
  };

  return (
    <div className="bg-gradient-card border border-border/30 rounded-xl p-6 mb-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        Upload Music (Admin Only)
      </h3>

      <div className="space-y-4">
        {/* File Input */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              <div className="text-left">
                <p className="text-foreground font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 hover:bg-muted/30 rounded"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Click to select an MP3 file</p>
              <p className="text-sm text-muted-foreground/60">Max 50MB</p>
            </div>
          )}
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Song Title *"
          className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />

        {/* Artist Input */}
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist Name (optional)"
          className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !title.trim() || isUploading}
          className="w-full bg-gradient-primary text-foreground py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload Music
            </>
          )}
        </button>
      </div>
    </div>
  );
}
