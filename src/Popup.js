import React from "react";
import "./Popup.css";

export default function Popup({ onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>What is a Corpus?</h2>
        <p>
          A <b>corpus</b> is simply a large collection of text. It’s what we use
          to “teach” our tokenizer what words exist. Think of it as the raw
          ingredients before cooking a recipe.
        </p>
        <button onClick={onClose}>Got it!</button>
      </div>
    </div>
  );
}
