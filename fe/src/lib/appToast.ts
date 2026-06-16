import { toast } from 'sonner';
import { trackProductEvent } from '@/lib/productAnalytics';

type ToastOptions = {
  description?: string;
};

export const getErrorMessage = (error: unknown, fallback = '잠시 후 다시 시도해주세요.') => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const showToast = (
  method: (message: string, options?: ToastOptions) => string | number,
  message: string,
  description?: string,
) => {
  if (description) {
    method(message, { description });
    return;
  }

  method(message);
};

export const appToast = {
  success(message: string, description?: string) {
    showToast(toast.success, message, description);
  },
  error(message: string, errorOrDescription?: unknown, fallbackDescription?: string) {
    const description = typeof errorOrDescription === 'string'
      ? errorOrDescription
      : errorOrDescription
        ? getErrorMessage(errorOrDescription, fallbackDescription)
        : fallbackDescription;

    trackProductEvent('error_shown', {
      feature: featureFromErrorMessage(message),
      error_code: errorCodeFromMessage(message),
      severity: 'error',
    });
    showToast(toast.error, message, description);
  },
  info(message: string, description?: string) {
    showToast(toast.info, message, description);
  },
};

function errorCodeFromMessage(message: string) {
  if (message.includes('로그인')) return 'auth_error';
  if (message.includes('동의')) return 'consent_error';
  if (message.includes('초대') || message.includes('가입')) return 'join_error';
  if (message.includes('모임')) return 'group_error';
  if (message.includes('조율')) return 'coordination_error';
  if (message.includes('일정') || message.includes('약속')) return 'schedule_error';
  if (message.includes('게시') || message.includes('댓글') || message.includes('좋아요')) return 'community_error';
  if (message.includes('알림')) return 'notification_error';
  if (message.includes('프로필') || message.includes('닉네임')) return 'profile_error';
  if (message.includes('이미지') || message.includes('사진')) return 'image_error';
  return 'unknown_error';
}

function featureFromErrorMessage(message: string) {
  if (message.includes('로그인') || message.includes('동의')) return 'auth';
  if (message.includes('모임') || message.includes('초대') || message.includes('가입')) return 'groups';
  if (message.includes('일정') || message.includes('약속') || message.includes('조율')) return 'schedule';
  if (message.includes('게시') || message.includes('댓글') || message.includes('좋아요')) return 'community';
  if (message.includes('알림') || message.includes('닉네임') || message.includes('프로필')) return 'settings';
  return 'unknown';
}
