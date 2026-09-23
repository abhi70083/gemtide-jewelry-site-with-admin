import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { initialProducts } from '../data/products';
import { 
  ArrowRight, 
  X, 
  Menu, 
  Diamond, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Award, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  Heart
} from 'lucide-react';
import { effectivePrice, formatPrice } from '../utils/pricing';
import Hero3D from '../components/Hero3D';
import WhatsAppChat from '../components/WhatsAppChat';
import type { Product } from '../types';

const STORAGE_KEY = 'gemtide-admin-products';

const loadProducts = (): Product[] => {
  if (typeof window === 'undefined') return initialProducts;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialProducts;
    const parsed = JSON.parse(stored) as Product[];
    if (!Array.isArray(parsed)) return initialProducts;
    return parsed.filter(p => p.active);
  } catch {
    return initialProducts;
  }
};

interface CartItem {
  product: Product;
  quantity: number;
}

const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeMoreTab, setActiveMoreTab] = useState<'bags' | 't-shirts' | 'artifacts'>('bags');

  const handleScrollToMoreTab = (tab: 'bags' | 't-shirts' | 'artifacts') => {
    setActiveMoreTab(tab);
    setTimeout(() => {
      const element = document.getElementById('more');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'phonepe' as 'phonepe' | 'gpay' | 'paytm' | 'other'
  });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  const categories = ['All', 'Rings', 'Chains', 'Watches', 'Apparel'];

  useEffect(() => {
    const refreshProducts = () => {
      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
          const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
          if (stored) {
            try {
              const parsedStored = JSON.parse(stored);
              if (Array.isArray(parsedStored) && parsedStored.length > 0) {
                setProducts(parsedStored.filter((p: Product) => p.active));
                return;
              }
            } catch {}
          }
          if (Array.isArray(data) && data.length > 0) {
            setProducts(data.filter(p => p.active));
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
          } else {
            setProducts(loadProducts());
          }
        })
        .catch(() => {
          setProducts(loadProducts());
        });
    };

    refreshProducts();

    const storedCart = window.localStorage.getItem('gemtide-cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch {}
    }

    const storedFavorites = window.localStorage.getItem('gemtide-favorites');
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch {}
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('focus', refreshProducts);
    window.addEventListener('storage', refreshProducts);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', refreshProducts);
      window.removeEventListener('storage', refreshProducts);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('gemtide-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem('gemtide-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isLiked = favorites.includes(id);
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
    fetch('/api/products/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId: id, liked: !isLiked })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(prev => prev.map(p => p.id === id ? { ...p, likes: data.likes } : p));
        }
      })
      .catch(err => console.error('Failed to sync like action:', err));
  };

  const filteredProducts = products
    .filter(p => {
      const cat = (p.category || '').toLowerCase();
      if (cat === 'bags' || cat === 't-shirts' || cat === 'artifacts') return false;
      return true;
    })
    .filter(p => {
      if (activeCategory === 'All') return true;
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      if (activeCategory === 'Rings') return cat === 'rings' || name.includes('ring') || name.includes('signet') || name.includes('band');
      if (activeCategory === 'Chains') return cat === 'chains' || name.includes('chain') || name.includes('pendant') || name.includes('crux') || name.includes('cuban');
      if (activeCategory === 'Watches') return cat === 'watches' || name.includes('chronograph') || name.includes('watch') || name.includes('obsidian');
      if (activeCategory === 'Apparel') return cat === 'apparel' || name.includes('kurta') || name.includes('clothing') || name.includes('silk');
      return true;
    });

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Only ${product.stock} units are in stock.`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.product.stock) {
          alert(`Only ${item.product.stock} units are in stock.`);
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter((item): item is CartItem => item !== null));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => 
    sum + effectivePrice(item.product.price, item.product.offer) * item.quantity, 0
  );

  const gstAmount = cartTotal * 0.18;
  const deliveryFee = cartTotal > 0 && cartTotal < 699 ? 100 : 0;
  const grandTotal = cartTotal + gstAmount + deliveryFee;

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert('Please fill in all details.');
      return;
    }

    const phoneNumber = '917083103399';
    const orderLines = cart.map(item => {
      const finalPrice = effectivePrice(item.product.price, item.product.offer);
      return `• ${item.product.name} (x${item.quantity}) - ${formatPrice(finalPrice * item.quantity)}`;
    }).join('\n');

    let paymentMethodText = 'UPI Payment';
    if (checkoutForm.paymentMethod === 'phonepe') paymentMethodText = 'PhonePe (UPI)';
    else if (checkoutForm.paymentMethod === 'gpay') paymentMethodText = 'Google Pay (UPI)';
    else if (checkoutForm.paymentMethod === 'paytm') paymentMethodText = 'Paytm (UPI)';
    else if (checkoutForm.paymentMethod === 'other') paymentMethodText = 'Other UPI App';

    const message = `*GemTide Jewelry - New Order* ✦
----------------------------------
*Customer Details:*
• Name: ${checkoutForm.name}
• Phone: ${checkoutForm.phone}
• Shipping Address: ${checkoutForm.address}
• Payment Method: ${paymentMethodText}

