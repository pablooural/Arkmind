#!/usr/bin/env bash
# claim.sh — sistema de exclusión mutua para IAs en paralelo.
#
# Uso:
#   ./claim.sh claim T-XXX "descripción corta" "ia/mi-handle/t-XXX-slug" "archivo1.ts,archivo2.ts"
#   ./claim.sh release T-XXX  (al terminar)
#   ./claim.sh abandon T-XXX "motivo"  (si no podés terminar)
#   ./claim.sh list  (ver todas las tarjetas activas)
#   ./claim.sh check T-XXX  (verifica si una tarjeta está libre)
#
# Antes de empezar una tarjeta, ejecutá `claim.sh check T-XXX`. Si está
# "free", podés hacer `claim.sh claim`. Si no, otra IA la está haciendo.
#
# Cuando hacés claim, el script:
# 1. Crea la rama localmente (si no existe)
# 2. Hace un commit vacío con el nombre de la tarjeta
# 3. Pushea la rama a origin (para que otras IAs la vean)
# 4. Actualiza CLAIMS.json con el lock

set -euo pipefail

CLAIMS_FILE=".arkmind/CLAIMS.json"
HANDLE="${MY_HANDLE:-@anonymous}"

cmd="${1:-}"
shift || true

if [ -z "$cmd" ]; then
  echo "Uso: $0 {claim|release|abandon|list|check} [args...]"
  exit 1
fi

case "$cmd" in
  claim)
    tarjeta="${1:?Falta el id de la tarjeta (ej: T-055)}"
    desc="${2:?Falta descripción}"
    branch="${3:?Falta el nombre de la rama}"
    files="${4:-}"  # opcional, lista separada por comas

    # 1. Verificar que la tarjeta no esté ya en progreso
    if python3 -c "
import json, sys
d = json.load(open('$CLAIMS_FILE'))
if any(c['tarjeta'] == '$tarjeta' and c.get('status') == 'inProgress' for c in d['inProgress']):
    sys.exit(1)
" 2>/dev/null; then
      : # OK, está libre
    else
      echo "ERROR: La tarjeta $tarjeta ya está en progreso."
      python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
for c in d['inProgress']:
    if c['tarjeta'] == '$tarjeta':
        print(f'  → tomadada por {c[\"handle\"]} ({c[\"branch\"]}) desde {c[\"startedAt\"]}')
"
      exit 1
    fi

    # 2. Crear la rama con un commit vacío
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    if [ "$current_branch" = "$branch" ]; then
      echo "ERROR: ya estás en la rama $branch. Salí primero."
      exit 1
    fi

    if git show-ref --verify --quiet "refs/heads/$branch"; then
      echo "La rama $branch ya existe localmente. Checkout..."
      git checkout "$branch"
    else
      echo "Creando rama $branch desde main..."
      git checkout -b "$branch" main
    fi

    # 3. Commit vacío con mensaje de la tarjeta
    echo "Commit vacío con la tarjeta..."
    git commit --allow-empty -m "[ia:$HANDLE] [mutex] $tarjeta claim (wip sentinel)" >/dev/null

    # 4. Push
    echo "Pusheando rama a origin..."
    if ! git push -u origin "$branch" 2>&1; then
      echo "ERROR: el push falló. ¿Estás en la rama correcta? ¿Tenés permisos?"
      exit 1
    fi

    # 5. Actualizar CLAIMS.json
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
# Remover de completed/abandoned si estaba
d['completed'] = [c for c in d.get('completed', []) if c.get('tarjeta') != '$tarjeta']
d['abandoned'] = [c for c in d.get('abandoned', []) if c.get('tarjeta') != '$tarjeta']
# Agregar a inProgress
claim = {
    'tarjeta':   '$tarjeta',
    'handle':    '$HANDLE',
    'branch':    '$branch',
    'desc':      '$desc',
    'files':     '$files'.split(',') if '$files' else [],
    'startedAt': '$timestamp',
    'status':    'inProgress'
}
d.setdefault('inProgress', []).append(claim)
json.dump(d, open('$CLAIMS_FILE', 'w'), indent=2, ensure_ascii=False)
print('CLAIMS.json actualizado')
"

    # 6. Commit del CLAIMS.json
    git add "$CLAIMS_FILE"
    git commit -m "[ia:$HANDLE] [mutex] $tarjeta claim registrado" >/dev/null
    git push origin "$branch" >/dev/null 2>&1 || true

    echo ""
    echo "✓ Tarjeta $tarjeta CLAIMEADA por $HANDLE en $branch"
    echo "  Las demás IAs ya no pueden tomar esta tarjeta."
    echo "  Cuando termines, ejecutá: $0 release $tarjeta"
    ;;

  release)
    tarjeta="${1:?Falta el id de la tarjeta}"
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
moved = None
for c in d.get('inProgress', []):
    if c['tarjeta'] == '$tarjeta':
        c['finishedAt'] = '$timestamp'
        c['status'] = 'completed'
        moved = c
        break
