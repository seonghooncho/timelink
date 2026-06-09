import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateGroup } from '@/hooks/useGroups';
import { storageApi } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { Camera, X } from 'lucide-react';

const GroupFormPage: React.FC = () => {
  const navigate = useNavigate();
  const createGroupMutation = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { appToast.error('이미지 파일만 업로드 가능합니다'); return; }
    if (file.size > 5 * 1024 * 1024) { appToast.error('이미지 크기는 5MB 이하여야 합니다'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const result = await storageApi.uploadGroupImage(imageFile);
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { appToast.error('그룹 이름을 입력해주세요'); return; }
    setIsUploading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage();

      const result = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl || undefined,
      });

      appToast.success('그룹이 생성되었습니다');
      navigate(`/groups/${result.id}`);
    } catch (error) { appToast.error('그룹 생성에 실패했습니다', error, '그룹 생성 중 오류가 발생했습니다.'); } finally { setIsUploading(false); }
  };

  return (
    <MobileLayout>
      <PageHeader title="새 그룹 만들기" showBack />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">그룹 사진</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {imagePreview ? (
                <div className="relative w-20 h-20">
                  <img src={imagePreview} alt="그룹 이미지 미리보기" className="w-20 h-20 rounded-xl object-cover border border-border" />
                  <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/40 transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">사진 추가</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex-1">그룹을 대표하는 사진을 추가하세요.<br />5MB 이하의 이미지 파일만 가능합니다.</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">그룹 이름 <span className="text-destructive">*</span></label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="그룹 이름을 입력하세요" className="bg-card border-border" maxLength={30} />
          <p className="text-[11px] text-muted-foreground text-right">{name.length}/30</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">그룹 설명</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="그룹에 대한 간단한 설명을 입력하세요 (선택)" className="bg-card border-border min-h-[100px] resize-none" maxLength={200} />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/200</p>
        </div>
        <div className="p-4 bg-category-group/10 rounded-xl border border-category-group/20">
          <h4 className="text-xs font-semibold text-category-group mb-1.5">💡 그룹 생성 후</h4>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• 그룹 상세 페이지에서 멤버를 초대할 수 있어요</li>
            <li>• 공유 링크로 간편하게 초대가 가능해요</li>
            <li>• 그룹 일정 조율 기능을 사용할 수 있어요</li>
          </ul>
        </div>
        <button type="submit" disabled={isUploading} className="w-full py-3.5 bg-category-group text-white rounded-xl text-sm font-bold hover:bg-category-group/90 transition-colors disabled:opacity-50">
          {isUploading ? '생성 중...' : '그룹 만들기'}
        </button>
      </form>
      <div className="h-24" />
    </MobileLayout>
  );
};

export default GroupFormPage;
