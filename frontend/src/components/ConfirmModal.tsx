import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[#1A1A1E] border border-[#35353B] rounded-2xl p-6 shadow-2xl relative text-left">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDestructive ? "bg-[#6A040F]/40 text-[#D00000]" : "bg-[#2A2A2F] text-amber-400"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-display font-semibold text-lg text-[#F3F3F4]">
            {title}
          </h3>
        </div>

        <p className="text-xs text-[#9E9EA7] leading-relaxed mb-6 font-sans">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#35353B]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-[#2A2A2F] hover:bg-[#35353B] text-xs font-semibold text-[#9E9EA7] hover:text-[#F3F3F4] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
              isDestructive
                ? "bg-[#D00000] hover:bg-[#b00000] text-white shadow-lg shadow-[#D00000]/20"
                : "bg-[#F3F3F4] hover:bg-white text-[#0E0E10]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
