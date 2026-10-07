import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Flower2, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { totalItemCount, setIsCartOpen } = useCart();
  const { isAdminAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isStorefrontPage = !location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-stone-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Flower2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-charcoal group-hover:text-rose-600 transition-colors">
                Crojyan
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-stone-500 font-semibold -mt-1">
                Crochet & Gift Shop
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-charcoal-light">
            <Link
              to="/"
              className={`transition-colors hover:text-rose-600 ${
                isActive('/') ? 'text-rose-600 font-semibold' : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className={`transition-colors hover:text-rose-600 ${
                isActive('/shop') ? 'text-rose-600 font-semibold' : ''
              }`}
            >
              Bouquet Catalog
            </Link>
            <Link
              to="/#craft"
              className="transition-colors hover:text-rose-600"
            >
              Our Craft
            </Link>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            
            {/* Admin Profile Button - Rendered ONLY on Storefront when Admin Session is Active */}
            {isStorefrontPage && isAdminAuthenticated && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold hover:bg-rose-600 hover:text-white transition-all shadow-xs border border-rose-200 group"
                title="Go to Admin Dashboard"
              >
                <ShieldCheck className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
                <span className="hidden sm:inline">Admin Profile</span>
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-white text-charcoal shadow-sm hover:shadow-md border border-stone-200 hover:border-rose-300 transition-all duration-200 flex items-center justify-center group"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 text-stone-700 group-hover:text-rose-600 transition-colors" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-charcoal hover:bg-stone-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-canvas border-b border-stone-200 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-charcoal hover:bg-rose-50 hover:text-rose-600"
          >
            Home
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-charcoal hover:bg-rose-50 hover:text-rose-600"
          >
            Bouquet Catalog
          </Link>
          {isStorefrontPage && isAdminAuthenticated && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-semibold text-rose-700 bg-rose-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              Admin Profile
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
