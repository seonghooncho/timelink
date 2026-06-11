import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, onClose, onConfirm, title, description,
  confirmLabel = '확인', cancelLabel = '취소', variant = 'default',
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 app-layer-critical flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
          <motion.div
            className="relative bg-card rounded-xl border-2 border-destructive p-6 mx-6 w-full max-w-sm shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <p className="text-center text-sm font-medium text-foreground">{title}</p>
            {description && (
              <p className="text-center text-xs text-muted-foreground mt-1">{description}</p>
            )}
            <div className="flex gap-3 mt-5 justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
