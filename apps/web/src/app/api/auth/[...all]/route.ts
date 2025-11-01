/**
 * Better Auth API Route Handler for Next.js
 * 
 * This proxies all auth requests to the Convex backend where Better Auth is configured.
 * 
 * Path: /api/auth/*
 * Proxies to: https://cheery-salmon-841.convex.site/api/auth/*
 */

import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') || 
                        'https://cheery-salmon-841.convex.site';

export async function GET(
  request: NextRequest,
  { params }: { params: { all: string[] } }
) {
  return handleAuthRequest(request, params.all);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { all: string[] } }
) {
  return handleAuthRequest(request, params.all);
}

async function handleAuthRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = new URL(request.url);
  
  // Build the target URL on Convex site
  const targetUrl = `${CONVEX_SITE_URL}/api/auth/${path}${url.search}`;
  
  console.log(`[Auth Proxy] ${request.method} ${path} → ${targetUrl}`);
  
  try {
    // Forward the request to Convex
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
    
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
      redirect: 'manual', // Handle redirects manually
    });
    
    // If it's a redirect, rewrite the Location header to point back to our domain
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        console.log(`[Auth Proxy] Redirect: ${location}`);
        
        // If redirecting to Convex site, rewrite to our domain
        if (location.startsWith(CONVEX_SITE_URL)) {
          const rewrittenLocation = location.replace(CONVEX_SITE_URL, url.origin);
          console.log(`[Auth Proxy] Rewritten: ${rewrittenLocation}`);
          
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Location', rewrittenLocation);
          
          return new NextResponse(null, {
            status: response.status,
            headers: newHeaders,
          });
        }
      }
    }
    
    // Forward the response back to the client
    const responseHeaders = new Headers(response.headers);
    
    // Ensure cookies work across domains
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.set('set-cookie', setCookie);
    }
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('[Auth Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Auth proxy failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
