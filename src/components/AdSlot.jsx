import { useEffect, useRef } from 'react';
import { useSettings } from '../store.jsx';

/**
 * Renders a real AdSense unit when configured, otherwise a neutral placeholder.
 * Ads are always visually separated from content and never placed next to
 * misleading buttons.
 */
export default function AdSlot({ slot, label = 'Advertisement', className = '' }) {
  const { settings } = useSettings();
  const ref = useRef(null);

  const enabled = settings.ads_enabled === '1' || settings.ads_enabled === 'true';
  const publisherId = (settings.adsense_publisher_id || '').trim();
  const slotId = (settings[slot] || '').trim();
  const canRender = enabled && publisherId && slotId;

  useEffect(() => {
    if (!canRender) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not loaded yet — safe to ignore */
    }
  }, [canRender, slotId]);

  if (!canRender) {
    return (
      <aside className={`ad-slot ad-slot--placeholder ${className}`} aria-hidden="true">
        <span className="ad-slot__label">{label}</span>
        <span className="ad-slot__hint">Ad space — configure in Admin → Settings</span>
      </aside>
    );
  }

  return (
    <aside className={`ad-slot ${className}`} aria-label={label}>
      <span className="ad-slot__label">{label}</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
