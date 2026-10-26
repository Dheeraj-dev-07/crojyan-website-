import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import crojyanLogo from '../assets/crojyan-logo.png';

export default function Navbar() {
  const { totalItemCount, setIsCartOpen } = useCart();
  const { isAdminAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isStorefrontPage = !location.pathname.startsWith('/admin');
  const navLinkClass = (active) =>
    `rounded-md transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-4 ${
      active ? 'text-rose-600 font-semibold' : ''
    }`;

  useEffect(() => {
    if (location.pathname === '/' && location.hash === '#craft') {
      requestAnimationFrame(() => document.getElementById('craft')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [location.pathname, location.hash]);

  const handleCraftClick = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-stone-200/60 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Brand Logo */}
          <Link
            to="/"
            aria-label="Crojyan home"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-stone-200/80 transition-shadow duration-300 hover:shadow-md sm:h-[72px] sm:w-[72px]"
          >
            <img
              src={crojyanLogo}
              alt="Crojyan - Handmade with Love"
              width="72"
              height="72"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-charcoal-light">
            <Link
              to="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className={navLinkClass(isActive('/'))}
            >
              Home
            </Link>
            <Link
              to="/shop"
              aria-current={isActive('/shop') ? 'page' : undefined}
              className={navLinkClass(isActive('/shop'))}
            >
              Our Catalog
            </Link>
            <Link
              to="/#craft"
              onClick={handleCraftClick}
              className={navLinkClass(false)}
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
              onClick={() => {
                setMobileMenuOpen(false);
                setIsCartOpen(true);
              }}
              className="relative p-2.5 rounded-full bg-white text-charcoal shadow-sm hover:shadow-md border border-stone-200 hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all duration-200 flex items-center justify-center group"
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
              className="md:hidden p-2 rounded-lg text-charcoal hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden bg-canvas border-b border-stone-200 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            aria-current={isActive('/') ? 'page' : undefined}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(isActive('/'))}`}
          >
            Home
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            aria-current={isActive('/shop') ? 'page' : undefined}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(isActive('/shop'))}`}
          >
            Our Catalog
          </Link>
          <Link
            to="/#craft"
            onClick={handleCraftClick}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(false)}`}
          >
            Our Craft
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
        </nav>
      )}
    </header>
  );
}
