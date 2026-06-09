import { toast } from 'sonner';

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

    showToast(toast.error, message, description);
  },
  info(message: string, description?: string) {
    showToast(toast.info, message, description);
  },
};
