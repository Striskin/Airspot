// public/app.js
(() => {
  const AirSpot = (window.AirSpot = window.AirSpot || {});

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...(r || document).querySelectorAll(s)];
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  const CART_KEY = "airspot_cart";
  const CUSTOMER_KEY = "airspot_customer"; // sesión cliente (obj {name,email})
  const TOKEN_KEY = "airspot_token";       // worker
  const USER_KEY = "airspot_user";         // worker user

  // Endpoints
  const API = {
    products: "/api/products",
    checkoutPrimary: "/api/orders/checkout", // intenta descontar stock
    checkoutFallback: "/api/orders",          // tu endpoint anterior
    customerRegister: "/api/customers/register",
    customerSignIn: "/api/customers/signin",
  };

  // ========== Toast ==========
  AirSpot.toast = (msg) => {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed",
      left: "50%",
      bottom: "28px",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.78)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "10px",
      zIndex: 9999,
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  // ========== Helpers cliente ==========
  const getCustomer = () => {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null"); }
    catch { return null; }
  };
  const isCustomerLoggedIn = () => !!getCustomer();

  // Saludo en navbar (compacto)
  AirSpot.renderUserGreeting = function() {
    const pill = qs('#greetPill');
    const nameEl = qs('#greetName');
    if (!pill || !nameEl) return;

    const customer = getCustomer();
    if (customer && (customer.name || customer.email)) {
      const display = (customer.name || customer.email).split(' ')[0].split('@')[0];
      nameEl.textContent = display;
      pill.style.display = '';
    } else {
      pill.style.display = 'none';
    }
  };

  // ========== Cart Helpers ==========
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));
  const clearCart = () => { localStorage.removeItem(CART_KEY); updateNavBadge(); };

  function updateNavBadge() {
    const badge = qs("#nav-badge");
    if (!badge) return;
    const total = getCart().reduce((s, i) => s + (i.qty || 0), 0);
    badge.textContent = total;
  }

  AirSpot.addToCart = (product) => {
    if (!isCustomerLoggedIn()) {
      AirSpot.toast("Please sign in to add items to your cart.");
      return;
    }
    const cart = getCart();
    const pid = product._id || product.productId;
    const idx = cart.findIndex((c) => c.productId === pid);
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ productId: pid, name: product.name, price: Number(product.price || 0), qty: 1 });
    saveCart(cart);
    updateNavBadge();
    AirSpot.toast(`${product.name} added to cart`);
  };

  AirSpot.removeFromCart = (id) => {
    let cart = getCart().filter((i) => i.productId !== id);
    saveCart(cart);
    updateNavBadge();
    AirSpot.toast("Removed from cart");
  };

  AirSpot.changeQtyInCart = (id, qty) => {
    const cart = getCart();
    const idx = cart.findIndex((i) => i.productId === id);
    if (idx >= 0) {
      cart[idx].qty = Math.max(1, qty);
      saveCart(cart);
      updateNavBadge();
    }
  };

  // ========== Shop Rendering ==========
  AirSpot.initShop = async () => {
    const grid = qs("#products");
    if (!grid) return;

    // si cambia sesión en otra pestaña
    window.addEventListener("storage", (e) => {
      if (e.key === CUSTOMER_KEY) {
        AirSpot.initShop();
        AirSpot.renderUserGreeting();
      }
    });

    try {
      const res = await fetch(API.products);
      const items = await res.json();
      const logged = isCustomerLoggedIn();

      grid.innerHTML = items
        .map((p) => {
          const stock = Number(p.quantity ?? 0);
          const disabled = !logged || stock <= 0 ? "disabled" : "";
          const hint = !logged ? 'title="Sign in to add to cart"' : stock <= 0 ? 'title="Out of stock"' : "";
          return `
        <div class="product card">
          <div style="height:140px;display:flex;align-items:center;justify-content:center">
            <img src="${p.image || "https://via.placeholder.com/160x120?text=AirSpot"}" alt="${p.name}" style="max-height:120px;max-width:100%"/>
          </div>
          <h3>${p.name}</h3>
          <div class="small">${p.description || ""}</div>
          <div class="price">${money(p.price)}</div>
          ${p.tag ? `<div class="tag tag-${p.tag.toLowerCase()}">${p.tag}</div>` : ""}
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <button class="btn add-to-cart" data-id="${p._id}" data-name="${encodeURIComponent(p.name)}" data-price="${p.price}" ${disabled} ${hint}>Add</button>
            <span class="small">Stock: <span data-stock="${p._id}">${stock}</span></span>
          </div>
        </div>`;
        })
        .join("");

      // Delegación Add
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-to-cart");
        if (!btn) return;
        if (!isCustomerLoggedIn()) { AirSpot.toast("Please sign in to add items to your cart."); return; }

        const id = btn.getAttribute("data-id");
        const name = decodeURIComponent(btn.getAttribute("data-name"));
        const price = Number(btn.getAttribute("data-price") || 0);

        const stockEl = qs(`[data-stock="${id}"]`);
        const currentStock = Number(stockEl?.textContent ?? 0);
        if (currentStock <= 0) { AirSpot.toast("Out of stock"); return; }

        AirSpot.addToCart({ productId: id, name, price, _id: id });
      });

      updateNavBadge();
      AirSpot.renderUserGreeting();
    } catch (e) {
      grid.innerHTML = `<div class="small">Could not load products.</div>`;
      console.error(e);
    }
  };

  // ========== Cart Page ==========
  AirSpot.renderCartPage = () => {
    const list = qs("#cartList");
    if (!list) return;
    const cart = getCart();
    if (!cart.length) {
      list.innerHTML = `<div class="small-note">Your cart is empty.</div>`;
      qs("#cartTotal").textContent = money(0);
      return;
    }
    let total = 0;
    list.innerHTML = cart
      .map((item) => {
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
      })
      .join("");
    qs("#cartTotal").textContent = money(total);

    qsa(".remove-item").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        AirSpot.removeFromCart(id);
        AirSpot.renderCartPage();
      })
    );
    qsa(".qty-input").forEach((inp) =>
      inp.addEventListener("change", () => {
        const id = inp.getAttribute("data-id");
        const val = Number(inp.value || 1);
        AirSpot.changeQtyInCart(id, val);
        AirSpot.renderCartPage();
      })
    );
  };

  // ========== Checkout (descuenta stock) ==========
  AirSpot.handleCheckoutFromPage = async () => {
    if (!isCustomerLoggedIn()) { AirSpot.toast("Please sign in to checkout."); return; }

    const cart = getCart();
    if (!cart.length) { AirSpot.toast("Cart empty"); return; }

    const saved = getCustomer() || {};
    const name = qs("#custName")?.value.trim() || saved.name || "Guest";
    const email = qs("#custEmail")?.value.trim() || saved.email || "";
    const items = cart.map((i) => ({ id: i.productId, productId: i.productId, qty: i.qty }));

    try {
      const res = await fetch(API.checkoutPrimary, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("primary_failed");

      clearCart();
      AirSpot.toast("Purchase completed!");
      if (qs("#cartList")) AirSpot.renderCartPage();
      if (qs("#products")) AirSpot.initShop();
      return;
    } catch (_) {
      try {
        const res2 = await fetch(API.checkoutFallback, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: { name, email }, items: items.map(i => ({ productId: i.id || i.productId, qty: i.qty })) }),
        });
        const j = await res2.json();
        if (res2.ok) {
          clearCart();
          AirSpot.toast("Order placed");
          if (qs("#cartList")) AirSpot.renderCartPage();
          if (qs("#products")) AirSpot.initShop();
        } else {
          (qs("#cartMsg") || { textContent: null }).textContent = j.msg || "Could not place order";
        }
      } catch (e2) {
        (qs("#cartMsg") || { textContent: null }).textContent = "Network error";
        console.error(e2);
      }
    }
  };

  // ========== User Page (persistencia real) ==========
  AirSpot.initUserPage = () => {
    const saved = getCustomer();
    if (saved) {
      qs("#emailInput").value = saved.email || "";
      qs("#nameInput").value = saved.name || "";
      qs("#userMsg").textContent = "Loaded saved account info";
    }
  };

  // SIGN UP -> persiste en BD
  AirSpot.userRegisterFromPage = async () => {
    const email = qs("#emailInput").value.trim();
    const name = qs("#nameInput").value.trim();
    if (!email) { qs("#userMsg").textContent = "Email required"; return; }
    try {
      const res = await fetch(API.customerRegister, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(j.customer));
        qs("#userMsg").textContent = "Registered and saved";
        AirSpot.renderUserGreeting();
        if (qs("#products")) AirSpot.initShop();
      } else {
        qs("#userMsg").textContent = j.msg || "Register failed";
      }
    } catch (e) {
      qs("#userMsg").textContent = "Network error";
      console.error(e);
    }
  };

  // SIGN IN -> consulta BD y guarda sesión real
  AirSpot.userSignInFromPage = async () => {
    const email = qs("#emailInput").value.trim();
    if (!email) { qs("#userMsg").textContent = "Email required"; return; }
    try {
      const res = await fetch(API.customerSignIn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(j.customer));
        qs("#userMsg").textContent = "Signed in";
        AirSpot.renderUserGreeting();
        if (qs("#products")) AirSpot.initShop();
      } else {
        qs("#userMsg").textContent = j.msg || "No local account found. Please sign up.";
      }
    } catch (e) {
      qs("#userMsg").textContent = "Network error";
      console.error(e);
    }
  };

  AirSpot.userSignOut = () => {
    localStorage.removeItem(CUSTOMER_KEY);
    qs("#userMsg").textContent = "Signed out";
    AirSpot.renderUserGreeting();
    if (qs("#products")) AirSpot.initShop();
  };

  // ========== Worker (sin tocar tu lógica) ==========
  AirSpot.workerRegisterFromPage = async () => {
    const name = qs("#w-name").value.trim();
    const email = qs("#w-email").value.trim();
    const password = qs("#w-password").value;
    if (!email || !password) {
      qs("#workerMsg").textContent = "Email and password required";
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "worker" }),
      });
      const j = await res.json();
      if (res.ok) {
        localStorage.setItem(TOKEN_KEY, j.token);
        localStorage.setItem(USER_KEY, JSON.stringify(j.user));
        qs("#workerMsg").textContent = "Registered and signed in";
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else qs("#workerMsg").textContent = j.msg || "Register failed";
    } catch (e) {
      qs("#workerMsg").textContent = "Network error";
      console.error(e);
    }
  };

  AirSpot.workerLoginFromPage = async () => {
    const email = qs("#w-email").value.trim();
    const password = qs("#w-password").value;
    if (!email || !password) {
      qs("#workerMsg").textContent = "Email and password required";
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (res.ok && j.token) {
        localStorage.setItem(TOKEN_KEY, j.token);
        localStorage.setItem(USER_KEY, JSON.stringify(j.user));
        qs("#workerMsg").textContent = "Signed in";
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else qs("#workerMsg").textContent = j.msg || "Login failed";
    } catch (e) {
      qs("#workerMsg").textContent = "Network error";
      console.error(e);
    }
  };

  AirSpot.workerClock = async (action) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { AirSpot.toast("Please login first"); return; }
      const res = await fetch("/api/workers/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (res.ok) {
        AirSpot.toast(j.msg || `Clocked ${action}`);
        setTimeout(() => AirSpot.loadWorkerPanel(), 300);
      } else AirSpot.toast(j.msg || "Clock failed");
    } catch (e) {
      AirSpot.toast("Network error");
      console.error(e);
    }
  };

  AirSpot.loadWorkerPanel = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch("/api/workers/me/hours", { headers: { Authorization: "Bearer " + token } });
      const j = await res.json();
      const panel = qs("#workerPanel");
      if (panel) panel.style.display = "block";
      const user = JSON.parse(localStorage.getItem(USER_KEY) || "null") || {};
      if (qs("#who")) qs("#who").textContent = "Hey, " + (user.name || "Worker");
      if (qs("#role")) qs("#role").textContent = user.role || "";
      if (qs("#hours")) qs("#hours").textContent = (j.hours || 0) + " hours total";
      if (qs("#shifts"))
        qs("#shifts").innerHTML = (j.shifts || []).map((s) => {
          const start = s.start ? new Date(s.start).toLocaleString() : "—";
          const end = s.end ? new Date(s.end).toLocaleString() : "—";
          return `<div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04)"><strong>${start}</strong> → ${end}</div>`;
        }).join("");
    } catch (e) { console.error(e); }
  };

  AirSpot.loadInventory = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = token ? { Authorization: "Bearer " + token } : {};
      const res = await fetch("/api/workers/inventory", { headers });
      const items = await res.json();
      if (qs("#inventory"))
        qs("#inventory").innerHTML = Array.isArray(items)
          ? items.map(i => `
        <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04)">
          <div><strong>${i.name}</strong><div class="small">${i.description || ""}</div></div>
          <div style="text-align:right">
            <div>${money(i.price)}</div>
            <div class="small">Qty: ${i.quantity}</div>
          </div>
        </div>`).join("")
          : "<div class='small'>No inventory</div>";
    } catch (e) {
      console.error(e);
      if (qs("#inventory"))
        qs("#inventory").innerHTML = "<div class='small'>Inventory unavailable</div>";
    }
  };

  // ========== Init ==========
  document.addEventListener("DOMContentLoaded", () => {
    updateNavBadge();
    if (qs("#products")) AirSpot.initShop();
    if (qs("#cartList")) AirSpot.renderCartPage();
    if (qs("#emailInput")) AirSpot.initUserPage();
    if (qs("#workerPanel") || qs("#inventory")) {
      AirSpot.loadWorkerPanel();
      AirSpot.loadInventory();
    }
    AirSpot.renderUserGreeting();
  });

  // expose
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
  AirSpot.initShop = AirSpot.initShop;
  AirSpot.renderUserGreeting = AirSpot.renderUserGreeting;
})();