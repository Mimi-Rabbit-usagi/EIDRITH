import { useEffect, useRef } from 'react';

export default function TechniqueModal({ technique, onClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!technique) return;
    timerRef.current = setTimeout(onClose, 6000);
    return () => clearTimeout(timerRef.current);
  }, [technique, onClose]);

  if (!technique) return null;

  return (
    <div className="technique-overlay" onClick={onClose}>
      <div
        className="technique-card"
        style={{ borderColor: technique.color }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="technique-header">
          <span className="technique-icon">{technique.icon}</span>
          <div>
            <div className="technique-badge" style={{ backgroundColor: technique.color }}>
              テクニック発動！
            </div>
            <h3 className="technique-name">{technique.name}</h3>
            <p className="technique-name-en">{technique.nameEn}</p>
          </div>
        </div>

        {/* Description */}
        <p className="technique-description">{technique.description}</p>

        {/* Detail */}
        <div className="technique-detail">
          <span className="technique-detail-label">詳細</span>
          <p className="technique-detail-text">{technique.detail}</p>
        </div>

        {/* Close button */}
        <button className="technique-close-btn" onClick={onClose}>
          わかった！
        </button>

        {/* Auto-close progress bar */}
        <div className="technique-progress-bar">
          <div className="technique-progress" style={{ backgroundColor: technique.color }} />
        </div>
      </div>
    </div>
  );
}
