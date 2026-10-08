/**
 * New Bright Button Palace - Shopping Cart & Checkout Manager
 */

const STORAGE_KEY = 'nbb_cart';
const COUPON_KEY = 'nbb_coupon';

function normalizeVariant(v) {
  if (!v) return 'Standard';
  return String(v).trim();
}

function getCartItemKey(item) {
  if (!item) return '';
  const id = String(item.id || item.productId || '').trim().toLowerCase();
  const variant = normalizeVariant(item.variant).toLowerCase();
  return `${id}::${variant}`;
}

const CartManager = {
  getCart: function () {
    let data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      // Check legacy key if present
      data = localStorage.getItem('crg_cart');
    }
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(data) || [];
    } catch (e) {
      return [];
    }
  },

  saveCart: function (cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    this.updateCartBadges();
    this.renderDrawer();
    if (document.getElementById('cart-items-container')) {
      this.renderCartPage();
    }
  },

  addToCart: function (product) {
    const cart = this.getCart();
    const normVariant = normalizeVariant(product.variant);
    const itemKey = getCartItemKey({ ...product, variant: normVariant });
    const existingIndex = cart.findIndex(item => (item.key || getCartItemKey(item)) === itemKey);
    const itemImage = product.image || (product.images && product.images[0] ? product.images[0].src : null);
    const itemSvg = product.svg || null;

    const availableStock = product.stock !== undefined ? product.stock : (product.inventory_quantity !== undefined ? product.inventory_quantity : 99);
    const currentQty = existingIndex > -1 ? (cart[existingIndex].qty || 0) : 0;
    const addQty = product.qty || 1;

    if (availableStock > 0 && (currentQty + addQty > availableStock)) {
      const allowedAdd = availableStock - currentQty;
      if (allowedAdd <= 0) {
        this.showToast(`Maximum stock available for "${product.name || product.title} (${normVariant})" is ${availableStock}.`);
        return;
      }
      this.showToast(`Only ${allowedAdd} more added. Stock limit reached.`);
    }

    if (existingIndex > -1) {
      const newQty = Math.min(currentQty + addQty, availableStock > 0 ? availableStock : 999);
      cart[existingIndex].qty = newQty;
      cart[existingIndex].variant = normVariant;
      cart[existingIndex].stock = availableStock;
      if (itemImage) cart[existingIndex].image = itemImage;
      if (itemSvg) cart[existingIndex].svg = itemSvg;
      if (product.price) cart[existingIndex].price = Number(product.price);
      if (product.originalPrice || product.oldPrice) cart[existingIndex].originalPrice = Number(product.originalPrice || product.oldPrice);
    } else {
      const finalQty = availableStock > 0 ? Math.min(addQty, availableStock) : addQty;
      cart.push({
        key: itemKey,
        id: product.id || 'item-' + Date.now(),
        name: product.name || product.title || 'Tailoring Item',
        title: product.title || product.name || 'Tailoring Item',
        variant: normVariant,
        price: Number(product.price) || 99,
        originalPrice: Number(product.originalPrice || product.oldPrice) || Number(product.price) + 100,
        image: itemImage,
        svg: itemSvg,
        qty: finalQty,
        stock: availableStock
      });
    }

    this.saveCart(cart);
    this.showToast(`Added to your tailoring cart!`);
    
    // Automatically reveal drawer on add
    if (typeof toggleCartDrawer === 'function') {
      toggleCartDrawer(true);
    }
  },

  updateQty: function (targetKey, delta) {
    let cart = this.getCart();
    const item = cart.find(i => (i.key || getCartItemKey(i)) === targetKey || i.id === targetKey);
    if (item) {
      const availableStock = item.stock !== undefined ? item.stock : 99;
      if (delta > 0 && availableStock > 0 && item.qty + delta > availableStock) {
        this.showToast(`Maximum stock available is ${availableStock}.`);
        return;
      }
      item.qty += delta;
      if (item.qty <= 0) {
        this.removeFromCart(targetKey);
        return;
      }
      this.saveCart(cart);
    }
  },

  removeFromCart: function (targetKey) {
    let cart = this.getCart();
    cart = cart.filter(i => (i.key || getCartItemKey(i)) !== targetKey && i.id !== targetKey);
    this.saveCart(cart);
    this.showToast('Item removed from cart');
  },

  clearCart: function () {
    this.saveCart([]);
  },

  getCartCount: function () {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  },

  getCartSubtotal: function () {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0);
  },

  updateCartBadges: function () {
    const count = this.getCartCount();
    const badges = document.querySelectorAll('#cartBadge, #mobileBottomCartBadge, .cart-counter, .cart-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    });

    const totalCountEls = document.querySelectorAll('#cartTotalItemsCount');
    totalCountEls.forEach(el => {
      el.textContent = `${count} item${count === 1 ? '' : 's'}`;
    });
  },

  getAppliedCoupon: function () {
    return localStorage.getItem(COUPON_KEY) || '';
  },

  setAppliedCoupon: function (code) {
    if (code) {
      localStorage.setItem(COUPON_KEY, code.toUpperCase());
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
  },

  applyCouponCode: function () {
    const input = document.getElementById('coupon-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      this.setAppliedCoupon('');
      this.renderCartPage();
      return;
    }
    if (code === 'GIFT15' || code === 'TAILOR15' || code === 'BRIGHT15') {
      this.setAppliedCoupon('GIFT15');
      this.showToast('Coupon applied: 15% OFF!');
    } else {
      this.setAppliedCoupon(code);
      this.showToast('Invalid coupon. Try GIFT15');
    }
    this.renderCartPage();
  },

  showToast: function (message) {
    let toast = document.getElementById('toast');
    let toastMsg = document.getElementById('toastMsg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast-popup';
      toast.innerHTML = `<div class="toast-icon">✓</div><span id="toastMsg">${message}</span>`;
      document.body.appendChild(toast);
      toastMsg = document.getElementById('toastMsg');
    } else {
      if (toastMsg) toastMsg.innerText = message;
    }

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  },

  renderDrawer: function () {
    const container = document.getElementById('cartItemsContainer');
    const priceEl = document.getElementById('cartTotalPrice');
    const waLink = document.getElementById('whatsappCheckoutLink');
    if (!container) return;

    const cart = this.getCart();
    const subtotal = this.getCartSubtotal();

    if (priceEl) priceEl.innerText = `₹${subtotal}`;

    if (waLink) {
      let message = `Hello New Bright Button Palace! I would like to place an order:%0A%0A`;
      cart.forEach((item, idx) => {
        const title = (item.name || item.title || 'Item').substring(0, 35);
        message += `${idx + 1}. ${title} (${item.variant || 'Standard'}) x ${item.qty} = ₹${item.price * item.qty}%0A`;
      });
      message += `%0ATotal Amount: ₹${subtotal}%0APlease confirm availability!`;
      waLink.href = `https://api.whatsapp.com/send?phone=919876543210&text=${message}`;
    }

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🪡</div>
          <p style="font-size: 15px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">Your tailoring cart is empty</p>
          <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px;">Add zippers, buttons, threads & notions to get started.</p>
          <a href="products.html" onclick="toggleCartDrawer(false)" style="display:inline-block; padding: 8px 18px; background: var(--action-btn-grad); color:#fff; border-radius: 8px; font-weight: 700; text-decoration:none; font-size:12.5px;">
            Shop Tailoring Deals
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = cart.map(item => {
      const key = item.key || getCartItemKey(item);
      let imgHtml = '';
      if (item.svg) {
        imgHtml = item.svg;
      } else if (item.image) {
        imgHtml = `<img src="${item.image}" alt="${item.name || item.title}" style="width:100%; height:100%; object-fit:contain;">`;
      } else {
        imgHtml = `<div style="font-size:24px;">🔘</div>`;
      }

      return `
        <div class="cart-item">
          <div class="cart-item-img">${imgHtml}</div>
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name || item.title}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">Variant: ${item.variant || 'Standard'}</div>
            <div class="cart-item-price">₹${item.price}</div>
            <div class="cart-qty-ctrl">
              <button class="btn-qty" onclick="CartManager.updateQty('${key}', -1)">-</button>
              <span class="cart-qty-num">${item.qty}</span>
              <button class="btn-qty" onclick="CartManager.updateQty('${key}', 1)">+</button>
              <button class="cart-item-remove" onclick="CartManager.removeFromCart('${key}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  },

  renderCartPage: function () {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('subtotal');
    const discountEl = document.getElementById('discount');
    const gstEl = document.getElementById('gst');
    const totalEl = document.getElementById('total-amount');
    const couponInput = document.getElementById('coupon-input');
    const couponMsg = document.getElementById('coupon-msg');
    const btnProceed = document.getElementById('btn-proceed-payment');
    const cartCountTitle = document.getElementById('cart-count-title');

    if (!container) return;

    const cart = this.getCart();
    const count = this.getCartCount();
    const subtotal = this.getCartSubtotal();

    if (cartCountTitle) {
      cartCountTitle.textContent = `Shopping Cart (${count} item${count === 1 ? '' : 's'})`;
    }

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-card">
          <div style="font-size: 48px; margin-bottom: 12px; opacity:0.8;">🪡</div>
          <h2 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Your Shopping Cart is Empty</h2>
          <p style="color: var(--text-muted); font-size: 13.5px; margin-bottom: 20px;">Explore our premium collection of tailoring accessories, zippers, buttons and laces.</p>
          <a href="products.html" class="btn-checkout" style="display:inline-flex; width:auto; padding:10px 24px;">Explore Catalog</a>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '₹0';
      if (discountEl) discountEl.textContent = '- ₹0';
      if (gstEl) gstEl.textContent = '₹0';
      if (totalEl) totalEl.textContent = '₹0';
      if (btnProceed) {
        btnProceed.style.pointerEvents = 'none';
        btnProceed.style.opacity = '0.5';
      }
      return;
    }

    if (btnProceed) {
      btnProceed.style.pointerEvents = 'auto';
      btnProceed.style.opacity = '1';
    }

    // Calculate discount
    const coupon = this.getAppliedCoupon();
    let discount = 0;
    if (coupon === 'GIFT15' || coupon === 'TAILOR15' || coupon === 'BRIGHT15') {
      discount = Math.round(subtotal * 0.15);
      if (couponMsg) {
        couponMsg.innerHTML = `<span style="color:#059669; font-weight:700;">✓ Coupon ${coupon} applied (15% OFF)</span>`;
      }
      if (couponInput) couponInput.value = coupon;
    } else if (coupon) {
      if (couponMsg) {
        couponMsg.innerHTML = `<span style="color:#dc2626; font-weight:600;">✕ Invalid coupon code</span>`;
      }
    } else {
      if (couponMsg) couponMsg.innerHTML = '';
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const gst = Math.round(discountedSubtotal * 0.05);
    const grandTotal = discountedSubtotal + gst;

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (discountEl) discountEl.textContent = `- ₹${discount}`;
    if (gstEl) gstEl.textContent = `₹${gst}`;
    if (totalEl) totalEl.textContent = `₹${grandTotal}`;

    container.innerHTML = cart.map(item => {
      const key = item.key || getCartItemKey(item);
      let imgHtml = '';
      if (item.svg) {
        imgHtml = item.svg;
      } else if (item.image) {
        imgHtml = `<img src="${item.image}" alt="${item.name || item.title}" style="width:100%; height:100%; object-fit:contain;">`;
      } else {
        imgHtml = `<div style="font-size:28px;">🔘</div>`;
      }

      return `
        <div class="cart-page-item">
          <div class="cart-page-item-img">${imgHtml}</div>
          <div class="cart-page-item-details">
            <h3 class="cart-page-item-title">${item.name || item.title}</h3>
            <div class="cart-page-item-variant">Variant: <strong>${item.variant || 'Standard'}</strong></div>
            <div class="cart-page-item-price">₹${item.price} <small>₹${item.originalPrice || item.price + 100}</small></div>
            <div class="cart-qty-ctrl" style="margin-top:8px;">
              <button class="btn-qty" onclick="CartManager.updateQty('${key}', -1)">-</button>
              <span class="cart-qty-num">${item.qty}</span>
              <button class="btn-qty" onclick="CartManager.updateQty('${key}', 1)">+</button>
              <button class="cart-item-remove" onclick="CartManager.removeFromCart('${key}')" style="margin-left:14px;">Remove Item</button>
            </div>
          </div>
          <div class="cart-page-item-total">
            ₹${item.price * item.qty}
          </div>
        </div>
      `;
    }).join("");
  }
};

// Global drawer helper
function toggleCartDrawer(show) {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (!drawer || !backdrop) return;
  if (show) {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  } else {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// Global checkout now modal / redirect
function checkoutNow() {
  const cart = CartManager.getCart();
  if (cart.length === 0) {
    CartManager.showToast("Your cart is empty! Add products to proceed.");
    return;
  }
  window.location.href = 'checkout.html';
}

window.CartManager = CartManager;
window.toggleCartDrawer = toggleCartDrawer;
window.checkoutNow = checkoutNow;

// Global Add to Cart click delegation (matching sample Reference Website)
document.addEventListener('DOMContentLoaded', () => {
  CartManager.updateCartBadges();
  CartManager.renderDrawer();
  if (document.getElementById('cart-items-container')) {
    CartManager.renderCartPage();
  }

  // Global Add to Cart delegation matching sample reference website
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-cart, [data-cart-add]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name') || btn.getAttribute('data-title') || 'Tailoring Item';
    const price = parseFloat(btn.getAttribute('data-price')) || 0;
    const oldPrice = parseFloat(btn.getAttribute('data-old-price')) || 0;
    const image = btn.getAttribute('data-image') || null;
    const variant = btn.getAttribute('data-variant') || 'Standard';
    const stock = parseInt(btn.getAttribute('data-stock') || '99', 10);

    CartManager.addToCart({
      id,
      name,
      title: name,
      price,
      originalPrice: oldPrice,
      image,
      variant,
      stock,
      qty: 1
    });

    btn.classList.add('btn-pop');
    setTimeout(() => btn.classList.remove('btn-pop'), 300);
  });
});

