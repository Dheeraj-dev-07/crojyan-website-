import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Gift, Ribbon } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">

      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-canvas shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-300">

          {/* Drawer Header */}
          <div className="p-6 border-b border-stone-200/80 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-charcoal">Your Floral Basket</h2>
                <p className="text-xs text-stone-500">{cartItems.length} bouquet selection(s)</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal">Your basket is empty</h3>
                <p className="text-sm text-stone-500 max-w-xs">
                  Discover our handcrafted crochet bouquets lovingly stitched for everlasting memories.
                </p>
                <Link
                  to="/shop"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 text-white text-xs font-semibold shadow-md hover:bg-rose-700 transition"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs flex gap-4 relative group"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                  />

                  <div className="flex-grow space-y-1.5 pr-6">
                    <h4 className="font-serif font-bold text-sm text-charcoal line-clamp-1">
                      {item.title}
                    </h4>

                    {/* Customization Details */}
                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Ribbon className="w-3 h-3 text-rose-500" />
                        <span>Ribbon: {item.selectedCustomization.ribbonColor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        <span>Wrapper: {item.selectedCustomization.wrappingPaperShade}</span>
                      </div>
                      {item.selectedCustomization.giftCardText && (
                        <div className="flex items-center gap-1 text-rose-600 font-medium line-clamp-1">
                          <Gift className="w-3 h-3" />
                          <span>Gift Note Included</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-serif font-bold text-sm text-rose-600">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="absolute top-3 right-3 text-stone-400 hover:text-rose-600 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-stone-200 bg-white space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-xs">
                  <span>Shipping & Delivery</span>
                  <span className="text-emerald-600 font-semibold">Calculated at Checkout</span>
                </div>
                <div className="flex justify-between font-serif text-lg font-bold text-charcoal pt-2 border-t border-stone-100">
                  <span>Total</span>
                  <span className="text-rose-600">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <Link
                to="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-rose-600 text-white font-semibold text-sm shadow-md hover:bg-rose-700 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
