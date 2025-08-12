export default class Tokenizer {
  constructor() {
    this.vocab = {};
    this.reverseVocab = {};
    this.specialTokens = { "<PAD>": 0, "<UNK>": 1 };
    this.nextId = Object.keys(this.specialTokens).length;

    // Initialize reverse vocab
    for (let token in this.specialTokens) {
      this.vocab[token] = this.specialTokens[token];
      this.reverseVocab[this.specialTokens[token]] = token;
    }
  }

  learnVocab(corpus) {
    this.vocab = { ...this.specialTokens };
    this.reverseVocab = {};
    this.nextId = Object.keys(this.specialTokens).length;

    const words = corpus
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.trim() !== "");

    words.forEach((word) => {
      if (!this.vocab[word]) {
        this.vocab[word] = this.nextId;
        this.reverseVocab[this.nextId] = word;
        this.nextId++;
      }
    });

    // Populate reverse vocab for special tokens
    for (let token in this.vocab) {
      this.reverseVocab[this.vocab[token]] = token;
    }
  }

  encode(text) {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.trim() !== "");
    return words.map((word) =>
      this.vocab[word] !== undefined ? this.vocab[word] : this.vocab["<UNK>"]
    );
  }

  decode(tokenIds) {
    return tokenIds
      .map((id) =>
        this.reverseVocab[id] !== undefined ? this.reverseVocab[id] : "<UNK>"
      )
      .join(" ");
  }
}
