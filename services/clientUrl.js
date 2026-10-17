function buildClientUrl(path, baseUrl = process.env.CLIENT_URL) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim())
    throw new Error('CLIENT_URL is not configured');
  if (typeof path !== 'string' || !path.trim())
    throw new Error('A client URL path is required');

  return `${baseUrl.trim().replace(/\/+$/, '')}/${path.trim().replace(/^\/+/, '')}`;
}

module.exports = { buildClientUrl };
