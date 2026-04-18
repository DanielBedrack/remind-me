const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

// 1. Copy service worker
fs.copyFileSync(
  path.join(__dirname, '..', 'web', 'service-worker.js'),
  path.join(dist, 'service-worker.js')
);

// 2. Patch index.html: fix absolute asset paths + inject SW registration
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// Fix /_expo/ → ./_expo/ so paths work under /remind-me/
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');

// Inject SW registration before </head>
const swSnippet = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).then(function(r){console.log('SW registered',r.scope)}).catch(function(e){console.warn('SW failed',e)})})}</script>`;
if (!html.includes('serviceWorker.register')) {
  html = html.replace('</head>', swSnippet + '\n  </head>');
}

fs.writeFileSync(path.join(dist, 'index.html'), html);

// 3. Ensure .nojekyll exists (GitHub Pages must not ignore _expo/ folder)
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log('✓ Post-build: SW copied, paths fixed, .nojekyll written');
