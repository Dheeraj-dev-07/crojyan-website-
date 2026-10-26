import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, Sparkles } from 'lucide-react';

/**
 * Cloudinary URL transformation helper
 */
export const getOptimizedImageUrl = (url, transformStr) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('/upload/') && !url.includes('/upload/w_')) {
    return url.replace('/upload/', `/upload/${transformStr}/`);
  }
  return url;
};

export default function ProductGallery({ images = [], productTitle = 'Bouquet' }) {
  // Sort images by order if present
  const sortedImages = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  // Primary image or first image as initial selection
  const initialIndex = Math.max(
    0,
    sortedImages.findIndex((img) => img.isPrimary)
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const lightboxRef = useRef(null);

  // Sync active index if sortedImages changes
  useEffect(() => {
    const primaryIdx = sortedImages.findIndex((img) => img.isPrimary);
    if (primaryIdx !== -1) {
      setActiveIndex(primaryIdx);
    } else {
      setActiveIndex(0);
    }
  }, [images]);

  // Lock body scroll when Lightbox is open & handle keyboard events
  useEffect(() => {
    if (!isLightboxOpen) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus trap setup
    if (lightboxRef.current) {
      lightboxRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % sortedImages.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, sortedImages.length]);

  // Preload next and previous images when lightbox is open
  useEffect(() => {
    if (!isLightboxOpen || sortedImages.length <= 1) return;

    const nextIndex = (activeIndex + 1) % sortedImages.length;
    const prevIndex = (activeIndex - 1 + sortedImages.length) % sortedImages.length;

    [nextIndex, prevIndex].forEach((idx) => {
      const src = getOptimizedImageUrl(sortedImages[idx]?.url, 'w_1600,f_auto,q_auto');
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [isLightboxOpen, activeIndex, sortedImages]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped Left -> Next Image
        setActiveIndex((prev) => (prev + 1) % sortedImages.length);
      } else {
        // Swiped Right -> Previous Image
        setActiveIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
      }
    }
    setTouchStartX(null);
  };

  if (sortedImages.length === 0) {
    return (
      <div className="aspect-square max-w-[420px] bg-stone-100 rounded-3xl flex items-center justify-center text-stone-400 text-sm">
        No images available
      </div>
    );
  }

  const currentImage = sortedImages[activeIndex] || sortedImages[0];
  const mainPdpUrl = getOptimizedImageUrl(currentImage.url, 'w_800,f_auto,q_auto');
  const lightboxUrl = getOptimizedImageUrl(currentImage.url, 'w_1600,f_auto,q_auto');

  return (
    <div className="mx-auto w-full max-w-[420px] space-y-4">
      {/* Large Main Display Card */}
      <div className="relative aspect-square bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-soft group">
        <img
          src={mainPdpUrl}
          alt={`${productTitle} — photo ${activeIndex + 1}`}
          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Expand Lightbox Button Overlay */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          aria-label="Open full-screen photo lightbox"
          className="absolute bottom-4 right-4 bg-stone-900/70 hover:bg-stone-900 text-white p-2.5 rounded-full backdrop-blur-md transition shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Image Counter Pill */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-charcoal shadow-2xs border border-white/60">
          {activeIndex + 1} / {sortedImages.length}
        </div>
      </div>

      {/* Thumbnail Strip (Horizontal Scroll for Mobile) */}
      {sortedImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-rose-200">
          {sortedImages.map((img, idx) => {
            const thumbUrl = getOptimizedImageUrl(img.url, 'w_160,f_auto,q_auto');
            const isActive = idx === activeIndex;
            return (
              <button
                key={img.public_id || idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`View photo ${idx + 1} of ${sortedImages.length}`}
                className={`relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isActive
                    ? 'border-rose-600 scale-95 shadow-md ring-2 ring-rose-300'
                    : 'border-transparent opacity-75 hover:opacity-100 hover:scale-100'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`${productTitle} — thumbnail ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {img.isPrimary && (
                  <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] px-1 rounded font-bold shadow-xs">
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div
          ref={lightboxRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo gallery lightbox for ${productTitle}`}
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200 focus:outline-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLightboxOpen(false);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between z-10">
            <div className="text-white">
              <h4 className="font-serif font-bold text-base sm:text-lg">{productTitle}</h4>
              <p className="text-xs text-stone-400">
                Photo {activeIndex + 1} of {sortedImages.length}
              </p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close lightbox"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Main Image & Nav Controls */}
          <div className="relative flex-1 flex items-center justify-center my-4">
            {/* Prev Button */}
            {sortedImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
                }}
                aria-label="Previous photo"
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Lightbox Image */}
            <img
              src={lightboxUrl}
              alt={`${productTitle} — full photo ${activeIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next Button */}
            {sortedImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev + 1) % sortedImages.length);
                }}
                aria-label="Next photo"
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white transition shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Strip */}
          {sortedImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10">
              {sortedImages.map((img, idx) => {
                const thumbUrl = getOptimizedImageUrl(img.url, 'w_160,f_auto,q_auto');
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={img.public_id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(idx);
                    }}
                    aria-label={`Go to photo ${idx + 1}`}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition focus:outline-none ${
                      isActive ? 'border-rose-500 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
