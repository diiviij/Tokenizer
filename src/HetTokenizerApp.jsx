import React, { useEffect, useMemo, useState } from "react";

// HETokenizer (browser-friendly subset)
// - A compact tokenizer implementation adapted from the Node demo
// - Supports train(corpus), loadVocab(json), encode(text), decode(ids)
// Note: this file is intentionally self-contained so you can preview it in the canvas.

class HETokenizer {
  constructor() {
    this.wordStart = "▁";
    this.vocab = [];
    this.tokenToId = new Map();
    this.idToToken = new Map();
    this.merges = [];
    this.special = {
      pad: "<pad>",
      unk: "<unk>",
      bos: "<bos>",
      eos: "<eos>",
      num: "<num>",
      url: "<url>",
      email: "<email>",
      emoji: "<emoji>",
      cap: "<cap>",
    };
    this.config = {
      vocabSize: 1200,
      normalizeNumbers: true,
      normalizeUrls: true,
      emojiAsSingleToken: true,
      preserveCaseMarkers: true,
      unknownHandling: "char",
    };
  }

  _rebuildMaps() {
    this.tokenToId = new Map();
    this.idToToken = new Map();
    for (let i = 0; i < this.vocab.length; i++) {
      this.tokenToId.set(this.vocab[i], i);
      this.idToToken.set(i, this.vocab[i]);
    }
    // ensure special tokens
    for (const k of Object.values(this.special)) {
      if (!this.tokenToId.has(k)) {
        const id = this.vocab.length;
        this.vocab.push(k);
        this.tokenToId.set(k, id);
        this.idToToken.set(id, k);
      }
    }
    if (!this.tokenToId.has(this.special.unk)) {
      const id = this.vocab.length;
      this.tokenToId.set(this.special.unk, id);
      this.idToToken.set(id, this.special.unk);
    }
  }

  train(corpus, opts = {}) {
    Object.assign(this.config, opts);
    const vocabSize = this.config.vocabSize;
    const normalized = corpus.replace(/\s+/g, " ").trim();
    const words =
      normalized.length === 0
        ? []
        : normalized.split(" ").map((w) => this.wordStart + w);
    let corpusTokens = words.map((w) => Array.from(w));
    const tokenSet = new Set();
    for (const wt of corpusTokens) for (const ch of wt) tokenSet.add(ch);
    this.vocab = Array.from(tokenSet).sort();
    this._rebuildMaps();
    // reserve special tokens
    for (const s of Object.values(this.special)) {
      if (!this.tokenToId.has(s)) this.vocab.push(s);
    }
    this._rebuildMaps();
    while (this.vocab.length < vocabSize) {
      const pairFreq = new Map();
      for (const wt of corpusTokens) {
        for (let i = 0; i < wt.length - 1; i++) {
          const a = wt[i],
            b = wt[i + 1];
          const pair = a + "\u0001" + b;
          pairFreq.set(pair, (pairFreq.get(pair) || 0) + 1);
        }
      }
      if (pairFreq.size === 0) break;
      let bestPair = null;
      let bestCount = 0;
      for (const [pair, count] of pairFreq.entries())
        if (count > bestCount) {
          bestCount = count;
          bestPair = pair;
        }
      if (bestCount < 2) break;
      const [a, b] = bestPair.split("\u0001");
      const merged = a + b;
      const newCorpus = [];
      for (const wt of corpusTokens) {
        const newWt = [];
        let i = 0;
        while (i < wt.length) {
          if (i < wt.length - 1 && wt[i] === a && wt[i + 1] === b) {
            newWt.push(merged);
            i += 2;
          } else {
            newWt.push(wt[i]);
            i += 1;
          }
        }
        newCorpus.push(newWt);
      }
      corpusTokens = newCorpus;
      if (!this.tokenToId.has(merged)) {
        this.vocab.push(merged);
        this.merges.push([a, b]);
        this._rebuildMaps();
      }
    }
    this.vocab.sort((x, y) => y.length - x.length || x.localeCompare(y));
    this._rebuildMaps();
    return { vocab: this.vocab.slice(), merges: this.merges.slice() };
  }

  loadVocabObject(obj) {
    this.vocab = obj.vocab || [];
    this.merges = obj.merges || [];
    this.special = obj.special || this.special;
    this.config = obj.config || this.config;
    this.vocab.sort((x, y) => y.length - x.length || x.localeCompare(y));
    this._rebuildMaps();
  }

  _isUrl(word) {
    return /https?:\/\//i.test(word) || /www\./i.test(word);
  }
  _isEmail(word) {
    return /\S+@\S+\.\S+/.test(word);
  }
  _isNumber(word) {
    return /^[-+]?\d+(?:[.,]\d+)?$/.test(word);
  }

