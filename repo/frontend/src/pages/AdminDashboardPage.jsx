import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  Package,
  ShoppingBag,
  Plus,
  Trash2,
  Edit,
  Upload,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Ribbon,
  Gift,
  Clock,
  Star,
  GripVertical,
  MoveLeft,
  MoveRight,
  Image as ImageIcon
} from 'lucide-react';

const ALLOWED_TRANSITIONS = {
  AWAITING_PAYMENT: [],
  PAYMENT_FAILED: [],
  PENDING_REVIEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CRAFTING', 'CANCELLED'],
  CRAFTING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

// Revoke object URLs to avoid memory leaks
const cleanupBlobUrls = (items) => {
  (items || []).forEach((item) => {
    if (item.type === 'new' && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
};

export default function AdminDashboardPage() {
  const { admin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products'

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Product Modal Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [productForm, setProductForm] = useState({
    title: '',
    category: 'bouquet',
    description: '',
    basePrice: '',
    stemCount: '1',
    heightCm: '',
    widthCm: '',
    ribbonColors: 'Dusty Rose, Champagne Silk, Forest Sage',
    wrappingPaperShades: 'Cream Matte, Kraft Vintage, Blush Pink',
    defaultLeadTimeDays: '3',
    availability: 'available',
    stockCount: '10'
  });

  // Multi-image management state
  // Items array: { id, type: 'existing' | 'new', url, file, previewUrl, public_id, isPrimary, order }
  const [imageItems, setImageItems] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);

  // Fetch Orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const url = orderStatusFilter
        ? `/orders?status=${orderStatusFilter}&includePending=true`
        : '/orders?includePending=true';
      const response = await apiRequest(url);
      if (response.success) {
        setOrders(response.data);
      }
    } catch (err) {
      console.error('Failed to load admin orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await apiRequest('/products?limit=100');
      if (response.success) {
        setProducts(response.data);
      }
    } catch (err) {
      console.error('Failed to load admin products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'products') fetchProducts();
  }, [activeTab, orderStatusFilter]);

  // Handle Order Status Patch with Transition Guard
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (response.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
        );
      }
    } catch (err) {
      alert(`Status update rejected: ${err.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Add Files handler with client-side validation
  const handleAddFiles = (filesToAdd) => {
    setFileError(null);
    const files = Array.from(filesToAdd);
    if (!files.length) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (imageItems.length + files.length > 8) {
      setFileError(`Cannot exceed 8 total photos. Current: ${imageItems.length}, Adding: ${files.length}`);
      return;
    }

    const newItems = [];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setFileError(`File "${file.name}" is not a valid format. Only JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `new-${Date.now()}-${Math.random()}`,
        type: 'new',
        file,
        previewUrl,
        url: previewUrl,
        isPrimary: false,
        order: imageItems.length + newItems.length
      });
    }

    const updated = [...imageItems, ...newItems];
    if (!updated.some((i) => i.isPrimary) && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setImageItems(updated);
  };

  // Input change handler for file picker
  const handleFileInputChange = (e) => {
    handleAddFiles(e.target.files);
    e.target.value = ''; // Reset input so re-selecting same file triggers change
  };

  // Dropzone drag & drop handlers
  const handleDropzoneDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOverDropzone(true);
  };

  const handleDropzoneDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOverDropzone(false);
  };

  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    setIsDraggingOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Remove thumbnail from grid
  const handleRemoveImageItem = (index) => {
    setFileError(null);
    const target = imageItems[index];

    if (target.type === 'new' && target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    } else if (target.type === 'existing' && target.public_id) {
      setRemoveImageIds((prev) => [...prev, target.public_id]);
    }

    const nextItems = imageItems.filter((_, i) => i !== index);
    if (target.isPrimary && nextItems.length > 0) {
      nextItems[0].isPrimary = true;
    }
    nextItems.forEach((img, idx) => {
      img.order = idx;
    });
    setImageItems(nextItems);

    if (nextItems.length === 0) {
      setFileError('At least 1 photo is required for the bouquet.');
    }
  };

  // Set Primary Star Badge
  const handleSetPrimary = (index) => {
    setImageItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        isPrimary: i === index
      }))
    );
  };

  // Reorder thumbnails via Drag and Drop
  const handleThumbnailDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleThumbnailDragOver = (e) => {
    e.preventDefault();
  };

  const handleThumbnailDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const itemsCopy = [...imageItems];
    const [moved] = itemsCopy.splice(draggedIndex, 1);
    itemsCopy.splice(targetIndex, 0, moved);

    itemsCopy.forEach((item, idx) => {
      item.order = idx;
    });

    setImageItems(itemsCopy);
    setDraggedIndex(null);
  };

  // Manual move left/right for touch / keyboard users
  const moveImagePosition = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= imageItems.length) return;
    const itemsCopy = [...imageItems];
    const [moved] = itemsCopy.splice(fromIdx, 1);
    itemsCopy.splice(toIdx, 0, moved);
    itemsCopy.forEach((item, idx) => {
      item.order = idx;
    });
    setImageItems(itemsCopy);
  };

  // Open Modal for Add or Edit
  const openProductModal = (product = null) => {
    cleanupBlobUrls(imageItems);
    setModalError(null);
    setFileError(null);
    setRemoveImageIds([]);

    if (product) {
      setEditingProduct(product);
      setProductForm({
        title: product.title,
        category: product.category || 'bouquet',
        description: product.description,
        basePrice: product.basePrice.toString(),
        stemCount: product.stemCount?.toString() || '1',
        heightCm: product.dimensions?.heightCm?.toString() || '35',
        widthCm: product.dimensions?.widthCm?.toString() || '25',
        ribbonColors: product.customization?.ribbonColors?.join(', ') || '',
        wrappingPaperShades: product.customization?.wrappingPaperShades?.join(', ') || '',
        defaultLeadTimeDays: product.customization?.defaultLeadTimeDays?.toString() || '3',
        availability: product.availability,
        stockCount: product.stockCount?.toString() || '0'
      });

      const sorted = [...(product.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const items = sorted.map((img, idx) => ({
        id: img.public_id || `exist-${idx}`,
        type: 'existing',
        url: img.url,
        public_id: img.public_id,
        isPrimary: img.isPrimary,
        order: img.order ?? idx
      }));

      if (items.length > 0 && !items.some((i) => i.isPrimary)) {
        items[0].isPrimary = true;
      }
      setImageItems(items);
    } else {
      setEditingProduct(null);
      setProductForm({
        title: '',
        category: 'bouquet',
        description: '',
        basePrice: '45.00',
        stemCount: '1',
        heightCm: '35',
        widthCm: '25',
        ribbonColors: 'Dusty Rose, Champagne Silk, Forest Sage',
        wrappingPaperShades: 'Cream Matte, Kraft Vintage, Blush Pink',
        defaultLeadTimeDays: '3',
        availability: 'available',
        stockCount: '10'
      });
      setImageItems([]);
    }
    setShowProductModal(true);
  };

  // Close product modal with URL cleanup
  const closeProductModal = () => {
    cleanupBlobUrls(imageItems);
    setImageItems([]);
    setShowProductModal(false);
  };

  // Submit Product Add/Edit Form via FormData
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setModalError(null);

    if (imageItems.length === 0) {
      setModalError('At least 1 photo is required for the bouquet.');
      setFormSubmitting(false);
      return;
    }

    if (imageItems.length > 8) {
      setModalError('Maximum 8 photos allowed per bouquet.');
      setFormSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', productForm.title);
    formData.append('category', productForm.category);
    formData.append('description', productForm.description);
    formData.append('basePrice', productForm.basePrice);
    formData.append('stemCount', productForm.stemCount);

    formData.append(
      'dimensions',
      JSON.stringify({
        heightCm: Number(productForm.heightCm),
        widthCm: Number(productForm.widthCm)
      })
    );

    const ribbonList = productForm.ribbonColors.split(',').map((s) => s.trim()).filter(Boolean);
    const wrapperList = productForm.wrappingPaperShades.split(',').map((s) => s.trim()).filter(Boolean);

    formData.append(
      'customization',
      JSON.stringify({
        ribbonColors: ribbonList,
        wrappingPaperShades: wrapperList,
        defaultLeadTimeDays: Number(productForm.defaultLeadTimeDays)
      })
    );

    formData.append('availability', productForm.availability);
    formData.append('stockCount', productForm.stockCount);

    if (removeImageIds.length > 0) {
      formData.append('removeImageIds', JSON.stringify(removeImageIds));
    }

    const primaryItem = imageItems.find((i) => i.isPrimary) || imageItems[0];
    if (primaryItem && primaryItem.type === 'existing' && primaryItem.public_id) {
      formData.append('primaryImageId', primaryItem.public_id);
    }

    const imagesOrder = imageItems.map((item, idx) => ({
      public_id: item.public_id || item.id,
      order: idx
    }));
    formData.append('imagesOrder', JSON.stringify(imagesOrder));

    // Append newly selected files
    const newFiles = imageItems.filter((item) => item.type === 'new');
    newFiles.forEach((item) => {
      formData.append('images', item.file);
    });

    try {
      const endpoint = editingProduct ? `/products/${editingProduct._id}` : '/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await apiRequest(endpoint, {
        method,
        body: formData
      });

      if (response.success) {
        cleanupBlobUrls(imageItems);
        setImageItems([]);
        setShowProductModal(false);
        fetchProducts();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete '${title}' and purge its images from Cloudinary?`)) return;

    try {
      const response = await apiRequest(`/products/${id}`, { method: 'DELETE' });
      if (response.success) {
        setProducts((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-charcoal">Studio Management Dashboard</h1>
            <p className="text-xs text-stone-500">Logged in as {admin?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 font-serif font-bold text-base flex items-center gap-2 border-b-2 transition ${
            activeTab === 'orders'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <ShoppingBag className="w-5 h-5" /> Order Tracker ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`pb-4 px-2 font-serif font-bold text-base flex items-center gap-2 border-b-2 transition ${
            activeTab === 'products'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <Package className="w-5 h-5" /> Bouquet Catalog ({products.length})
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Order Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-2">Status Filter:</span>
            {['', 'PENDING_REVIEW', 'CONFIRMED', 'CRAFTING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setOrderStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  orderStatusFilter === st
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {st || 'All Orders'}
              </button>
            ))}
          </div>

          {loadingOrders ? (
            <div className="py-20 text-center text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-600 mb-2" />
              <span>Loading customer orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-charcoal">No orders found</h3>
              <p className="text-xs text-stone-500">Orders placed by customers will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      <th className="p-4">Order ID & Date</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Bouquets & Customization</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Status & Allowed Transitions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {orders.map((order) => {
                      const allowedNext = ALLOWED_TRANSITIONS[order.orderStatus] || [];
                      return (
                        <tr key={order._id} className="hover:bg-stone-50/50 transition">
                          
                          <td className="p-4 align-top">
                            <span className="font-mono font-bold text-rose-600 block">{order.orderId}</span>
                            <span className="text-stone-400 text-[11px] block">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            {order.razorpayPaymentId && (
                              <span className="font-mono text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 block mt-1 truncate max-w-[130px]" title={order.razorpayPaymentId}>
                                Pay ID: {order.razorpayPaymentId}
                              </span>
                            )}
                          </td>

                          <td className="p-4 align-top space-y-1">
                            <div className="font-bold text-charcoal">{order.customer?.fullName}</div>
                            <div className="text-stone-500">{order.customer?.phone}</div>
                            <div className="text-stone-400">{order.customer?.email}</div>
                            <div className="text-stone-500 text-[11px] max-w-xs">
                              {order.customer?.deliveryAddress?.addressLine}, {order.customer?.deliveryAddress?.city}
                            </div>
                          </td>

                          <td className="p-4 align-top space-y-2">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 space-y-1">
                                <div className="font-bold text-charcoal flex justify-between">
                                  <span>{item.bouquetTitle}</span>
                                  <span className="text-stone-500">Qty: {item.quantity}</span>
                                </div>
                                <div className="text-[11px] text-stone-500 flex items-center gap-1">
                                  <Ribbon className="w-3 h-3 text-rose-500" />
                                  <span>Ribbon: {item.selectedCustomization?.ribbonColor} | Wrapper: {item.selectedCustomization?.wrappingPaperShade}</span>
                                </div>
                                {item.selectedCustomization?.giftCardText && (
                                  <div className="text-[11px] text-rose-700 italic flex items-center gap-1">
                                    <Gift className="w-3 h-3 text-rose-500" />
                                    <span>"{item.selectedCustomization.giftCardText}"</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>

                          <td className="p-4 align-top font-serif font-bold text-sm text-charcoal">
                            ₹{order.totalPrice?.toFixed(2)}
                          </td>

                          <td className="p-4 align-top space-y-2">
                            <div className="space-y-1">
                              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {order.orderStatus}
                              </span>
                              
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ml-1 ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                {order.paymentStatus || 'CREATED'}
                              </span>
                            </div>

                            {allowedNext.length > 0 ? (
                              <select
                                value=""
                                disabled={updatingOrderId === order._id}
                                onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                className="block w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                              >
                                <option value="" disabled>Advance Status...</option>
                                {allowedNext.map((nextSt) => (
                                  <option key={nextSt} value={nextSt}>
                                    → {nextSt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="block text-[11px] text-stone-400 font-semibold italic">
                                {order.orderStatus === 'AWAITING_PAYMENT' || order.orderStatus === 'PAYMENT_FAILED'
                                  ? 'Locked System State'
                                  : 'Terminal State'}
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl font-bold text-charcoal">Bouquet Inventory</h2>
            <button
              onClick={() => openProductModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs shadow-md hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> Add New Bouquet
            </button>
          </div>

          {loadingProducts ? (
            <div className="py-20 text-center text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-600 mb-2" />
              <span>Loading products...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const primaryImg = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1563245372-f21724e3856d';
                return (
                  <div key={product._id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-4 items-center">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                          <img
                            src={primaryImg}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          {product.images?.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-stone-900/80 text-white text-[9px] px-1 rounded font-bold">
                              +{product.images.length - 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-base text-charcoal line-clamp-1">{product.title}</h3>
                          <span className="font-serif font-bold text-rose-600 text-sm">₹{product.basePrice}</span>
                          <div className="text-[11px] text-stone-500">Stock: {product.stockCount}</div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2">{product.description}</p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {product.availability}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openProductModal(product)}
                          className="p-2 text-stone-600 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id, product.title)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h3 className="font-serif text-xl font-bold text-charcoal">
                {editingProduct ? 'Edit Product Specification' : 'Add New Handcrafted Product'}
              </h3>
              <button onClick={closeProductModal} className="text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-charcoal mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Vintage Peony Dream Bouquet"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Collection</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="bouquet">Bouquet</option>
                  <option value="flower_pot">Flower Pot</option>
                  <option value="keychain">Keychain</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe the flowers, yarn type, and artistic inspiration..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Stock Count</label>
                  <input
                    type="number"
                    required
                    value={productForm.stockCount}
                    onChange={(e) => setProductForm({ ...productForm, stockCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={productForm.heightCm}
                    onChange={(e) => setProductForm({ ...productForm, heightCm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Width (cm)</label>
                  <input
                    type="number"
                    required
                    value={productForm.widthCm}
                    onChange={(e) => setProductForm({ ...productForm, widthCm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    value={productForm.defaultLeadTimeDays}
                    onChange={(e) => setProductForm({ ...productForm, defaultLeadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-charcoal mb-1">Availability Status</label>
                <select
                  value={productForm.availability}
                  onChange={(e) => setProductForm({ ...productForm, availability: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                >
                  <option value="available">available (Ready to ship)</option>
                  <option value="made_to_order">made_to_order (Crafted on demand)</option>
                  <option value="sold_out">sold_out</option>
                </select>
              </div>

              {/* MULTI-PHOTO UPLOAD & REORDER GALLERY MANAGER */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-charcoal">
                    Product Multi-Photo Gallery (1–8 Photos • Max 5MB each)
                  </label>
                  <span className="text-[11px] font-semibold text-stone-500">
                    {imageItems.length} / 8 photos selected
                  </span>
                </div>

                {/* Thumbnail Grid with Drag & Drop Reordering */}
                {imageItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    {imageItems.map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleThumbnailDragStart(e, index)}
                        onDragOver={handleThumbnailDragOver}
                        onDrop={(e) => handleThumbnailDrop(e, index)}
                        className={`relative group bg-white rounded-xl overflow-hidden border-2 transition-all shadow-xs ${
                          item.isPrimary ? 'border-rose-500 ring-2 ring-rose-200' : 'border-stone-200'
                        }`}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={item.url || item.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Primary Badge Tag */}
                          {item.isPrimary && (
                            <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 z-10">
                              <Star className="w-2.5 h-2.5 fill-current" /> Primary
                            </span>
                          )}

                          {/* Top-Right Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImageItem(index)}
                            title="Remove photo"
                            className="absolute top-1 right-1 bg-stone-900/80 hover:bg-red-600 text-white p-1 rounded-full transition z-10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Hover Overlay Controls */}
                          <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 text-white">
                            <div className="flex justify-between items-center">
                              {/* Drag handle */}
                              <span className="cursor-grab text-stone-300 hover:text-white" title="Drag to reorder">
                                <GripVertical className="w-4 h-4" />
                              </span>
                              
                              {/* Set Primary Button */}
                              {!item.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(index)}
                                  className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
                                  title="Set as main thumbnail"
                                >
                                  <Star className="w-3 h-3" /> Set Main
                                </button>
                              )}
                            </div>

                            {/* Move Left / Right Buttons */}
                            <div className="flex justify-between items-center text-[10px]">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveImagePosition(index, index - 1)}
                                className="p-1 disabled:opacity-30 hover:text-rose-400"
                                title="Move left"
                              >
                                <MoveLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-[9px] text-stone-300">#{index + 1}</span>
                              <button
                                type="button"
                                disabled={index === imageItems.length - 1}
                                onClick={() => moveImagePosition(index, index + 1)}
                                className="p-1 disabled:opacity-30 hover:text-rose-400"
                                title="Move right"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drag and Drop File Input Area */}
                {imageItems.length < 8 && (
                  <div
                    onDragOver={handleDropzoneDragOver}
                    onDragLeave={handleDropzoneDragLeave}
                    onDrop={handleDropzoneDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                      isDraggingOverDropzone
                        ? 'border-rose-500 bg-rose-50/80 scale-[1.01]'
                        : 'border-stone-200 hover:border-rose-400 bg-stone-50/50'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="multi-photo-upload-input"
                    />
                    <label htmlFor="multi-photo-upload-input" className="cursor-pointer text-rose-600 font-semibold block">
                      Click to select multiple photos
                    </label>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Drag & drop bouquet images here (JPEG, PNG, WebP up to 5MB)
                    </p>
                  </div>
                )}

                {fileError && <p className="text-red-600 text-[11px] font-semibold">{fileError}</p>}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="px-5 py-2 rounded-full border border-stone-200 text-stone-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || imageItems.length === 0 || !!fileError}
                  className="px-6 py-2 rounded-full bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Photos & Saving...</span>
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
