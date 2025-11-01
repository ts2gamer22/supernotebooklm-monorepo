import "./polyfills";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { debugAuth } from "./debug";
import { api } from "./_generated/api";

const http = httpRouter();

// Test route to verify HTTP routing works
http.route({
  path: "/api/test",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "OK", message: "HTTP routing works!" }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Debug route to test Better Auth
http.route({
  path: "/api/debug/auth",
  method: "GET",
  handler: debugAuth,
});

// Popup completion bridge hosted on Convex domain.
// Better Auth will redirect here after successful OAuth when callbackURL points to this path.
// This page notifies the opener (the extension) and closes the popup.
http.route({
  path: "/auth/popup-complete",
  method: "GET",
  handler: httpAction(async () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication Complete</title>
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1020; color: #e5e7eb; }
    .card { background: #111827; border: 1px solid #1f2937; padding: 24px; border-radius: 12px; text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(229,231,235,0.2); border-top-color: #60a5fa; border-radius: 50%; margin: 0 auto 12px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1 style="margin: 0 0 6px 0; font-size: 18px;">Signed in</h1>
    <p style="margin: 0; opacity: .8;">You can close this window.</p>
  </div>
  <script>
    try {
      // Inform the opener (extension) that auth is complete.
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
      }
    } catch (e) {
      console.error('[Popup Bridge] postMessage failed:', e);
    }
    // Close shortly after notifying.
    setTimeout(() => { try { window.close(); } catch (_) {} }, 800);
  </script>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }),
});

// Public Notebook Viewing (Story 4.2)
// Serves public notebooks as HTML pages with Open Graph meta tags
http.route({
  path: "/notebook/:notebookId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const notebookId = pathParts[pathParts.length - 1];

    if (!notebookId) {
      return new Response('Notebook not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    try {
      // Fetch notebook using getNotebookById query
      const notebook = await ctx.runQuery(api.notebooks.getNotebookById, {
        notebookId: notebookId as any,
      });

      if (!notebook) {
        return new Response(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Notebook Not Found - SuperNotebookLM</title>
            <style>
              body {
                font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 60px auto;
                padding: 40px 20px;
                background-color: #1e1e1e;
                color: #e0e0e0;
                text-align: center;
              }
              h1 { color: #ef4444; font-size: 32px; }
              a { color: #4a9eff; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Notebook Not Found</h1>
            <p>This notebook may have been deleted or is no longer public.</p>
            <a href="https://chromewebstore.google.com/detail/supernotebooklm">Install SuperNotebookLM Extension</a>
          </body>
          </html>
        `, { 
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // Increment view count (fire and forget)
      ctx.runMutation(api.notebooks.incrementViewCount, {
        notebookId: notebookId as any,
      }).catch((err) => console.error('Failed to increment view count:', err));

      // Format content (replace newlines with <br> for HTML display)
      const formattedContent = notebook.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

      // Render HTML page with Open Graph meta tags
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notebook.title} - SuperNotebookLM</title>
          
          <!-- Open Graph meta tags for social sharing -->
          <meta property="og:title" content="${notebook.title}">
          <meta property="og:description" content="${notebook.description}">
          <meta property="og:type" content="article">
          <meta property="og:url" content="${request.url}">
          
          <!-- Twitter Card -->
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${notebook.title}">
          <meta name="twitter:description" content="${notebook.description}">
          
          <style>
            body {
              font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background-color: #1e1e1e;
              color: #e0e0e0;
              line-height: 1.6;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 8px;
              color: #ffffff;
            }
            .meta {
              color: #9ca3af;
              margin-bottom: 24px;
              font-size: 14px;
            }
            .category {
              display: inline-block;
              background-color: #4a9eff;
              color: white;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              margin-bottom: 16px;
              font-weight: 500;
            }
            .description {
              background-color: #2d2d2d;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 24px;
              border-left: 4px solid #4a9eff;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .content p {
              margin: 16px 0;
            }
            .cta {
              margin-top: 40px;
              padding: 24px;
              background-color: #2d2d2d;
              border-radius: 8px;
              text-align: center;
            }
            .cta a {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4a9eff;
              color: white;
              text-decoration: none;
              font-weight: 500;
              border-radius: 6px;
              transition: background-color 0.2s;
            }
            .cta a:hover {
              background-color: #3b82f6;
            }
            .stats {
              display: flex;
              gap: 16px;
              margin-bottom: 16px;
              font-size: 14px;
              color: #9ca3af;
            }
            .stat {
              display: flex;
              align-items: center;
              gap: 4px;
            }
          </style>
        </head>
        <body>
          <div class="category">${notebook.category}</div>
          <h1>${notebook.title}</h1>
          <div class="meta">
            <div class="stats">
              <div class="stat">
                👁️ ${notebook.viewCount} views
              </div>
              <div class="stat">
                📅 ${new Date(notebook.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          <div class="description">
            <strong>Description:</strong> ${notebook.description}
          </div>
          
          <div class="content">
            <p>${formattedContent}</p>
          </div>
          
          <div class="cta">
            <p style="margin-bottom: 16px; color: #e0e0e0;">Want to create your own research notebooks?</p>
            <a href="https://chromewebstore.google.com/detail/supernotebooklm">
              Install SuperNotebookLM Extension
            </a>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error('Error fetching notebook:', error);
      return new Response('Error loading notebook', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }),
});

// Register Better Auth routes - these will be hosted on Convex infrastructure
// Accessible at https://cheery-salmon-841.convex.site/api/auth/*
authComponent.registerRoutes(http, createAuth, {
  cors: true, // Enable CORS for Chrome extension
});

export default http;
