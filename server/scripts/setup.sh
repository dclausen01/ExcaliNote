#!/bin/bash
# ExcaliNote Sync Server Setup Script
# Führt die initiale Konfiguration von CouchDB durch

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ExcaliNote Sync Server Setup ===${NC}"
echo ""

# .env Datei prüfen
if [ ! -f .env ]; then
    echo -e "${YELLOW}Keine .env Datei gefunden. Erstelle aus .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Bitte bearbeite die .env Datei und führe das Script erneut aus.${NC}"
        exit 1
    else
        echo -e "${RED}Fehler: .env.example nicht gefunden!${NC}"
        exit 1
    fi
fi

# .env laden
source .env

# Prüfe ob Standardpasswort verwendet wird
if [ "$COUCHDB_ADMIN_PASSWORD" = "changeme_to_secure_password" ] || [ "$COUCHDB_ADMIN_PASSWORD" = "changeme" ]; then
    echo -e "${RED}FEHLER: Bitte ändere das Admin-Passwort in der .env Datei!${NC}"
    exit 1
fi

# CouchDB URL
COUCHDB_URL="http://${COUCHDB_ADMIN_USER}:${COUCHDB_ADMIN_PASSWORD}@localhost:5984"

echo "Warte auf CouchDB..."
until curl -s "${COUCHDB_URL}/_up" > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}OK${NC}"

echo ""
echo "Konfiguriere CouchDB..."

# System-Datenbanken erstellen
echo -n "  Erstelle System-Datenbanken... "
curl -s -X PUT "${COUCHDB_URL}/_users" > /dev/null 2>&1 || true
curl -s -X PUT "${COUCHDB_URL}/_replicator" > /dev/null 2>&1 || true
curl -s -X PUT "${COUCHDB_URL}/_global_changes" > /dev/null 2>&1 || true
echo -e "${GREEN}OK${NC}"

# Cluster-Setup abschließen (Single Node)
echo -n "  Finalisiere Single-Node Setup... "
curl -s -X POST "${COUCHDB_URL}/_cluster_setup" \
    -H "Content-Type: application/json" \
    -d '{"action": "finish_cluster"}' > /dev/null 2>&1 || true
echo -e "${GREEN}OK${NC}"

echo ""
echo -e "${GREEN}=== Setup abgeschlossen ===${NC}"
echo ""
echo "Nächste Schritte:"
echo "1. Nginx-Konfiguration einrichten (siehe nginx/excalinote-sync.conf)"
echo "2. SSL-Zertifikat über Plesk/Let's Encrypt konfigurieren"
echo "3. Benutzer mit dem user-Skript erstellen: ./scripts/manage-user.sh"
echo ""
echo "CouchDB Admin UI (Fauxton): http://localhost:5984/_utils"
echo "Status: http://localhost:5984/_up"
