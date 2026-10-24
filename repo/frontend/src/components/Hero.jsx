import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, HeartHandshake, ShieldCheck, Clock } from 'lucide-react';
import heroBouquetImg from '../assets/hero-bouquet.jpeg';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-rose-50/50 via-canvas to-canvas">

      {/* Subtle Background Decorative Blur Circles */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-rose-200/30 blur-3xl rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-emerald-100/40 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Value Prop & CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100/80 border border-rose-200/80 text-rose-800 text-xs font-semibold tracking-wide uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-spin" />
              <span>Our Currated Love</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-charcoal leading-[1.15]">
              Everlasting blooms <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600">
                handmade with love.
              </span>
            </h1>

            <p className="text-stone-600 text-lg sm:text-xl font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Celebrate life's timeless memories with handcrafted crochet flower bouquets designed to never wilt or fade.
              Based in Indore, we ship our artisan floral creations all over India.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-rose-600 text-white font-medium hover:bg-rose-700 shadow-lg shadow-rose-600/25 hover:shadow-xl hover:shadow-rose-600/35 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <span>Explore Collections</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <a
                href="#craft"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white text-charcoal border border-stone-200 font-medium hover:border-rose-300 hover:bg-rose-50/50 transition-all duration-200"
              >
                Our Studio Story
              </a>
            </div>

            {/* Micro Feature Badges */}
            <div className="pt-8 border-t border-stone-200/70 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start text-emerald-600 gap-1 font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" /> 100% Everlasting
                </div>
                <p className="text-xs text-stone-500">Zero wilting or watering</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start text-amber-600 gap-1 font-semibold text-xs uppercase tracking-wider">
                  <HeartHandshake className="w-4 h-4" /> Artisan Quality
                </div>
                <p className="text-xs text-stone-500">Soft cotton yarn blend</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start text-rose-600 gap-1 font-semibold text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" /> Customized Gifts
                </div>
                <p className="text-xs text-stone-500">Includes gift note & ribbons</p>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Stack */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">

              {/* Main Bouquet Featured Image Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.02] transition-transform duration-500">
                <img
                  src={heroBouquetImg}
                  alt="Blush Rose Crochet Bouquet"
                  className="w-full h-[450px] object-cover"
                />

                {/* Floating Studio Badge */}
                <div className="absolute bottom-6 left-6 right-6 glass-panel rounded-2xl p-4 border border-white/60 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Featured Arrangement</p>
                      <h3 className="font-serif text-lg font-bold text-charcoal">Blue Blooms</h3>
                    </div>
                    <span className="text-xl font-bold text-rose-600 font-serif">Starting ₹899</span>
                  </div>
                </div>
              </div>

              {/* Decorative Pill Badge */}
              <div className="absolute -top-4 -left-4 bg-white px-4 py-2 rounded-2xl shadow-lg border border-stone-100 flex items-center gap-2 animate-bounce">
                <span className="text-xl">🌸</span>
                <span className="text-xs font-bold text-charcoal">3–5 Days Lead Time</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
