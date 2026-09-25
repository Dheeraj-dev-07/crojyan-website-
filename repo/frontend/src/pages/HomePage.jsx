import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import { apiRequest } from '../services/api';
import { Flower2, Heart, Sparkles, ShieldCheck, ArrowRight, Scissors } from 'lucide-react';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiRequest('/products?limit=6');
        if (response.success) {
          setFeaturedProducts(response.data);
        }
      } catch (err) {
        console.error('Failed to load featured products', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <Hero />

      {/* Featured Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Favorites</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              Handcrafted Forever Bouquets
            </h2>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-semibold text-sm group"
          >
            <span>View All Bouquets</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <ProductSkeleton key={n} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Our Crafting Process Section */}
      <section id="craft" className="bg-rose-50/60 py-20 border-y border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-600">
              The Artisan Promise
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
              How Each Bouquet is Born
            </h2>
            <p className="text-stone-600 text-sm">
              Every flower stem is individually crocheted by hand using premium soft yarn, shaped around flexible floral wire, and wrapped in eco-friendly parchment paper.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-soft space-y-4 text-center group hover:-translate-y-1 transition duration-300">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto group-hover:bg-rose-600 group-hover:text-white transition duration-300">
                <Scissors className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal">1. Stem & Petal Stitching</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Hundreds of painstaking stitches create textured petals, realistic sepals, and sturdy green stems using 100% combed cotton yarn.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-soft space-y-4 text-center group hover:-translate-y-1 transition duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto group-hover:bg-amber-500 group-hover:text-white transition duration-300">
                <Flower2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal">2. Custom Wrapping & Ribbon</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Choose your favorite ribbon shade and parchment paper tones. We tailor-wrap every arrangement according to your selection.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-soft space-y-4 text-center group hover:-translate-y-1 transition duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto group-hover:bg-emerald-600 group-hover:text-white transition duration-300">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal">3. Personalized Gift Note</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Add a heartfelt handwritten gift note card. We carefully insert your note before placing the bouquet into a protective keepsake box.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-stone-900 text-white p-10 sm:p-16 overflow-hidden shadow-2xl">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Memories That Never Fade</span>
            </div>
            
            <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
              Ready to Gift a Forever Bouquet?
            </h2>
            
            <p className="text-stone-300 text-sm leading-relaxed">
              Whether celebrating anniversaries, graduations, or cozy home decor, our crochet flowers offer everlasting warmth.
            </p>

            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-rose-600 text-white font-semibold text-sm shadow-lg hover:bg-rose-500 transition duration-300"
            >
              <span>Order Your Custom Bouquet</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
