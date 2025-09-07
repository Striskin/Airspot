import React from "react";
import "./Navbar.css";

const Navbar = ({ cartCount, onCartClick, onWorkerClick, onUserClick }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">☁️ AirSpot</h1>
      </div>

      <div className="navbar-right">
        <button className="nav-btn" onClick={onCartClick}>
          🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

        <button className="nav-btn" onClick={onWorkerClick}>
          👷 Worker
        </button>

        <button className="nav-btn" onClick={onUserClick}>
          🙋 Sign In / Up
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
