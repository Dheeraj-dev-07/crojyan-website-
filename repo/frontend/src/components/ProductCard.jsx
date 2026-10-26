import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ImageOff, ShoppingBag, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, clearCart, setIsCartOpen } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sortedImages = product.images
    ? [...product.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const primaryImageObj =
    sortedImages.find((img) => img.isPrimary) || sortedImages[0];
  const primaryImage =
    primaryImageObj?.url ||
    'https://images.pexels.com/photos/19558765/pexels-photo-19558765.jpeg';

  const secondaryImageObj = sortedImages.find((img) => img !== primaryImageObj);
  const secondaryImage = secondaryImageObj?.url;
  const isSoldOut = product.availability === 'sold_out';

  const handleBuyNow = () => {
    clearCart();
    addToCart(product, {
      ribbonColor: product.customization?.ribbonColors?.[0] || 'Dusty Rose',
      wrappingPaperShade: product.customization?.wrappingPaperShades?.[0] || 'Cream Matte',
      giftCardText: ''
    });
    setIsCartOpen(true);
  };

  const getAvailabilityBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
            In Stock ({product.stockCount})
          </span>
        );
      case 'made_to_order':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
            Made to Order ({product.customization?.defaultLeadTimeDays || 3}d)
          </span>
        );
      case 'sold_out':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200 shadow-2xs">
            Sold Out
          </span>
        );
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-soft hover:shadow-floral hover:border-rose-300 transition-all duration-300 flex flex-col h-full">

      {/* Image Container with Skeleton Loader */}
      <div className="relative aspect-square bg-stone-100 overflow-hidden">

        {/* Availability Badge Overlay */}
        <div className="absolute top-3 left-3 z-10">
          {getAvailabilityBadge(product.availability)}
        </div>

        {/* Skeleton shimmer while loading */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 skeleton-shimmer" />
        )}

        {/* Product Image */}
        {imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-100">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <>
            <img
              src={primaryImage}
              alt={product.title}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(true);
                setImageError(true);
              }}
              className={`w-full h-full object-cover transition-all duration-500 ${
                secondaryImage ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {secondaryImage && (
              <img
                src={secondaryImage}
                alt={`${product.title} alternate view`}
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none"
              />
            )}
          </>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-3 sm:p-5 flex flex-col flex-grow">

        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-600 mb-1">
          <Sparkles className="w-3 h-3" />
          Handcrafted Crochet
        </div>

        <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal group-hover:text-rose-600 transition-colors line-clamp-1">
          {product.title}
        </h3>

        <p className="text-stone-500 text-xs line-clamp-2 mt-1.5 leading-relaxed flex-grow">
          {product.description}
        </p>

        {/* Price and Action Button */}
        <div className="pt-4 mt-4 border-t border-stone-100">
          <div>
            <span className="text-xs text-stone-400 block font-medium">Starting at</span>
            <span className="font-serif text-xl font-bold text-charcoal">
              ₹{product.basePrice}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Link
              to={`/products/${product._id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </Link>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isSoldOut}
              className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isSoldOut ? 'Sold Out' : 'Buy Now'}</span>
              {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
