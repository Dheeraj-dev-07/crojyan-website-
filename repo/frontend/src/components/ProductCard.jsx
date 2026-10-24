import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ImageOff, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen, cartItems, cartTotal } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showBuySummary, setShowBuySummary] = useState(false);
  const isBouquet = !product.category || product.category === 'bouquet';

  const handleBuyNow = () => {
    addToCart(product, {
      ribbonColor: isBouquet ? (product.customization?.ribbonColors?.[0] || 'Dusty Rose') : '',
      wrappingPaperShade: isBouquet ? (product.customization?.wrappingPaperShades?.[0] || 'Cream Matte') : '',
      giftCardText: ''
    });
    setIsCartOpen(false);
    setShowBuySummary(true);
  };

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
      <div className="p-4 flex flex-col flex-grow min-w-0">

        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-600 mb-1">
          <Sparkles className="w-3 h-3" />
          Handcrafted Crochet
        </div>

        <h3 className="font-serif text-lg font-bold text-charcoal group-hover:text-rose-600 transition-colors line-clamp-1">
          {product.title}
        </h3>

        <p className="text-stone-500 text-xs line-clamp-2 mt-1 leading-snug flex-grow min-h-10 break-words">
          {product.description}
        </p>

        {/* Price and Action Button */}
        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
          <div>
            {/* <span className="text-xs text-stone-400 block font-medium">Starting at</span> */}
            <span className="font-serif text-xl font-bold text-charcoal">
              ₹{product.basePrice}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to={`/products/${product._id}`}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-200"
            >
              <span>{isBouquet ? 'Customize' : 'View'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={product.availability === 'sold_out'}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:border-stone-300"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Buy</span>
            </button>
          </div>
        </div>

      </div>

      {showBuySummary && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="buy-summary-title">
          <button
            type="button"
            aria-label="Close order summary"
            onClick={() => setShowBuySummary(false)}
            className="absolute inset-0 bg-black/40"
          />
          <section className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">Ready to order</p>
                <h2 id="buy-summary-title" className="mt-1 font-serif text-xl font-bold text-charcoal">Order Summary</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBuySummary(false)}
                aria-label="Close order summary"
                className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-charcoal"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {cartItems.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 rounded-xl border border-stone-200 p-3">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-20 w-20 rounded-lg bg-stone-100 object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-charcoal">{item.title}</h3>
                    <p className="mt-1 text-xs text-stone-500">Quantity: {item.quantity}</p>
                    {item.selectedCustomization?.ribbonColor && (
                      <p className="mt-1 text-xs text-stone-500">Ribbon: {item.selectedCustomization.ribbonColor}</p>
                    )}
                    <p className="mt-2 text-sm font-bold text-charcoal">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="space-y-4 border-t border-stone-200 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-600">Total</span>
                <span className="font-serif text-xl font-bold text-charcoal">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Proceed to Delivery & Payment <ArrowRight className="h-4 w-4" />
              </button>
            </footer>
          </section>
        </div>
      )}

    </div>
  );
}
