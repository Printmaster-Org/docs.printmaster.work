document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#swagger-ui');
  if (!container) return;
  if (typeof SwaggerUIBundle !== 'function') {
    container.textContent = 'API viewer unavailable. Download the OpenAPI YAML above.';
    return;
  }
  SwaggerUIBundle({
    url: container.dataset.spec,
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis],
    supportedSubmitMethods: [],
    tryItOutEnabled: false,
    validatorUrl: null,
    persistAuthorization: false,
    docExpansion: 'list',
    displayRequestDuration: false,
  });
});