if moved is None:
    print(f'ERROR: $tarjeta no estaba en inProgress')
    exit(1)
d['completed'].append(moved)
d['inProgress'] = [c for c in d['inProgress'] if c['tarjeta'] != '$tarjeta']
json.dump(d, open('$CLAIMS_FILE', 'w'), indent=2, ensure_ascii=False)
print(f'✓ $tarjeta movida a completed')
"

    git add "$CLAIMS_FILE"
    git commit -m "[ia:$HANDLE] [mutex] $tarjeta released" >/dev/null
    git push origin HEAD 2>&1 | tail -1
    ;;

  abandon)
    tarjeta="${1:?Falta el id de la tarjeta}"
    motivo="${2:?Falta el motivo}"
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
moved = None
for c in d.get('inProgress', []):
    if c['tarjeta'] == '$tarjeta':
        c['abandonedAt'] = '$timestamp'
        c['status']      = 'abandoned'
        c['motivo']      = '$motivo'
        moved = c
        break
if moved is None:
    print(f'ERROR: $tarjeta no estaba en inProgress')
    exit(1)
d['abandoned'].append(moved)
d['inProgress'] = [c for c in d['inProgress'] if c['tarjeta'] != '$tarjeta']
json.dump(d, open('$CLAIMS_FILE', 'w'), indent=2, ensure_ascii=False)
print(f'✓ $tarjeta movida a abandoned (motivo: $motivo)')
"

    git add "$CLAIMS_FILE"
    git commit -m "[ia:$HANDLE] [mutex] $tarjeta abandoned: $motivo" >/dev/null
    git push origin HEAD 2>&1 | tail -1
    ;;

  list)
    echo "=== IN PROGRESS ==="
    python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
for c in d.get('inProgress', []):
    print(f'  {c[\"tarjeta\"]:8} {c[\"handle\"]:20} {c[\"branch\"]:50} started: {c[\"startedAt\"]}')
    print(f'           files: {c.get(\"files\", [])}')
"
    echo ""
    echo "=== COMPLETED (últimos 10) ==="
    python3 -c "
import json
d = json.load(open('$CLAIMS_FILE'))
for c in d.get('completed', [])[-10:]:
    print(f'  {c[\"tarjeta\"]:8} {c[\"handle\"]:20} finished: {c.get(\"finishedAt\", \"?\")}')
"
    ;;

  check)
    tarjeta="${1:?Falta el id de la tarjeta}"
    python3 -c "
import json, sys
d = json.load(open('$CLAIMS_FILE'))
for c in d.get('inProgress', []):
    if c['tarjeta'] == '$tarjeta':
        print(f'BUSY: $tarjeta está siendo trabajada por {c[\"handle\"]} en {c[\"branch\"]}')
        sys.exit(1)
print(f'FREE: $tarjeta está libre para tomar')
"
    ;;

  *)
    echo "Comando desconocido: $cmd"
    echo "Uso: $0 {claim|release|abandon|list|check} [args...]"
    exit 1
    ;;
esac