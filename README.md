# Vite Tokenization Experience

A custom tokenizer implementation in JavaScript that **learns vocabulary from text**, supports **ENCODE** and **DECODE**, and handles **special tokens** — showcased as an interactive web application built with **Vite + React + TailwindCSS**.

This project demonstrates **real-time tokenization** with visual feedback, allowing users to understand how AI processes text.

---

## ✨ Features

- **Custom Tokenizer**
  - Learns vocabulary dynamically from input text.
  - Supports `ENCODE` (text → token IDs) and `DECODE` (token IDs → text).
  - Handles special tokens (`<PAD>`, `<UNK>`, `<BOS>`, `<EOS>`).

- **Multiple Tokenization Modes**
  - Character-level tokenization
  - Word-level tokenization
  - UTF-8 byte-level tokenization

- **Interactive UI**
  - Type text and click **Tokenize** to see generated tokens & IDs.
  - Click tokens to inspect token IDs.
  - Switch between `ENCODE` and `DECODE` modes.
  - Animated token display with color-coded IDs.

- **Reverse Mode**
  - Paste token IDs and decode them back into text instantly.

---

## 📸 Screenshots

### Encode View
![Encode Example](screenshots/encode-view.png)

### Decode View
![Decode Example](screenshots/decode-view.png)

---

## 🛠️ Tech Stack

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- JavaScript ES6+

---

## 📦 Installation & Setup

Clone the repo:

```bash
git clone https://github.com/yourusername/vite-tokenizer.git
cd vite-tokenizer
