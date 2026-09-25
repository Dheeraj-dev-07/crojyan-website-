import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiRequest } from '../services/api';
import { ShieldCheck, Truck, AlertTriangle, ArrowRight, Loader2, Ribbon, Gift } from 'lucide-react';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [staleCartItems, setStaleCartItems] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setSubmitting(true);
    setErrorMessage(null);
    setStaleCartItems([]);

    const payload = {
      customer: {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        deliveryAddress: {
          addressLine: formData.addressLine,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        }
      },
      items: cartItems.map((item) => ({
        bouquetId: item.bouquetId,
        selectedCustomization: {
          ribbonColor: item.selectedCustomization.ribbonColor,
          wrappingPaperShade: item.selectedCustomization.wrappingPaperShade,
          giftCardText: item.selectedCustomization.giftCardText || ''
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    try {
      const response = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        clearCart();
        navigate(`/order-success/${response.data.orderId}`, { state: { order: response.data } });
      }
    } catch (err) {
      if (err.code === 'ERR_STALE_CART_ITEM' && err.details) {
        setStaleCartItems(err.details);
        setErrorMessage(err.message || 'Cart contains stale pricing or unavailable items.');
      } else {
        setErrorMessage(err.message || 'Failed to place order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-charcoal">Your Cart is Empty</h2>
        <p className="text-stone-500 text-sm">Please add handcrafted bouquets to your basket before checkout.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold"
        >
          Browse Bouquets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-rose-600">
          Guest Checkout
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal">Delivery & Order Review</h1>
      </div>

      {/* ERR_STALE_CART_ITEM Inline Alert Banner */}
      {staleCartItems.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <span>Stale Cart Notice: Price or Availability Updated</span>
          </div>
          <p className="text-xs text-rose-700">
            {errorMessage} Please review the updated item details below:
          </p>
          <div className="space-y-2">
            {staleCartItems.map((stale, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-rose-200 text-xs text-charcoal flex justify-between items-center">
                <div>
                  <span className="font-bold block">{stale.title || 'Bouquet'}</span>
                  <span className="text-stone-500">{stale.message}</span>
                </div>
                {stale.currentUnitPrice && (
                  <span className="font-bold text-rose-600">${stale.currentUnitPrice.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
            >
              Update Basket & Shop <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Customer Shipping Form */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-charcoal flex items-center gap-2">
              <Truck className="w-5 h-5 text-rose-500" /> Customer & Delivery Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Phone Number (For Delivery Updates)</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Email Address (Order Receipt)</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Street Address</label>
              <input
                type="text"
                name="addressLine"
                required
                value={formData.addressLine}
                onChange={handleChange}
                placeholder="123 Floral Garden Lane"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="NY"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="10001"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

          </div>

          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Note:</strong> Order will be placed directly under <code className="bg-amber-100 px-1 rounded font-bold">PENDING_REVIEW</code> status for artisan review before crafting begins. No payment details required.
            </span>
          </div>

        </div>

        {/* Order Summary & Submit Button */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-charcoal">Bouquet Order Summary</h3>

            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1 space-y-3">
              {cartItems.map((item) => (
                <div key={item.cartItemId} className="pt-3 flex gap-3">
                  <img src={item.image} alt={item.title} className="w-14 h-14 rounded-lg object-cover bg-stone-100" />
                  <div className="flex-grow text-xs space-y-0.5">
                    <h4 className="font-serif font-bold text-charcoal">{item.title}</h4>
                    <p className="text-stone-500 flex items-center gap-1">
                      <Ribbon className="w-3 h-3 text-rose-500" /> {item.selectedCustomization.ribbonColor}
                    </p>
                    {item.selectedCustomization.giftCardText && (
                      <p className="text-rose-600 font-medium flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Note: "{item.selectedCustomization.giftCardText.slice(0, 30)}..."
                      </p>
                    )}
                    <span className="text-stone-400">Qty: {item.quantity} x ${item.unitPrice.toFixed(2)}</span>
                  </div>
                  <span className="font-serif font-bold text-sm text-charcoal">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-200 space-y-2 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Items Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Handcrafting & Packing</span>
                <span className="text-emerald-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between font-serif text-xl font-bold text-charcoal pt-2 border-t border-stone-100">
                <span>Total Amount</span>
                <span className="text-rose-600">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-full bg-rose-600 text-white font-bold text-sm shadow-lg hover:bg-rose-700 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Placing Order...
                </>
              ) : (
                <>
                  <span>Place Order (${cartTotal.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>

        </div>

      </form>

    </div>
  );
}
