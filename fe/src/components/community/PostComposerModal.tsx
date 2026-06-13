import React, { useRef } from 'react';
import { X } from 'lucide-react';
import PostImageAttachment from '@/components/community/PostImageAttachment';
import { Textarea } from '@/components/ui/textarea';
import { COMMUNITY_POST_CONTENT_MAX_LENGTH, COMMUNITY_POST_TITLE_MAX_LENGTH } from '@/lib/textLimits';

interface PostComposerModalProps {
  open: boolean;
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  imagePreview: string | null;
  isImageUploading?: boolean;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  anonymous?: boolean;
  onAnonymousChange?: (value: boolean) => void;
  memberOnly?: boolean;
  onMemberOnlyChange?: (value: boolean) => void;
  contentPlaceholder?: string;
  submitLabel?: string;
  submittingLabel?: string;
}

const Switch = ({
  label,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="inline-flex shrink-0 items-center gap-2 rounded-full px-1 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted"
    aria-label={ariaLabel}
    aria-pressed={checked}
  >
    <span className={checked ? 'text-primary' : undefined}>{label}</span>
    <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/25'}`}>
      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
  </button>
);

const PostComposerModal: React.FC<PostComposerModalProps> = ({
  open,
  title,
  content,
  onTitleChange,
  onContentChange,
  onClose,
  onSubmit,
  isSubmitting = false,
  imagePreview,
  isImageUploading = false,
  onImageSelect,
  onImageRemove,
  anonymous,
  onAnonymousChange,
  memberOnly,
  onMemberOnlyChange,
  contentPlaceholder = '나누고 싶은 이야기를 적어주세요.',
  submitLabel = '등록하기',
  submittingLabel = '등록 중...',
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h3 className="text-base font-bold text-foreground">게시물 작성</h3>
          <div className="flex items-center gap-1">
            {onAnonymousChange ? (
              <Switch
                label="익명"
                checked={Boolean(anonymous)}
                onChange={onAnonymousChange}
                ariaLabel="익명으로 작성하기"
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-muted-foreground">제목</label>
                <span className="text-[10px] text-muted-foreground">{title.length}/{COMMUNITY_POST_TITLE_MAX_LENGTH}</span>
              </div>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                maxLength={COMMUNITY_POST_TITLE_MAX_LENGTH}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="제목을 입력해주세요"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-muted-foreground">본문</label>
                <span className="text-[10px] text-muted-foreground">{content.length}/{COMMUNITY_POST_CONTENT_MAX_LENGTH}</span>
              </div>
              <Textarea
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                maxLength={COMMUNITY_POST_CONTENT_MAX_LENGTH}
                rows={5}
                className="min-h-[8.5rem] resize-none rounded-xl bg-muted text-base"
                placeholder={contentPlaceholder}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">사진</p>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">한 장만 첨부할 수 있습니다.</p>
              </div>
              <PostImageAttachment
                previewUrl={imagePreview}
                isUploading={isImageUploading}
                onSelect={() => imageInputRef.current?.click()}
                onRemove={onImageRemove}
                compact
              />
            </div>

            {onMemberOnlyChange ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">모임에만 공개</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">꺼두면 미가입자도 소개 페이지에서 읽을 수 있습니다.</p>
                </div>
                <Switch
                  label="모임만"
                  checked={Boolean(memberOnly)}
                  onChange={onMemberOnlyChange}
                  ariaLabel="모임에만 게시하기"
                />
              </div>
            ) : null}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || isImageUploading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting || isImageUploading ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComposerModal;