  encode(text, opts = {}) {
    opts = Object.assign({}, this.config, opts);
    if (!text) return { ids: [], tokens: [], meta: {} };
    const normalized = text.replace(/\s+/g, " ").trim();
    const words = normalized.length === 0 ? [] : normalized.split(" ");
    const tokens = [];
    const meta = { normalizedText: normalized, regions: [] };
    const domain = /function\s+|console\.|\{\}/.test(text) ? "code" : "general";
    for (const w of words) {
      const region = { original: w, tokens: [], info: {} };
      if (opts.normalizeUrls && this._isUrl(w)) {
        region.tokens.push(this.special.url);
        region.info.normalized = true;
        region.info.type = "url";
        tokens.push(this.special.url);
        meta.regions.push(region);
        continue;
      }
      if (opts.normalizeUrls && this._isEmail(w)) {
        region.tokens.push(this.special.email);
        region.info.normalized = true;
        region.info.type = "email";
        tokens.push(this.special.email);
        meta.regions.push(region);
        continue;
      }
      if (opts.normalizeNumbers && this._isNumber(w)) {
        region.tokens.push(this.special.num);
        region.info.normalized = true;
        region.info.type = "num";
        tokens.push(this.special.num);
        meta.regions.push(region);
        continue;
      }
      if (opts.emojiAsSingleToken && /^\p{Emoji}+$/u.test(w)) {
        region.tokens.push(this.special.emoji);
        region.info.normalized = true;
        region.info.type = "emoji";
        tokens.push(this.special.emoji);
        meta.regions.push(region);
        continue;
      }
      let cur = this.wordStart + w;
      if (opts.preserveCaseMarkers && /[A-Z]/.test(w)) {
        tokens.push(this.special.cap);
        region.tokens.push(this.special.cap);
        region.info.case = "hasUpper";
      }
      while (cur.length > 0) {
        let matched = null;
        for (const t of this.vocab) {
          if (cur.startsWith(t)) {
            matched = t;
            break;
          }
        }
        if (matched) {
          tokens.push(matched);
          region.tokens.push(matched);
          cur = cur.slice(matched.length);
        } else {
          const ch = Array.from(cur)[0];
          if (this.tokenToId.has(ch)) {
            tokens.push(ch);
            region.tokens.push(ch);
            cur = cur.slice(ch.length);
          } else {
            tokens.push(this.special.unk);
            region.tokens.push(this.special.unk);
            cur = cur.slice(1);
          }
        }
      }
      meta.regions.push(region);
    }
    const ids = tokens.map((t) =>
      this.tokenToId.has(t)
        ? this.tokenToId.get(t)
        : this.tokenToId.get(this.special.unk)
    );
    return { ids, tokens, meta, domain };
  }

  decode(ids, meta = {}, opts = {}) {
    opts = Object.assign({}, this.config, opts);
    const tokens = ids.map((id) => this.idToToken.get(id) || this.special.unk);
    let joined = tokens.join("");
    joined = joined.replace(new RegExp(this.wordStart, "g"), " ");
    if (opts.preserveCaseMarkers) {
      const capTok = this.special.cap;
      const parts = [];
      const tokList = ids.map((i) => this.idToToken.get(i) || this.special.unk);
      for (let i = 0; i < tokList.length; i++) {
        const t = tokList[i];
        if (t === capTok) {
          let j = i + 1;
          let acc = "";
          while (j < tokList.length) {
            const nt = tokList[j];
            if (nt.includes(this.wordStart)) {
              acc += nt;
              j++;
              break;
            }
            acc += nt;
            j++;
          }
          parts.push(
            this._capitalizeFirstChar(acc.replace(this.wordStart, ""))
          );
          i = j - 1;
        } else {
          if (!t.includes(this.wordStart)) parts.push(t);
          else parts.push(t.replace(this.wordStart, ""));
        }
      }
      const text = parts.join(" ").replace(/\s+/g, " ").trim();
      return { text, tokens: tokList };
    }
    const text = joined.trimStart();
    return { text, tokens };
  }

  _capitalizeFirstChar(s) {
    if (!s) return s;
    return s[0].toUpperCase() + s.slice(1);
  }
}

// Demo corpus (kept short to keep train fast in-browser)
const demoCorpus = `Hello world\nThis is a demo corpus for the HETokenizer.\nIt includes numbers like 12345 and urls like https://example.com and emails like test@openai.com\nWe also include emoji ❤️🎉 and some code: function hello() { console.log('hi'); }\n`;

