kind = "web"
previewPath = "/"
title = "UX Arquitecto"
version = "1.0.0"
id = "artifacts/ux-arquitecto"
router = "path"

[[integratedSkills]]
name = "react-vite"
version = "1.0.0"

[[services]]
name = "web"
paths = [ "/" ]
localPort = 18874

[services.development]
run = "pnpm --filter @workspace/ux-arquitecto run dev"

[services.production]
build = [ "pnpm", "--filter", "@workspace/ux-arquitecto", "run", "build" ]
publicDir = "artifacts/ux-arquitecto/dist/public"
serve = "static"

[[services.production.rewrites]]
from = "/*"
to = "/index.html"

[services.env]
PORT = "18874"
BASE_PATH = "/"
