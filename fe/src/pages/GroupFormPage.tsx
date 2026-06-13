import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ImageCropModal from '@/components/common/ImageCropModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateGroup } from '@/hooks/useGroups';
import type { ImageStatus } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { Camera, X } from 'lucide-react';
import { getProcessingImageLabel, uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';
import { trackEvent } from '@/lib/analytics';

const GroupFormPage: React.FC = () => {
  const navigate = useNavigate();
  const createGroupMutation = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState<{ imageId: string; status: ImageStatus; url?: string } | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCropSourceFile(file);
  };

  const removeImage = () => {
    setCropSourceFile(null);
    setImagePreview(null);
    setImageUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (croppedFile: File, previewUrl: string) => {
    setCropSourceFile(null);
    setImagePreview(previewUrl);
    setImageUpload(null);
    setIsImageUploading(true);
    try {
      const uploaded = await uploadProcessedImage('GROUP', croppedFile);
      setImageUpload({ imageId: uploaded.imageId, status: uploaded.status });
      appToast.info('이미지 처리 중입니다', '모임을 만들면 처리 완료 후 WebP 이미지가 반영됩니다.');

      void waitForImageProcessing(uploaded.imageId).then((processed) => {
        setImageUpload(prev => prev?.imageId === uploaded.imageId
          ? { imageId: uploaded.imageId, status: processed.status || 'PROCESSING', url: processed.url }
          : prev);
      }).catch(() => {
        setImageUpload(prev => prev?.imageId === uploaded.imageId
          ? { ...prev, status: 'FAILED' }
          : prev);
      });
    } catch (error) {
      setImageUpload(null);
      setImagePreview(null);
      appToast.error('이미지 업로드에 실패했습니다', error);
    } finally {
      setIsImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { appToast.error('모임 이름을 입력해주세요'); return; }
    if (isImageUploading) {
      appToast.info('이미지 업로드가 끝난 뒤 모임을 만들 수 있습니다');
      return;
    }
    setIsUploading(true);
    try {
      trackEvent('group_create_start', { has_image: Boolean(imageUpload?.imageId) });
      const result = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        imageId: imageUpload?.imageId,
        imageUrl: imageUpload?.url,
        visibility,
      });

      appToast.success('모임이 생성되었습니다');
      navigate(`/groups/${result.id}`);
    } catch (error) { appToast.error('모임 생성에 실패했습니다', error, '모임 생성 중 오류가 발생했습니다.'); } finally { setIsUploading(false); }
  };

  return (
    <MobileLayout>
      <PageHeader title="새 모임 만들기" showBack backTo="/groups" />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">모임 사진</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {imagePreview ? (
                <div className="relative w-20 h-20">
                  <img src={imagePreview} alt="모임 이미지 미리보기" className="w-20 h-20 rounded-xl object-cover border border-border" />
                  <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"><X className="w-3.5 h-3.5" /></button>
                  {isImageUploading || imageUpload?.status === 'PROCESSING' ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : null}
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/40 transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">사진 추가</span>
                </button>
              )}
            </div>
            <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">모임을 대표하는 사진을 추가하세요.<br />15MB 이하의 jpg, png, webp 파일만 가능합니다.</p>
          </div>
          {imageUpload?.status || isImageUploading ? (
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              {getProcessingImageLabel(isImageUploading ? 'PROCESSING' : imageUpload?.status)}
            </p>
          ) : null}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">모임 이름 <span className="text-destructive">*</span></label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="모임 이름을 입력하세요" className="bg-card border-border" maxLength={30} />
          <p className="text-[11px] text-muted-foreground text-right">{name.length}/30</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">모임 설명</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="모임에 대한 간단한 설명을 입력하세요 (선택)" className="bg-card border-border min-h-[100px] resize-none" maxLength={200} />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/200</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">공개 설정</label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setVisibility('PRIVATE')}
              className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${visibility === 'PRIVATE' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
            >
              비공개
            </button>
            <button
              type="button"
              onClick={() => setVisibility('PUBLIC')}
              className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${visibility === 'PUBLIC' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
            >
              공개
            </button>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {visibility === 'PUBLIC'
              ? '커뮤니티에서 발견될 수 있고, 가입은 관리자 승인 후 완료됩니다.'
              : '초대 링크를 받은 사람만 참여할 수 있습니다.'}
          </p>
        </div>
        <div className="p-4 bg-category-group/10 rounded-xl border border-category-group/20">
          <h4 className="text-xs font-semibold text-category-group mb-1.5">모임 생성 후 안내</h4>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• 모임 상세 페이지에서 멤버를 초대할 수 있어요</li>
            <li>• 공유 링크로 간편하게 초대가 가능해요</li>
            <li>• 모임 일정 조율 기능을 사용할 수 있어요</li>
          </ul>
        </div>
        <button type="submit" disabled={isUploading || isImageUploading} className="w-full py-3.5 bg-category-group text-white rounded-xl text-sm font-bold hover:bg-category-group/90 transition-colors disabled:opacity-50">
          {isUploading ? '생성 중...' : isImageUploading ? '이미지 업로드 중...' : '모임 만들기'}
        </button>
      </form>
      {cropSourceFile ? (
        <ImageCropModal
          file={cropSourceFile}
          title="모임 사진 맞추기"
          description="모임 목록에 보일 영역을 조정하세요."
          outputNamePrefix="group"
          onClose={() => {
            setCropSourceFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </MobileLayout>
  );
};

export default GroupFormPage;
