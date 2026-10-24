import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useCart } from '../context/CartContext';
import { Sparkles, Clock, ShieldCheck, Heart, Gift, Plus, Minus, ArrowLeft, Loader2, Check } from 'lucide-react';

import ProductGallery from '../components/ProductGallery';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRibbon, setSelectedRibbon] = useState('');
  const [selectedWrapper, setSelectedWrapper] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await apiRequest(`/products/${id}`);
        if (response.success) {
          const p = response.data;
          setProduct(p);
          setSelectedRibbon('');
          setSelectedWrapper(p.customization?.wrappingPaperShades?.[0] || 'Cream Matte');
        }
      } catch (err) {
        setError(err.message || 'Failed to load bouquet details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(
      product,
      {
        ribbonColor: isBouquet ? selectedRibbon : '',
        wrappingPaperShade: isBouquet ? selectedWrapper : '',
        giftCardText: isBouquet ? giftNote : ''
      },
      quantity
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-canvas">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-charcoal">Bouquet Not Found</h2>
        <p className="text-stone-500 text-sm">{error || "The requested bouquet isn't available."}</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const isSoldOut = product.availability === 'sold_out';
  // Older catalog records may not include a category; those are bouquets by default.
  const isBouquet = !product.category || product.category === 'bouquet';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

      {/* Breadcrumb back button */}
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-stone-500 hover:text-rose-600 text-xs font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* Product details stay in the left column while the gallery remains fixed beside them. */}
        <div className="order-2 lg:order-2 lg:col-span-6 lg:col-start-7 space-y-6">

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Forever Crochet Collection
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              {product.title}
            </h1>
            <p className="text-stone-500 text-sm mt-3 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Product Specs Box */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-charcoal flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" /> Product Specifications
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs text-stone-600">
              <div>
                <span className="text-stone-400 block">Stem Count:</span>
                <span className="font-semibold text-charcoal">{product.stemCount} Handcrafted Stems</span>
              </div>
              <div>
                <span className="text-stone-400 block">Dimensions:</span>
                <span className="font-semibold text-charcoal">
                  {product.dimensions?.heightCm}cm (H) x {product.dimensions?.widthCm}cm (W)
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Material:</span>
                <span className="font-semibold text-charcoal">100% Combed Cotton Yarn</span>
              </div>
              <div>
                <span className="text-stone-400 block">Crafting Time:</span>
                <span className="font-semibold text-charcoal">{product.customization?.defaultLeadTimeDays || 3} Business Days</span>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-3 pt-2 border-t border-stone-200">
            <span className="font-serif text-3xl font-bold text-rose-600">
              ₹{product.basePrice}
            </span>
            <span className="text-xs text-stone-400">Tax included</span>
          </div>

          {/* Bouquet options apply to bouquet products only. */}
          {isBouquet && <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-5">

            {/* Free-text flower color preference */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Flower Color
              </label>
              <input
                type="text"
                value={selectedRibbon}
                onChange={(e) => setSelectedRibbon(e.target.value)}
                placeholder="Enter your preferred flower color"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Handwritten Gift Card Textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-rose-500" />
                  Handwritten Gift Card Note (Optional)
                </label>
                <span className="text-[11px] text-stone-400">{giftNote.length}/300</span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="Write your custom message here (e.g. Happy Anniversary my love!). We will handwrite this on a floral card."
                className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              />
            </div>

          </div>}

          {/* Quantity & Add to Cart Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">

              {/* Quantity incrementer */}
              <div className="flex items-center border border-stone-200 rounded-full bg-white px-3 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 text-stone-600 hover:text-rose-600"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-bold text-sm text-charcoal">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 text-stone-600 hover:text-rose-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add To Cart CTA Button */}
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={`flex-grow py-4 px-8 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition duration-300 ${isSoldOut
                  ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/25'
                  }`}
              >
                {addedToast ? (
                  <>
                    <Check className="w-5 h-5" /> Added to Basket!
                  </>
                ) : isSoldOut ? (
                  'Currently Sold Out'
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Add to Basket — ${(product.basePrice * quantity).toFixed(2)}
                  </>
                )}
              </button>

            </div>

            {/* Delivery Timeline Notice */}
            <div className="p-4 rounded-xl bg-stone-100/70 border border-stone-200/60 text-xs text-stone-600 flex items-center gap-3">
              <Clock className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span>
                <strong>Handcrafting Lead Time:</strong> Handcrafted to order within {product.customization?.defaultLeadTimeDays || 3} business days prior to dispatch.
              </span>
            </div>

          </div>

        </div>

        {/* Square sticky product gallery on the left while the details remain alongside it. */}
        <div className="order-1 lg:order-1 lg:col-span-6 lg:col-start-1 lg:sticky lg:top-24 lg:max-w-[500px] lg:justify-self-start">
          <ProductGallery images={product.images} productTitle={product.title} />
        </div>

      </div>

    </div>
  );
}
