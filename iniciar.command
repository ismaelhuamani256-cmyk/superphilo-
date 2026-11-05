#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Instala Node.js desde https://nodejs.org y vuelve a abrir esto."; read -n1; exit 1; fi
node server.js
