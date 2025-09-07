// public/app.js
(() => {
  const AirSpot = (window.AirSpot = window.AirSpot || {});

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...(r || document).querySelectorAll(s)];
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  const CART_KEY = 'airspot_cart';
  const CUSTOMER_KEY = 'airspot_customer';
  const TOKEN_KEY = 'airspot_token';
  const USER_KEY = 'airspot_user';

  // Simple toast
  AirSpot.toast = (msg) => {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.78)', color: '#fff', padding: '10px 14px', borderRadius: '10px', zIndex: 9999
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  // cart helpers
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));
  const clearCart = () => { localStorage.removeItem(CART_KEY); updateNavBadge(); };

  function updateNavBadge() {
    const badge = qs('#nav-badge');
    if (!badge) return;
    const total = getCart().reduce((s,i)=>s + (i.qty||0), 0);
    badge.textContent = total;
  }

  AirSpot.addToCart = (product) => {
    const cart = getCart();
    const idx = cart.findIndex(c => c.productId === (product._id || product.productId));
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ productId: product._id || product.productId, name: product.name, price: Number(product.price||0), qty: 1 });
    saveCart(cart);
    updateNavBadge();
    AirSpot.toast(`${product.name} added to cart`);
  };

  AirSpot.removeFromCart = (id) => {
    let cart = getCart();
    cart = cart.filter(i => i.productId !== id);
    saveCart(cart);
    updateNavBadge();
    AirSpot.toast('Removed from cart');
  };

  AirSpot.changeQtyInCart = (id, qty) => {
    const cart = getCart();
    const idx = cart.findIndex(i => i.productId === id);
    if (idx >= 0) {
      cart[idx].qty = Math.max(1, qty);
      saveCart(cart);
      updateNavBadge();
    }
  };

  // ---- Shop rendering (index.html) ----
  AirSpot.initShop = async () => {
    const grid = qs('#products');
    if (!grid) return;
    try {
      const res = await fetch('/api/products');
      const items = await res.json();
      grid.innerHTML = items.map(p => `
        <div class="product card">
          <div style="height:140px;display:flex;align-items:center;justify-content:center">
            <img src="${p.image || 'https://via.placeholder.com/160x120?text=AirSpot'}" alt="${p.name}" style="max-height:120px;max-width:100%"/>
          </div>
          <h3>${p.name}</h3>
          <div class="small">${p.description || ''}</div>
          <div class="price">${money(p.price)}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <button class="btn add-to-cart" data-id="${p._id}" data-name="${encodeURIComponent(p.name)}" data-price="${p.price}">Add</button>
            <span class="small">Stock: ${p.quantity ?? 0}</span>
          </div>
        </div>
      `).join('');
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const name = decodeURIComponent(btn.getAttribute('data-name'));
        const price = Number(btn.getAttribute('data-price') || 0);
        AirSpot.addToCart({ productId: id, name, price, _id: id });
      });
      updateNavBadge();
    } catch (e) {
      grid.innerHTML = `<div class="small">Could not load products.</div>`;
      console.error(e);
    }
  };

  // ---- Cart page rendering ----
  AirSpot.renderCartPage = () => {
    const list = qs('#cartList');
    if (!list) return;
    const cart = getCart();
    if (!cart.length) {
      list.innerHTML = `<div class="small-note">Your cart is empty.</div>`;
      qs('#cartTotal').textContent = money(0);
      return;
    }
    let total = 0;
    list.innerHTML = cart.map(item => {
      total += item.price * item.qty;
      return `<div class="cart-item" data-id="${item.productId}">
        <div class="meta">
          <div style="font-weight:700">${item.name}</div>
          <div class="small">Price: ${money(item.price)}</div>
        </div>
        <div style="text-align:right">
          <div>
            <input class="qty-input" data-id="${item.productId}" type="number" min="1" value="${item.qty}">
          </div>
          <div style="margin-top:8px">
            <div style="font-weight:700">${money(item.price * item.qty)}</div>
            <button class="btn remove-item" data-id="${item.productId}" style="margin-top:8px">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');
    qs('#cartTotal').textContent = money(total);

    qsa('.remove-item').forEach(b => b.addEventListener('click', (ev) => {
      const id = b.getAttribute('data-id');
      AirSpot.removeFromCart(id);
      AirSpot.renderCartPage();
    }));
    qsa('.qty-input').forEach(inp => inp.addEventListener('change', (ev) => {
      const id = inp.getAttribute('data-id');
      const val = Number(inp.value || 1);
      AirSpot.changeQtyInCart(id, val);
      AirSpot.renderCartPage();
    }));
  };

  // Checkout from cart page
  AirSpot.handleCheckoutFromPage = async () => {
    const cart = getCart();
    if (!cart.length) { AirSpot.toast('Cart empty'); return; }
    const name = qs('#custName')?.value.trim() || (JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null') || {}).name || 'Guest';
    const email = qs('#custEmail')?.value.trim() || (JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null') || {}).email || '';
    const items = cart.map(i => ({ productId: i.productId, qty: i.qty }));
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ customer: { name, email }, items })
      });
      const j = await res.json();
      if (res.ok) {
        clearCart();
        AirSpot.toast('Order placed');
        if (qs('#cartList')) AirSpot.renderCartPage();
        // refresh shop product stock if on index
        if (qs('#products')) AirSpot.initShop();
      } else {
        qs('#cartMsg').textContent = j.msg || 'Could not place order';
      }
    } catch (e) {
      qs('#cartMsg').textContent = 'Network error';
      console.error(e);
    }
  };

  // ---- User page logic (customer) ----
  AirSpot.initUserPage = () => {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null');
    if (saved) {
      qs('#emailInput').value = saved.email || '';
      qs('#nameInput').value = saved.name || '';
      qs('#userMsg').textContent = 'Loaded saved account info';
    }
  };

  AirSpot.userRegisterFromPage = async () => {
    const email = qs('#emailInput').value.trim();
    const name = qs('#nameInput').value.trim();
    if (!email) { qs('#userMsg').textContent = 'Email required'; return; }
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, email })
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(j.customer));
        qs('#userMsg').textContent = 'Registered and saved locally';
      } else {
        qs('#userMsg').textContent = j.msg || 'Register failed';
      }
    } catch (e) {
      qs('#userMsg').textContent = 'Network error';
      console.error(e);
    }
  };

  AirSpot.userSignInFromPage = () => {
    const email = qs('#emailInput').value.trim();
    if (!email) { qs('#userMsg').textContent = 'Email required'; return; }
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null');
    if (saved && saved.email === email) {
      qs('#userMsg').textContent = 'Signed in locally';
    } else {
      qs('#userMsg').textContent = 'No local account found. Please sign up.';
    }
  };

  AirSpot.userSignOut = () => {
    localStorage.removeItem(CUSTOMER_KEY);
    qs('#userMsg').textContent = 'Signed out (local)';
  };

  // ---- Worker page: register/login/clock ----
  AirSpot.workerRegisterFromPage = async () => {
    const name = qs('#w-name').value.trim();
    const email = qs('#w-email').value.trim();
    const password = qs('#w-password').value;
    if (!email || !password) { qs('#workerMsg').textContent = 'Email and password required'; return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, password, role: 'worker' })
      });
      const j = await res.json();
      if (res.ok) {
        // store token & user
        localStorage.setItem(TOKEN_KEY, j.token);
        localStorage.setItem(USER_KEY, JSON.stringify(j.user));
        qs('#workerMsg').textContent = 'Registered and signed in';
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else qs('#workerMsg').textContent = j.msg || 'Register failed';
    } catch (e) {
      qs('#workerMsg').textContent = 'Network error';
      console.error(e);
    }
  };

  AirSpot.workerLoginFromPage = async () => {
    const email = qs('#w-email').value.trim();
    const password = qs('#w-password').value;
    if (!email || !password) { qs('#workerMsg').textContent = 'Email and password required'; return; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const j = await res.json();
      if (res.ok && j.token) {
        localStorage.setItem(TOKEN_KEY, j.token);
        localStorage.setItem(USER_KEY, JSON.stringify(j.user));
        qs('#workerMsg').textContent = 'Signed in';
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else qs('#workerMsg').textContent = j.msg || 'Login failed';
    } catch (e) {
      qs('#workerMsg').textContent = 'Network error';
      console.error(e);
    }
  };

  AirSpot.workerClock = async (action) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { AirSpot.toast('Please login first'); return; }
      const res = await fetch('/api/workers/clock', {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + token},
        body: JSON.stringify({ action })
      });
      const j = await res.json();
      if (res.ok) {
        AirSpot.toast(j.msg || `Clocked ${action}`);
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else AirSpot.toast(j.msg || 'Clock failed');
    } catch (e) {
      AirSpot.toast('Network error');
      console.error(e);
    }
  };

  AirSpot.loadWorkerPanel = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch('/api/workers/me/hours', { headers: { 'Authorization': 'Bearer ' + token }});
      const j = await res.json();
      qs('#workerPanel').style.display = 'block';
      const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null') || {};
      qs('#who').textContent = 'Hey, ' + (user.name || 'Worker');
      qs('#role').textContent = user.role || '';
      qs('#hours').textContent = (j.hours || 0) + ' hours total';
      qs('#shifts').innerHTML = (j.shifts || []).map(s => {
        const start = s.start ? new Date(s.start).toLocaleString() : '—';
        const end = s.end ? new Date(s.end).toLocaleString() : '—';
        return `<div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04)"><strong>${start}</strong> → ${end}</div>`;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  };

  // inventory for worker page (read only)
  AirSpot.loadInventory = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
      const res = await fetch('/api/workers/inventory', { headers });
      const items = await res.json();
      qs('#inventory').innerHTML = Array.isArray(items) ? items.map(i => `
        <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04)">
          <div><strong>${i.name}</strong><div class="small">${i.description || ''}</div></div>
          <div style="text-align:right">
            <div>${money(i.price)}</div>
            <div class="small">Qty: ${i.quantity}</div>
          </div>
        </div>`).join('') : '<div class="small">No inventory</div>';
    } catch (e) {
      console.error(e);
      qs('#inventory').innerHTML = '<div class="small">Inventory unavailable</div>';
    }
  };

  // ---- Init on DOM ready ----
  document.addEventListener('DOMContentLoaded', () => {
    updateNavBadge();

    // On index page, initialize shop
    if (qs('#products')) AirSpot.initShop();

    // On cart page, render
    if (qs('#cartList')) AirSpot.renderCartPage();

    // User page
    if (qs('#emailInput')) AirSpot.initUserPage();

    // Worker page: load panel / inventory if logged
    if (qs('#workerPanel') || qs('#inventory')) {
      AirSpot.loadWorkerPanel();
      AirSpot.loadInventory();
    }
  });

  // expose some helpers for pages
  AirSpot.renderCartPage = AirSpot.renderCartPage;
  AirSpot.handleCheckoutFromPage = AirSpot.handleCheckoutFromPage;
  AirSpot.initUserPage = AirSpot.initUserPage;
  AirSpot.userRegisterFromPage = AirSpot.userRegisterFromPage;
  AirSpot.userSignInFromPage = AirSpot.userSignInFromPage;
  AirSpot.userSignOut = AirSpot.userSignOut;
  AirSpot.workerRegisterFromPage = AirSpot.workerRegisterFromPage;
  AirSpot.workerLoginFromPage = AirSpot.workerLoginFromPage;
  AirSpot.workerClock = AirSpot.workerClock;
  AirSpot.loadWorkerPanel = AirSpot.loadWorkerPanel;
  AirSpot.loadInventory = AirSpot.loadInventory;

})();
