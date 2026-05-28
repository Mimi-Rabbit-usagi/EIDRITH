import { useEffect } from 'react';

export default function UnlockToast({ unlock, onClose }) {
  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [unlock, onClose]);

  if (!unlock) return null;

  return (
    <div className="unlock-toast">
      <span className="unlock-toast-icon">🎉</span>
      <div className="unlock-toast-body">
        <p className="unlock-toast-title">アンロック！</p>
        <p className="unlock-toast-name">{unlock.emoji} {unlock.name} をゲット！</p>
        <p className="unlock-toast-desc">{unlock.description}</p>
      </div>
      <button className="unlock-toast-close" onClick={onClose}>✕</button>
    </div>
  );
}