*Order Details:*
${orderLines}

----------------------------------
*Subtotal:* ${formatPrice(cartTotal)}
*GST (18%):* ${formatPrice(gstAmount)}
*Delivery Fee:* ${deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
*Grand Total:* ${formatPrice(grandTotal)}
----------------------------------
Thank you for shopping with GemTide!`;

    const orderData = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      customerName: checkoutForm.name,
      customerPhone: checkoutForm.phone,
      customerAddress: checkoutForm.address,
      paymentMethod: paymentMethodText,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: effectivePrice(item.product.price, item.product.offer)
      })),
      grandTotal: grandTotal
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Order saved to database.');
        }
      })
      .catch(err => console.error('Error saving order:', err));

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    setCart([]);
    setCheckoutForm({ name: '', phone: '', address: '', paymentMethod: 'phonepe' });
    setIsCheckoutOpen(false);
    setOrderSuccess(true);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden selection:bg-brand-green/20 selection:text-brand-green font-sans">
      
      {/* Background Glowing Blurs */}
      <div className="absolute top-0 left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[160px] ambient-glow-1 pointer-events-none z-0" />
      <div className="absolute top-[60vh] right-[-10%] w-[55vw] h-[55vw] rounded-full blur-[180px] ambient-glow-2 pointer-events-none z-0" />
      <div className="absolute top-[170vh] left-[-20%] w-[65vw] h-[65vw] rounded-full blur-[200px] ambient-glow-3 pointer-events-none z-0" />
      <div className="absolute bottom-[20vh] right-[-15%] w-[50vw] h-[50vw] rounded-full blur-[180px] ambient-glow-1 pointer-events-none z-0" />

      <WhatsAppChat />

      {/* Navbar - Modern Light Glassmorphic Pill */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 sm:py-4 shadow-sm' 
          : 'bg-transparent py-4 sm:py-6 md:py-8'
      }`}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 md:px-12">
          <Link to="/" className="relative z-50 flex items-center gap-2.5 group">
            <img src="/logo.png" alt="GemTide" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover border border-brand-green/20 shadow-xs transition-transform duration-300 group-hover:scale-105" />
            <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-serif tracking-[0.12em] text-slate-900 transition-colors duration-300 group-hover:text-brand-green">
              GEMTIDE
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-12 text-[10px] font-tech font-bold tracking-[0.25em] uppercase text-slate-500">
            <a href="#collections" className="hover:text-brand-green transition-all duration-300">Collections</a>
            <a href="#about" className="hover:text-brand-green transition-all duration-300">About Us</a>
            
            {/* Hover dropdown for More */}
            <div className="relative group/more-menu">
              <button className="flex items-center gap-1 hover:text-brand-green uppercase transition-all duration-300 tracking-[0.25em] py-2 font-bold font-tech text-[10px]">
                <span>More</span>
                <span className="text-[7px] transition-transform duration-300 group-hover/more-menu:rotate-180">▼</span>
              </button>
              <div className="absolute top-[100%] left-1/2 -translate-x-1/2 pt-3 opacity-0 pointer-events-none group-hover/more-menu:opacity-100 group-hover/more-menu:pointer-events-auto transition-all duration-300 z-50">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 py-3.5 px-5 rounded-2xl shadow-lg flex flex-col gap-3 min-w-[140px] text-left">
                  <button 
                    onClick={() => handleScrollToMoreTab('bags')} 
                    className="hover:text-brand-green transition-colors duration-200 text-left font-tech text-[9px] font-bold tracking-widest uppercase block whitespace-nowrap"
                  >
                    Bags
                  </button>
                  <button 
                    onClick={() => handleScrollToMoreTab('t-shirts')} 
                    className="hover:text-brand-green transition-colors duration-200 text-left font-tech text-[9px] font-bold tracking-widest uppercase block whitespace-nowrap"
                  >
                    T-Shirts
                  </button>
                  <button 
                    onClick={() => handleScrollToMoreTab('artifacts')} 
                    className="hover:text-brand-green transition-colors duration-200 text-left font-tech text-[9px] font-bold tracking-widest uppercase block whitespace-nowrap"
                  >
                    Artifacts
                  </button>
                </div>
              </div>
            </div>

            <a href="#contact" className="hover:text-brand-green transition-all duration-300">Support</a>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-brand-green hover:bg-brand-green-dark text-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 rounded-full shadow-md"
            >
              <ShoppingCart size={12} />
              <span>Cart ({cartItemsCount})</span>
            </button>
          </div>

          {/* Mobile Navigation Icons */}
          <div className="flex items-center gap-4 md:hidden">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-800 hover:text-brand-green transition-colors"
            >
              <ShoppingCart size={20} />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-brand-green text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
            <button
              className="relative z-50 text-slate-800 p-2 hover:text-brand-green transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Fullscreen Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[45] bg-white/98 backdrop-blur-3xl flex flex-col items-center justify-center gap-6 sm:gap-8 p-6 overflow-y-auto"
          >
            <a href="#collections" onClick={() => setIsMenuOpen(false)} className="text-2xl sm:text-3xl font-serif font-bold text-slate-800 hover:text-brand-green tracking-widest transition-colors duration-300">Collections</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-2xl sm:text-3xl font-serif font-bold text-slate-800 hover:text-brand-green tracking-widest transition-colors duration-300">About Us</a>
            
            {/* Expandable sub-links for More in Mobile */}
            <div className="flex flex-col items-center gap-3 border-y border-slate-100 py-4 w-full max-w-xs">
              <span className="text-[10px] font-tech font-bold uppercase tracking-[0.25em] text-slate-400">More Collections</span>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <button 
                  onClick={() => { setIsMenuOpen(false); handleScrollToMoreTab('bags'); }} 
                  className="text-base sm:text-lg font-serif font-bold text-slate-700 hover:text-brand-green tracking-widest transition-colors"
                >
                  Bags
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); handleScrollToMoreTab('t-shirts'); }} 
                  className="text-base sm:text-lg font-serif font-bold text-slate-700 hover:text-brand-green tracking-widest transition-colors"
                >
                  T-Shirts
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); handleScrollToMoreTab('artifacts'); }} 
                  className="text-base sm:text-lg font-serif font-bold text-slate-700 hover:text-brand-green tracking-widest transition-colors"
                >
                  Artifacts
                </button>
              </div>
            </div>

            <a href="#contact" onClick={() => setIsMenuOpen(false)} className="text-2xl sm:text-3xl font-serif font-bold text-slate-800 hover:text-brand-green tracking-widest transition-colors duration-300">Support</a>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 md:px-12 pb-24 sm:pb-32">

        {/* HERO SECTION - SLEEK SILVER & JADE */}
        <section className="relative min-h-[85vh] sm:min-h-[95vh] flex flex-col lg:flex-row items-center justify-between pt-24 sm:pt-32 border-b border-slate-200/60 pb-16 sm:pb-24 gap-8 lg:gap-12">
          
          <div className="relative z-10 max-w-2xl text-left flex-shrink-0 w-full">
            <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 text-brand-green font-tech text-[9px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] font-bold bg-brand-green/10 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-brand-green/20">
              <Diamond size={10} className="text-brand-green animate-pulse" />
              <span>PREMIUM MODERN JEWELRY STORE</span>
            </div>

            <h1 className="font-serif text-[2.4rem] min-[380px]:text-[2.8rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[6.8rem] font-extrabold text-slate-900 tracking-tight mb-4 sm:mb-8 leading-[1.08] sm:leading-[1.05]">
              BOLD <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-green-accent">FORM.</span><br />
              GEN Z AESTHETIC.
            </h1>

            <p className="max-w-md text-slate-500 text-xs sm:text-sm font-sans font-light leading-relaxed tracking-wide mb-8 sm:mb-10">
              Minimalist streetwear jewelry designed for Gen Z style. Ready-to-wear pieces crafted from durable alloys and polished chrome—perfect for daily expression.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center pointer-events-auto w-full sm:w-auto">
              <a
                href="#collections"
                className="px-8 py-3.5 rounded-full bg-brand-green hover:bg-brand-green-dark text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-md text-center"
              >
                Explore Collection
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-3 text-slate-800 hover:text-brand-green transition-colors text-[10px] font-bold uppercase tracking-[0.2em] py-2 sm:py-0"
              >
                <span>WhatsApp Support</span>
                <ArrowRight size={14} />
              </a>
            </div>

            {/* Featured Item Card */}
            <div className="mt-8 sm:mt-12 bg-white border border-slate-200/80 p-3.5 sm:p-4.5 rounded-2xl max-w-sm flex items-center gap-3.5 sm:gap-4.5 shadow-sm">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-xs shrink-0">
                ✦
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-tech">Featured Item</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide font-sans mt-0.5">Aurelia Serpent Band</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D rotating gemstone viewport + Floating Tags */}
          <div className="relative w-full lg:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] flex items-center justify-center flex-grow">
            
            {/* Ambient halo behind 3D Canvas */}
            <div className="absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[460px] md:h-[460px] rounded-full border border-slate-200 pointer-events-none flex items-center justify-center z-0">
              <div className="w-[85%] h-[85%] rounded-full border border-slate-200/60 flex items-center justify-center animate-spin" style={{ animationDuration: '60s' }}>
                <div className="w-2 h-2 bg-brand-green rounded-full absolute top-0" />
              </div>
            </div>

            <Hero3D />

            {/* Floating details tags */}
            <div className="absolute inset-0 flex flex-col justify-between p-2.5 sm:p-4 pointer-events-none z-10 font-tech">
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-center shadow-xs">
                  <span className="text-[8px] sm:text-[9px] font-bold text-brand-green uppercase tracking-widest block">✦ 100% Aesthetic Guarantee</span>
                </div>
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-center shadow-xs hidden min-[400px]:block">
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-800 uppercase tracking-widest block">5000+ Happy Customers</span>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-end gap-2">
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-center shadow-xs hidden sm:block">
                  <span className="text-[8px] sm:text-[9px] font-bold text-brand-green uppercase tracking-widest block">✦ Premium Alloy Finish</span>
                </div>
                {/* Visual Auction Countdown timer */}
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-2 sm:p-3 rounded-2xl flex gap-2 sm:gap-3 text-center shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-800 text-xs font-bold font-sans">12</span>
                    <span className="text-[7px] text-slate-400 uppercase">Days</span>
                  </div>
                  <div className="text-slate-400 text-xs font-bold">:</div>
                  <div className="flex flex-col">
                    <span className="text-slate-800 text-xs font-bold font-sans">08</span>
                    <span className="text-[7px] text-slate-400 uppercase">Hrs</span>
                  </div>
                  <div className="text-slate-400 text-xs font-bold">:</div>
                  <div className="flex flex-col">
                    <span className="text-brand-green text-xs font-bold font-sans">43</span>
                    <span className="text-[7px] text-slate-400 uppercase">Sec</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BRANDS / FEATURE BANNER (Marquee) */}
        <div className="w-full border-y border-slate-200 bg-white/60 backdrop-blur-md overflow-hidden py-5 sm:py-8 my-10 sm:my-20">
          <div className="animate-marquee whitespace-nowrap flex gap-12 sm:gap-20 items-center font-tech font-bold text-[9px] sm:text-[10px] text-slate-600 uppercase tracking-[0.25em] sm:tracking-[0.3em]">
            <span>FREE EXPRESS DELIVERY IN INDIA</span>
            <span className="text-brand-green text-xs">✦</span>
            <span>DESIGNED WITH HANDS</span>
            <span className="text-brand-green text-xs">✦</span>
            <span>SECURE UPI PAYMENTS</span>
            <span className="text-brand-green text-xs">✦</span>
            <span>FREE EXPRESS DELIVERY IN INDIA</span>
            <span className="text-brand-green text-xs">✦</span>
            <span>DESIGNED WITH HANDS</span>
            <span className="text-brand-green text-xs">✦</span>
            <span>SECURE UPI PAYMENTS</span>
          </div>
        </div>

        {/* COLLECTIONS GRID */}
        <section id="collections" className="py-12 sm:py-20 scroll-mt-24">
          <div className="mb-10 sm:mb-20 flex flex-col xl:flex-row justify-between xl:items-end gap-6 sm:gap-8 pb-6 sm:pb-10 border-b border-slate-200">
            <div>
              <span className="text-[9px] sm:text-[10px] font-tech uppercase tracking-[0.25em] text-brand-green font-bold bg-brand-green/10 px-3 py-1.5 rounded-full border border-brand-green/20">LIMITED RELEASES</span>
              <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-slate-900 font-bold mt-3 sm:mt-4">Signature Catalog</h2>
            </div>
            
            {/* Category Filter Bar - Horizontally Scrollable Pills on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap md:flex-wrap pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 sm:px-6 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] transition-all duration-350 rounded-full border whitespace-nowrap shrink-0 ${
                    activeCategory === cat
                      ? 'bg-brand-green border-transparent text-white font-bold shadow-sm'
                      : 'border-slate-200 hover:border-brand-green/45 text-slate-500 hover:text-slate-800 bg-white shadow-xs'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-28 border border-slate-200 bg-white rounded-3xl flex flex-col items-center justify-center shadow-xs">
              <Sparkles className="text-brand-green/20 mb-4 animate-spin" style={{ animationDuration: '10s' }} size={32} />
              <p className="text-slate-500 text-[10px] font-tech uppercase tracking-[0.25em]">No active artifacts in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 md:gap-12">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                const finalPrice = effectivePrice(product.price, product.offer);
                const isFav = favorites.includes(product.id);

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="group relative flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 m-2 sm:m-3 rounded-xl sm:rounded-2xl border border-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                        loading="lazy"
                      />

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className={`absolute top-2.5 right-2.5 sm:top-5 sm:right-5 p-1.5 sm:p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 z-20 ${
                          isFav 
                            ? 'bg-brand-green border-brand-green text-white shadow-sm' 
                            : 'bg-white/80 border-slate-200 text-slate-700 hover:border-brand-green hover:text-brand-green'
                        }`}
                      >
                        <Heart size={12} fill={isFav ? 'currentColor' : 'none'} strokeWidth={isFav ? 0 : 2} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>

                      {/* Sold Out Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10 p-2 text-center">
                          <span className="text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] font-tech uppercase font-bold text-slate-800 border border-slate-200 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/95 rounded-full shadow-xs">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}

                      {/* Elegant Offer Badge */}
                      {product.offer > 0 && !isOutOfStock && (
                        <div className="absolute bottom-2.5 left-2.5 sm:bottom-5 sm:left-5 bg-white/90 backdrop-blur-md text-brand-green text-[8px] sm:text-[9px] font-tech font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] px-2.5 sm:px-3.5 py-1 sm:py-1.5 border border-slate-200 rounded-full shadow-xs">
                          {product.offer}% OFF
                        </div>
                      )}
                    </div>

                    {/* Meta/Text Info */}
                    <div className="p-3.5 sm:p-7 flex flex-col flex-grow">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-tech text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold">
                        <span className="truncate max-w-[90px] sm:max-w-none">{product.tag}</span>
                        {product.stock <= 4 && product.stock > 0 && (
                          <span className="text-brand-green tracking-widest font-bold hidden sm:inline">ONLY {product.stock} LEFT</span>
                        )}
                      </div>

                      <h3 className="font-serif text-sm sm:text-2xl text-slate-900 font-bold mt-1.5 sm:mt-3 group-hover:text-brand-green transition-colors duration-300 line-clamp-1">
                        {product.name}
                      </h3>

                      <div className="mt-2.5 sm:mt-5 flex items-baseline gap-2 sm:gap-3">
                        <span className="text-xs sm:text-base font-bold text-slate-900 tracking-wide">
                          {formatPrice(finalPrice)}
                        </span>
                        {product.offer > 0 && (
                          <span className="text-[10px] sm:text-xs text-slate-400 line-through tracking-wider">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      {/* Acquire Button */}
                      <div className="mt-4 sm:mt-8 pt-3 sm:pt-6 border-t border-slate-100 mt-auto">
                        <button
                          onClick={(e) => addToCart(product, e)}
                          disabled={isOutOfStock}
                          className={`w-full py-2.5 sm:py-3.5 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.25em] transition-all duration-300 rounded-full border ${
                            isOutOfStock
                              ? 'bg-transparent border-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-brand-green hover:bg-brand-green-dark border-transparent text-white shadow-xs hover:shadow-md'
                          }`}
                        >
                          {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* MORE COLLECTION SECTION */}
        <section id="more" className="py-12 sm:py-20 border-t border-slate-200 scroll-mt-24">
          <div className="mb-10 sm:mb-16 flex flex-col xl:flex-row justify-between xl:items-end gap-6 sm:gap-8 pb-6 sm:pb-10 border-b border-slate-200">
            <div>
              <span className="text-[9px] sm:text-[10px] font-tech uppercase tracking-[0.25em] text-brand-green font-bold bg-brand-green/10 px-3 py-1.5 rounded-full border border-brand-green/20">LIFESTYLE EXTENSIONS</span>
              <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-slate-900 font-bold mt-3 sm:mt-4">More than Ornaments</h2>
            </div>
            
            {/* Interactive Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap md:flex-wrap pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {(['bags', 't-shirts', 'artifacts'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMoreTab(tab)}
                  className={`relative px-4 sm:px-6 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] transition-all duration-350 rounded-full border whitespace-nowrap shrink-0 ${
                    activeMoreTab === tab
                      ? 'bg-brand-green border-transparent text-white font-bold shadow-sm'
                      : 'border-slate-200 hover:border-brand-green/45 text-slate-500 hover:text-slate-800 bg-white shadow-xs'
                  }`}
                >
                  {tab === 't-shirts' ? 'T-Shirts' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* More Section Product Grid */}
          {products.filter(p => (p.category || '').toLowerCase() === activeMoreTab.toLowerCase()).length === 0 ? (
            <div className="text-center py-28 border border-slate-200 bg-white rounded-3xl flex flex-col items-center justify-center shadow-xs">
              <Sparkles className="text-brand-green/20 mb-4 animate-spin" style={{ animationDuration: '10s' }} size={32} />
              <p className="text-slate-500 text-[10px] font-tech uppercase tracking-[0.25em]">No active items in this collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 md:gap-12">
              {products.filter(p => (p.category || '').toLowerCase() === activeMoreTab.toLowerCase()).map(product => {
                const isOutOfStock = product.stock <= 0;
                const finalPrice = effectivePrice(product.price, product.offer);
                const isFav = favorites.includes(product.id);

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="group relative flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 m-2 sm:m-3 rounded-xl sm:rounded-2xl border border-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                        loading="lazy"
                      />

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className={`absolute top-2.5 right-2.5 sm:top-5 sm:right-5 p-1.5 sm:p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 z-20 ${
                          isFav 
                            ? 'bg-brand-green border-brand-green text-white shadow-sm' 
                            : 'bg-white/80 border-slate-200 text-slate-700 hover:border-brand-green hover:text-brand-green'
                        }`}
                      >
                        <Heart size={12} fill={isFav ? 'currentColor' : 'none'} strokeWidth={isFav ? 0 : 2} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>

                      {/* Sold Out Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10 p-2 text-center">
                          <span className="text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] font-tech uppercase font-bold text-slate-800 border border-slate-200 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/95 rounded-full shadow-xs">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}

                      {/* Elegant Offer Badge */}
                      {product.offer > 0 && !isOutOfStock && (
                        <div className="absolute bottom-2.5 left-2.5 sm:bottom-5 sm:left-5 bg-white/90 backdrop-blur-md text-brand-green text-[8px] sm:text-[9px] font-tech font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] px-2.5 sm:px-3.5 py-1 sm:py-1.5 border border-slate-200 rounded-full shadow-xs">
                          {product.offer}% OFF
                        </div>
                      )}
                    </div>

                    {/* Meta/Text Info */}
                    <div className="p-3.5 sm:p-7 flex flex-col flex-grow">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-tech text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold">
                        <span className="truncate max-w-[90px] sm:max-w-none">{product.tag}</span>
                        {product.stock <= 4 && product.stock > 0 && (
                          <span className="text-brand-green tracking-widest font-bold hidden sm:inline">ONLY {product.stock} LEFT</span>
                        )}
                      </div>

                      <h3 className="font-serif text-sm sm:text-2xl text-slate-900 font-bold mt-1.5 sm:mt-3 group-hover:text-brand-green transition-colors duration-300 line-clamp-1">
                        {product.name}
                      </h3>

                      <div className="mt-2.5 sm:mt-5 flex items-baseline gap-2 sm:gap-3">
                        <span className="text-xs sm:text-base font-bold text-slate-900 tracking-wide">
                          {formatPrice(finalPrice)}
                        </span>
                        {product.offer > 0 && (
                          <span className="text-[10px] sm:text-xs text-slate-400 line-through tracking-wider">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      {/* Acquire Button */}
                      <div className="mt-4 sm:mt-8 pt-3 sm:pt-6 border-t border-slate-100 mt-auto">
                        <button
                          onClick={(e) => addToCart(product, e)}
                          disabled={isOutOfStock}
                          className={`w-full py-2.5 sm:py-3.5 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.25em] transition-all duration-300 rounded-full border ${
                            isOutOfStock
                              ? 'bg-transparent border-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-brand-green hover:bg-brand-green-dark border-transparent text-white shadow-xs hover:shadow-md'
                          }`}
                        >
                          {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* HERITAGE SECTION */}
        <section id="about" className="py-16 sm:py-32 border-t border-slate-200 my-8 sm:my-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            
            <div className="lg:col-span-5 space-y-6 sm:space-y-8">
              <span className="text-[9px] sm:text-[10px] font-tech uppercase tracking-[0.25em] sm:tracking-[0.3em] text-brand-green font-bold bg-brand-green/10 px-3 py-1.5 rounded-full border border-brand-green/20">ABOUT GEMTIDE</span>
              <h2 className="font-serif text-3xl sm:text-5xl text-slate-900 font-bold leading-tight">Modern Jewelry,<br />Crafted for Daily Wear.</h2>
              
              <div className="w-12 h-[2px] bg-brand-green" />

              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-light tracking-wide">
                GemTide offers sleek, modern jewelry designed for daily streetwear and style expression. Our ready-to-wear pieces are designed to elevate your everyday outfit.
              </p>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-light tracking-wide">
                We focus on durable finishes and modern street style designs, using high-grade alloys that are built for daily wear and styling flexibility.
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-10 border-t border-slate-200">
                <div className="space-y-1">
                  <Award className="text-brand-green mb-2 animate-pulse" size={18} strokeWidth={1.5} />
                  <h4 className="text-[9px] sm:text-[10px] font-tech font-bold text-slate-800 uppercase tracking-wider">Modern Design</h4>
                  <p className="text-[8px] sm:text-[9px] text-slate-400 font-light">Premium Alloys</p>
                </div>
                <div className="space-y-1">
                  <Truck className="text-slate-600 mb-2" size={18} strokeWidth={1.5} />
                  <h4 className="text-[9px] sm:text-[10px] font-tech font-bold text-slate-800 uppercase tracking-wider">Free Shipping</h4>
                  <p className="text-[8px] sm:text-[9px] text-slate-400 font-light">Pan-India</p>
                </div>
                <div className="space-y-1">
                  <ShieldCheck className="text-brand-green mb-2" size={18} strokeWidth={1.5} />
                  <h4 className="text-[9px] sm:text-[10px] font-tech font-bold text-slate-800 uppercase tracking-wider">Durability</h4>
                  <p className="text-[8px] sm:text-[9px] text-slate-400 font-light">Anti-Tarnish Finish</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
              {/* Decorative Frame */}
              <div className="absolute top-[-10px] left-[-10px] sm:top-[-20px] sm:left-[-20px] w-[30px] h-[30px] sm:w-[50px] sm:h-[50px] border-t border-l border-slate-300 pointer-events-none" />
              <div className="absolute bottom-[-10px] right-[-10px] sm:bottom-[-20px] sm:right-[-20px] w-[30px] h-[30px] sm:w-[50px] sm:h-[50px] border-b border-r border-slate-300 pointer-events-none" />

              <div className="relative w-full lg:w-[90%] aspect-[4/3] sm:aspect-video lg:aspect-[4/3] overflow-hidden bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-3xl group shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&q=80&w=1200"
                  alt="GemTide Atelier"
                  className="w-full h-full object-cover grayscale brightness-[90%] group-hover:scale-103 group-hover:grayscale-0 transition-all duration-[1s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent flex items-end p-5 sm:p-8">
                  <div>
                    <span className="text-[8px] font-tech tracking-[0.2em] uppercase text-brand-green font-bold">OUR DESIGN</span>
                    <p className="font-serif text-base sm:text-lg text-white font-bold mt-1">Sleek Ready-to-Wear Jewelry</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEWSLETTER ACCESS SECTION */}
        <section id="contact" className="py-12 sm:py-20 border-t border-slate-200">
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 md:p-20 text-center max-w-4xl mx-auto shadow-sm">
            
            {/* Small diamond dot */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center border border-slate-200">
              <Diamond size={8} className="text-brand-green" />
            </div>

            <span className="text-[9px] font-tech uppercase tracking-[0.3em] text-brand-green font-bold">STAY UPDATED</span>
            <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl text-slate-900 font-bold mt-3 mb-3 sm:mb-5">Subscribe to our Newsletter</h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-6 sm:mb-10 font-light tracking-wide leading-relaxed">
              Get the latest updates on new collections, exclusive drops, and sales.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Subscribed successfully!'); }}>
              <input
                type="email"
                required
                placeholder="Enter email address"
                className="flex-grow bg-slate-50 border border-slate-200 rounded-full px-5 py-3.5 sm:px-6 sm:py-4 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-green transition-colors"
              />
              <button
                type="submit"
                className="bg-brand-green hover:bg-brand-green-dark text-white font-bold text-[9px] uppercase tracking-[0.25em] px-8 py-3.5 sm:py-4 rounded-full transition-all duration-300 shadow-xs"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200 py-12 sm:py-16 relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 pb-12 sm:pb-16">
            <div className="space-y-4">
              <span className="text-2xl font-serif text-slate-900 tracking-[0.15em] font-extrabold">GEMTIDE</span>
              <p className="text-[10px] leading-relaxed text-slate-500 font-light max-w-xs">
                Modern ready-to-wear streetwear jewelry with durable finishes and high aesthetic impact.
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <h5 className="text-[9px] font-tech font-bold uppercase tracking-[0.25em] text-slate-800">Collections</h5>
              <div className="flex flex-col gap-2 text-[9px] uppercase tracking-wider text-slate-500 font-tech font-bold">
                <a href="#collections" onClick={() => setActiveCategory('Rings')} className="hover:text-brand-green transition-colors">Aurelia Rings</a>
                <a href="#collections" onClick={() => setActiveCategory('Chains')} className="hover:text-brand-green transition-colors">Crux Chains</a>
                <a href="#collections" onClick={() => setActiveCategory('Watches')} className="hover:text-brand-green transition-colors">Obsidian Watches</a>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h5 className="text-[9px] font-tech font-bold uppercase tracking-[0.25em] text-slate-800">Explore</h5>
              <div className="flex flex-col gap-2 text-[9px] uppercase tracking-wider text-slate-500 font-tech font-bold">
                <a href="#about" className="hover:text-brand-green transition-colors">About Us</a>
                <a href="#contact" className="hover:text-brand-green transition-colors">Support</a>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h5 className="text-[9px] font-tech font-bold uppercase tracking-[0.25em] text-slate-800">Contact Us</h5>
              <p className="text-[10px] text-slate-500 font-light leading-relaxed">
                Pune Workshop Office, IN<br />
                gemtidecollection@gmail.com<br />
                +91 70831 03399
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <span className="text-[8px] text-slate-400 uppercase tracking-[0.25em]">
              © 2026 GEMTIDE JEWELRY LTD. ALL RIGHTS RESERVED.
            </span>
            <div className="flex gap-6 text-[8px] uppercase tracking-[0.25em] text-slate-400 font-bold">
              <a href="#" className="hover:text-slate-800 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-800 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {/* SHOPPING CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-xl"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={15} className="text-brand-green" />
                  <span className="text-[10px] font-tech font-bold uppercase tracking-[0.25em] text-slate-800">Your Cart ({cartItemsCount})</span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-800 transition-colors p-2"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-tech uppercase tracking-[0.2em] text-slate-400">Your cart is empty.</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="mt-4 text-[9px] font-tech font-bold text-brand-green uppercase tracking-[0.2em] underline hover:text-brand-green-dark"
                      >
                        Start Shopping
                      </button>
                    </div>
                  </div>
                ) : (
                  cart.map(item => {
                    const finalPrice = effectivePrice(item.product.price, item.product.offer);
                    return (
                      <div key={item.product.id} className="flex gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100 group">
                        {/* Image */}
                        <div className="w-16 h-20 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        {/* Details */}
                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider group-hover:text-brand-green transition-colors">{item.product.name}</h4>
                              <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-1">{item.product.tag}</span>
                          </div>

                          <div className="flex justify-between items-center mt-3">
                            {/* Quantity Selector */}
                            <div className="flex items-center border border-slate-200 rounded-full px-1 bg-slate-50">
                              <button 
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="p-1.5 text-slate-400 hover:text-slate-800"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="px-2 text-[10px] font-bold text-slate-800">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="p-1.5 text-slate-400 hover:text-slate-800"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            
                            {/* Price */}
                            <span className="text-[11px] font-bold text-slate-800">
                              {formatPrice(finalPrice * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Checkout */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-4 sm:space-y-5">
                  <div className="space-y-2 text-[10px] font-tech uppercase tracking-widest border-b border-slate-200 pb-3">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-bold">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>GST (18%)</span>
                      <span className="font-bold">{formatPrice(gstAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Delivery Fee</span>
                      <span className="font-bold">{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase tracking-widest pt-1">
                    <span className="text-slate-800">Total</span>
                    <span className="text-brand-green text-sm">{formatPrice(grandTotal)}</span>
                  </div>
                  
                  {cartTotal < 699 ? (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-[9px] text-amber-600 uppercase tracking-wider flex items-center gap-2.5">
                      <Truck size={12} />
                      <span>Add <strong>{formatPrice(699 - cartTotal)}</strong> more for <strong>Free Delivery</strong></span>
                    </div>
                  ) : (
                    <div className="bg-brand-green/5 border border-brand-green/10 rounded-2xl p-3 text-[9px] text-brand-green uppercase tracking-wider flex items-center gap-2.5">
                      <Truck size={12} />
                      <span>You have earned <strong>Free Express Delivery</strong></span>
                    </div>
                  )}

                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-brand-green hover:bg-brand-green-dark text-white rounded-full py-3.5 sm:py-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] transition-all shadow-md"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xl z-[55] text-left"
            >
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1"
              >
                <X size={18} />
              </button>

              <div className="mb-6 sm:mb-8 flex items-center gap-2">
                <Sparkles className="text-brand-green" size={15} />
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 uppercase tracking-widest">Order Details</h3>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 sm:space-y-5 text-[10px] font-tech tracking-wider uppercase font-bold text-slate-500">
                <div>
                  <label className="block mb-2 text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={checkoutForm.name}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-5 py-3 sm:py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-green transition-colors text-base sm:text-xs font-normal tracking-wide normal-case"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-700">WhatsApp Contact Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 99887 76655"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-5 py-3 sm:py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-green transition-colors text-base sm:text-xs font-normal tracking-wide normal-case"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-700">Shipping Address</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Flat/House no., Street, City, State, Pin Code"
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 sm:py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-green transition-colors text-base sm:text-xs font-normal tracking-wide normal-case resize-none"
                  />
                </div>

                <div>
                  <label className="block mb-3 text-slate-700">UPI Payment Method</label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'phonepe' }))}
                      className={`p-3 sm:p-3.5 rounded-full border text-center transition-all ${
                        checkoutForm.paymentMethod === 'phonepe'
                          ? 'border-brand-green bg-brand-green/5 text-brand-green font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-550 bg-white'
                      }`}
                    >
                      PhonePe
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'gpay' }))}
                      className={`p-3 sm:p-3.5 rounded-full border text-center transition-all ${
                        checkoutForm.paymentMethod === 'gpay'
                          ? 'border-brand-green bg-brand-green/5 text-brand-green font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-550 bg-white'
                      }`}
                    >
                      Google Pay (GPay)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'paytm' }))}
                      className={`p-3 sm:p-3.5 rounded-full border text-center transition-all ${
                        checkoutForm.paymentMethod === 'paytm'
                          ? 'border-brand-green bg-brand-green/5 text-brand-green font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-550 bg-white'
                      }`}
                    >
                      Paytm
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'other' }))}
                      className={`p-3 sm:p-3.5 rounded-full border text-center transition-all ${
                        checkoutForm.paymentMethod === 'other'
                          ? 'border-brand-green bg-brand-green/5 text-brand-green font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-550 bg-white'
                      }`}
                    >
                      Other UPI App
                    </button>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 border-t border-slate-100 space-y-2 text-[10px] font-tech uppercase tracking-widest text-slate-500">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-700">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GST (18%)</span>
                    <span className="font-bold text-slate-700">{formatPrice(gstAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-slate-700">{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-800 pt-2 border-t border-dashed border-slate-200">
                    <span>Grand Total</span>
                    <span className="text-brand-green text-base sm:text-lg font-bold">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-white rounded-full py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] transition-all shadow-md mt-6 sm:mt-8"
                >
                  Send Order to WhatsApp (+91 70831 03399)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderSuccess(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-[420px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center shadow-xl z-[55]"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-green/10 border border-brand-green/20 mx-auto flex items-center justify-center text-brand-green mb-4 sm:mb-6 animate-pulse">
                <Check size={24} />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-slate-900 font-bold uppercase tracking-widest mb-3">Order Details Ready</h3>
              <p className="text-slate-500 text-[10px] leading-relaxed tracking-wider font-light mb-6 sm:mb-8 normal-case">
                Your order details are ready. Redirecting you to WhatsApp to send them to our team. We will contact you manually to confirm shipping and payment.
              </p>
              <button
                onClick={() => setOrderSuccess(false)}
                className="w-full bg-brand-green hover:bg-brand-green-dark text-white py-3.5 sm:py-4 text-[9px] font-bold uppercase tracking-[0.25em] rounded-full transition-colors duration-300 shadow-md"
              >
                Continue Shopping
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;