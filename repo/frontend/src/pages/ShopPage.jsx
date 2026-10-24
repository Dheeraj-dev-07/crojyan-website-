import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import { apiRequest } from '../services/api';
import { Package, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'All Items' },
  { value: 'bouquet', label: 'Bouquets' },
  { value: 'flower_pot', label: 'Flower Pots' },
  { value: 'key_chain', label: 'Key Chains' },
  { value: 'other', label: 'Other Items' }
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(true);

  const currentAvailability = searchParams.get('availability') || '';
  const currentCategory = searchParams.get('category') || '';
  const priceMin = searchParams.get('priceMin') || '';
  const priceMax = searchParams.get('priceMax') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (currentCategory) queryParams.set('category', currentCategory);
        if (currentAvailability) queryParams.set('availability', currentAvailability);
        if (priceMin) queryParams.set('priceMin', priceMin);
        if (priceMax) queryParams.set('priceMax', priceMax);
        queryParams.set('page', page.toString());
        queryParams.set('limit', '9');

        const response = await apiRequest(`/products?${queryParams.toString()}`);
        if (response.success) {
          setProducts(response.data);
          setMeta(response.meta || { page: 1, totalPages: 1, totalCount: response.data.length });
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [currentCategory, currentAvailability, priceMin, priceMax, page]);

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-rose-600">
            Handcrafted Catalog
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
            Our Currated Collection of Crochet
          </h1>
        </div>
        <p className="text-stone-500 text-sm">
          Showing {meta.totalCount} handcrafted item(s)
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value || 'all'}
              onClick={() => handleFilterChange('category', value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                currentCategory === value
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear Filters reset button */}
        {(currentCategory || currentAvailability || priceMin || priceMax) && (
          <button
            onClick={() => setSearchParams({})}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        )}

      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <ProductSkeleton key={n} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal">No items match your filter</h3>
          <p className="text-stone-500 text-sm max-w-sm mx-auto">
            Try another category or reset your filters to see more handcrafted items.
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 transition"
          >
            Show All Items
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handleFilterChange('page', pageNum.toString())}
              className={`w-10 h-10 rounded-full text-xs font-bold transition ${
                page === pageNum
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white text-charcoal border border-stone-200 hover:bg-stone-100'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