// React component
export default function HETokenizerDemo() {
  const [tokenizer] = useState(() => new HETokenizer());
  const [trained, setTrained] = useState(false);
  const [corpus, setCorpus] = useState(demoCorpus);
  const [input, setInput] = useState("Hello there 123 ❤️");
  const [out, setOut] = useState(null);
  const [vocabJson, setVocabJson] = useState(null);
  const [vocabPreview, setVocabPreview] = useState([]);
  const [opts, setOpts] = useState({
    vocabSize: 800,
    normalizeNumbers: true,
    preserveCaseMarkers: true,
  });

  useEffect(() => {
    // train small vocab immediately for demo
    const res = tokenizer.train(corpus, { vocabSize: opts.vocabSize });
    setTrained(true);
    setVocabPreview(tokenizer.vocab.slice(0, 80));
  }, []);

  function handleEncode() {
    const res = tokenizer.encode(input, opts);
    setOut(res);
  }

  function handleDecode() {
    if (!out) return;
    const dec = tokenizer.decode(out.ids);
    alert("Decoded text:\n" + (dec.text || dec));
  }

  function downloadVocab() {
    const obj = {
      vocab: tokenizer.vocab,
      merges: tokenizer.merges,
      special: tokenizer.special,
      config: tokenizer.config,
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocab.json";
    a.click();
  }

  function uploadVocab(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        tokenizer.loadVocabObject(obj);
        setVocabPreview(tokenizer.vocab.slice(0, 80));
        setVocabJson(obj);
        setTrained(true);
        alert("Loaded vocab with size " + tokenizer.vocab.length);
      } catch (err) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  }

  // small helper to display token cloud
  const tokenCloud = useMemo(
    () =>
      vocabPreview.map((t, i) => ({
        t,
        i,
        sz: Math.max(8, 18 - Math.floor(t.length)),
      })),
    [vocabPreview]
  );

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <h1 className="text-white text-4xl font-bold">
        HETokenizer — React Demo
      </h1>
      <p className="text-gray-300">
        Train a small vocab, paste text, and visualize tokens & ids. Demo keeps
        everything client-side.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Corpus (used for training)</h3>
          <textarea
            rows={6}
            value={corpus}
            onChange={(e) => setCorpus(e.target.value)}
            className="w-full mt-2 p-2 border rounded text-sm"
          ></textarea>
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={() => {
                tokenizer.train(corpus, { vocabSize: opts.vocabSize });
                setVocabPreview(tokenizer.vocab.slice(0, 80));
                setTrained(true);
              }}
            >
              Retrain
            </button>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded"
              onClick={downloadVocab}
            >
              Download Vocab
            </button>
            <label className="px-3 py-1 bg-gray-200 rounded cursor-pointer">
              <input
                type="file"
                accept="application/json"
                onChange={uploadVocab}
                className="hidden"
              />
              Upload Vocab
            </label>
          </div>
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold">Options</h3>
          <div className="mt-2 text-sm flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.normalizeNumbers}
                onChange={(e) =>
                  setOpts((s) => ({ ...s, normalizeNumbers: e.target.checked }))
                }
              />{" "}
              Normalize numbers to &lt;num&gt;
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.preserveCaseMarkers}
                onChange={(e) =>
                  setOpts((s) => ({
                    ...s,
                    preserveCaseMarkers: e.target.checked,
                  }))
                }
              />{" "}
              Preserve case markers
            </label>
            <label className="flex items-center gap-2">
              Vocab size:{" "}
              <input
                type="range"
                min={200}
                max={2000}
                value={opts.vocabSize}
                onChange={(e) =>
                  setOpts((s) => ({
                    ...s,
                    vocabSize: parseInt(e.target.value),
                  }))
                }
              />{" "}
              {opts.vocabSize}
            </label>
            <button
              className="px-3 py-1 bg-indigo-600 text-white rounded w-max"
              onClick={() => {
                tokenizer.train(corpus, { vocabSize: opts.vocabSize });
                setVocabPreview(tokenizer.vocab.slice(0, 80));
                alert("Retrained");
              }}
            >
              Apply & Retrain
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border rounded mb-4">
        <h3 className="font-semibold">Input (type or paste)</h3>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border rounded mt-2"
        />
        <div className="flex gap-2 mt-2">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={handleEncode}
          >
            Encode
          </button>
          <button
            className="px-3 py-1 bg-gray-300 rounded"
            onClick={() => {
              setInput("Hello there 123 ❤️ https://openai.com");
            }}
          >
            Example
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={handleDecode}
          >
            Decode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 border rounded">
          <h4 className="font-semibold mb-2">Tokens</h4>
          <div className="flex flex-wrap gap-1 min-h-[120px]">
            {out?.tokens?.map((t, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-50 border rounded text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 border rounded">
          <h4 className="font-semibold mb-2">IDs</h4>
          <pre className="text-xs">{out ? JSON.stringify(out.ids) : ""}</pre>
        </div>

        <div className="p-3 border rounded">
          <h4 className="font-semibold mb-2">Decoded</h4>
          <div className="text-sm min-h-[120px]">
            {out ? tokenizer.decode(out.ids).text : ""}
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 border rounded">
        <h4 className="font-semibold mb-2">Vocab preview (top tokens)</h4>
        <div className="flex flex-wrap gap-2">
          {tokenCloud.map((x) => (
            <div
              key={x.i}
              style={{ fontSize: x.sz }}
              className="px-2 py-1 border rounded bg-white"
            >
              {x.t}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        This is a small, educational demo: the tokenizer runs entirely in your
        browser. Use the options to change vocab size and retrain quickly. For
        production you would train on a much larger corpus and persist the
        vocab.json.
      </div>
    </div>
  );
}
