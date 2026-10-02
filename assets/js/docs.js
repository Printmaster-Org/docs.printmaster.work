(() => {
  const theme = document.querySelector('#theme-toggle');
  let preference;
  try { preference = localStorage.getItem('printmaster-docs-theme'); } catch { /* Storage may be blocked. */ }
  const light = preference ? preference === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  function setTheme(enabled) {
    document.body.classList.toggle('light-mode', enabled);
    theme.setAttribute('aria-pressed', String(enabled));
    theme.setAttribute('aria-label', enabled ? 'Toggle dark theme' : 'Toggle light theme');
  }
  setTheme(light);
  theme.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('light-mode');
    setTheme(enabled);
    try { localStorage.setItem('printmaster-docs-theme', enabled ? 'light' : 'dark'); } catch { /* Optional persistence. */ }
  });
  document.querySelector('#menu-toggle').addEventListener('click', event => {
    const open = document.querySelector('#sidebar').classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  const search = document.querySelector('#search');
  const results = document.querySelector('#search-results');
  let indexPromise;
  let request = 0;
  search.addEventListener('input', async () => {
    const current = ++request;
    const query = search.value.trim().toLowerCase();
    results.replaceChildren();
    if (query.length < 2) return;
    try {
      indexPromise ??= fetch(search.dataset.index).then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      });
      const index = await indexPromise;
      if (request !== current) return;
      const words = query.split(/\s+/);
      const matches = index.filter(page => words.every(word => `${page.title} ${page.text}`.toLowerCase().includes(word)))
        .sort((a, b) => Number(b.title.toLowerCase().includes(query)) - Number(a.title.toLowerCase().includes(query))).slice(0, 12);
      if (!matches.length) results.textContent = 'No matching docs.';
      for (const page of matches) {
        const link = document.createElement('a');
        link.href = page.url;
        link.textContent = page.title;
        results.append(link);
      }
    } catch {
      indexPromise = undefined;
      if (request === current) results.textContent = 'Search unavailable. Browse sections below.';
    }
  });
})();