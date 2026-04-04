class GameCard extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'description', 'href', 'icon'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.render();
  }

  render() {
    const name = this.getAttribute('name') || 'Game';
    const description = this.getAttribute('description') || '';
    const href = this.getAttribute('href') || '#';
    const icon = this.getAttribute('icon') || '🎮';

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; height: 100%; }

      a {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem 1.25rem;
        background: var(--bg-card, #232734);
        border: 1px solid var(--border, #2e3241);
        border-radius: var(--radius, 12px);
        text-decoration: none;
        color: inherit;
        transition: transform 0.18s ease, background 0.18s, border-color 0.18s, box-shadow 0.18s;
        cursor: pointer;
        height: 100%;
        box-sizing: border-box;
      }

      a:hover, a:focus-visible {
        background: var(--bg-card-hover, #2c3042);
        border-color: var(--accent, #7c83ff);
        transform: translateY(-4px);
        box-shadow: 0 8px 24px var(--shadow, rgba(0,0,0,0.4));
      }

      a:focus-visible {
        outline: 2px solid var(--accent, #7c83ff);
        outline-offset: 2px;
      }

      a:active { transform: translateY(-1px); }

      .icon { font-size: 3rem; line-height: 1; }
      .icon img { height: 3rem; width: auto; vertical-align: middle; }
      .icon .suit-black { color: #1a1d27; }
      .icon .suit-red { color: #ef233c; }

      .name {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-on-card, var(--text-primary, #e8eaed));
      }

      .description {
        font-size: 0.85rem;
        color: var(--text-on-card, var(--text-secondary, #9aa0a6));
        text-align: center;
        line-height: 1.4;
      }
    `;

    const link = document.createElement('a');
    link.href = href;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.innerHTML = icon;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = name;

    link.append(iconSpan, nameSpan);

    if (description) {
      const descSpan = document.createElement('span');
      descSpan.className = 'description';
      descSpan.textContent = description;
      link.append(descSpan);
    }

    this.shadowRoot.replaceChildren(style, link);
  }
}

customElements.define('game-card', GameCard);
