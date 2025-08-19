(() => {
  const AirSpot = (window.AirSpot = window.AirSpot || {});

  const qs = (sel, root = document) => root.querySelector(sel);
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  const TOKEN_KEY = "airspot_token";
  const USER_KEY = "airspot_user";
  const CART_KEY = "airspot_cart";

  // Toast
  AirSpot.toast = (msg) => {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "28px";
    t.style.transform = "translateX(-50%)";
    t.style.padding = "10px 14px";
    t.style.background = "rgba(0,0,0,.75)";
    t.style.color = "#fff";
    t.style.borderRadius = "10px";
    t.style.boxShadow = "0 6px 18px rgba(0,0,0,.25)";
    t.style.zIndex = 9999;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  };

  // Auth utils
  AirSpot.saveToken = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  };
  AirSpot.getToken = () => localStorage.getItem(TOKEN_KEY);
  AirSpot.getUser = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { return null; }
  };
  AirSpot.clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  AirSpot.apiFetch = async (path, opts = {}) => {
    const headers = { ...opts.headers };
    const token = AirSpot.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) {
      AirSpot.clearAuth();
      throw new Error("Unauthorized");
    }
    return res;
  };

  // Cart logic
  AirSpot.addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    const idx = cart.findIndex((c) => c._id === product._id);
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ ...product, qty: 1 });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    AirSpot.toast(`${product.name} added to cart`);
  };

  // Shop init
  AirSpot.initShop = async () => {
    const grid = qs("#products");
    if (!grid) return;
    try {
      const res = await fetch("/api/products");
      const items = await res.json();
      grid.innerHTML = items.map((p) => `
        <div class="product card">
          <div style="height:140px;display:flex;align-items:center;justify-content:center">
            <img src="${p.image || "https://via.placeholder.com/160x120?text=AirSpot"}"
                 alt="${p.name}" style="max-height:120px;max-width:100%"/>
          </div>
          <h3>${p.name}</h3>
          <div class="small">${p.description || ""}</div>
          <div class="price">${money(p.price)}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <button class="btn" data-add="${p._id}">Add</button>
            <span class="small">Stock: ${p.quantity ?? 0}</span>
          </div>
        </div>`).join("");
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-add]");
        if (!btn) return;
        const id = btn.getAttribute("data-add");
        const prod = items.find((x) => x._id === id);
        if (prod) AirSpot.addToCart(prod);
      });
    } catch {
      grid.innerHTML = `<div class="small">Could not load products.</div>`;
    }
  };

  // Worker page
  async function renderInventory() {
    const container = qs("#inventory");
    if (!container) return;
    try {
      const res = await AirSpot.apiFetch("/api/workers/inventory");
      const items = await res.json();
      container.innerHTML = items.map((i) => `
        <div class="inventory-item">
          <div><strong>${i.name}</strong><div class="small">${i.description || ""}</div></div>
          <div style="text-align:right">
            <div>${money(i.price)}</div>
            <div class="small">Qty: ${i.quantity ?? 0}</div>
          </div>
        </div>`).join("");
    } catch {
      container.innerHTML = `<div class="small">Inventory unavailable.</div>`;
    }
  }

  function showDashboard(user) {
    qs("#loginBox")?.style.setProperty("display", "none");
    qs("#dashboard")?.style.setProperty("display", "block");
    qs("#who").textContent = `Hey, ${user?.name || "Worker"}`;
    qs("#role").textContent = user?.role || "";
  }

  window.login = async () => {
    const email = qs("#email")?.value;
    const password = qs("#password")?.value;
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      if (r.ok && j.token) {
        AirSpot.saveToken(j.token, j.user);
        showDashboard(j.user);
        renderInventory();
      } else AirSpot.toast(j.msg || "Login failed");
    } catch {
      AirSpot.toast("Login error");
    }
  };

  window.clock = async (action) => {
    try {
      const r = await AirSpot.apiFetch("/api/workers/clock", {
        method: "POST",
        body: JSON.stringify({ action })
      });
      const j = await r.json();
      if (r.ok) AirSpot.toast(j.msg || `Clocked ${action}`);
      else AirSpot.toast(j.msg || "Clock error");
    } catch {
      AirSpot.toast("Auth required");
    }
  };

  // Auto-init
  document.addEventListener("DOMContentLoaded", () => {
    if (qs("#products")) AirSpot.initShop();

    const token = AirSpot.getToken();
    if (token && qs("#dashboard")) {
      const user = AirSpot.getUser();
      showDashboard(user || {});
      renderInventory();
    }
  });
})();
