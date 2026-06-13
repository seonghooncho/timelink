import React from 'react';
import { ImageIcon, X } from 'lucide-react';

interface PostImageAttachmentProps {
  previewUrl: string | null;
  isUploading?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const PostImageAttachment: React.FC<PostImageAttachmentProps> = ({
  previewUrl,
  isUploading = false,
  onSelect,
  onRemove,
}) => {
  if (previewUrl) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
        <img src={previewUrl} alt="첨부 이미지 미리보기" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
          aria-label="첨부 이미지 제거"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isUploading}
      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {isUploading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <>
          <ImageIcon className="h-5 w-5" />
          이미지 추가
        </>
      )}
    </button>
  );
};

export default PostImageAttachment;
