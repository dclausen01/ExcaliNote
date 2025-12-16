# CouchDB Server Administration für ExcaliNote

## Schnellübersicht

| Komponente | Standard-Wert |
|------------|---------------|
| CouchDB Port | 5984 |
| Admin-UI (Fauxton) | `http://localhost:5984/_utils` |
| Datenbank-Muster | `excalinote_<username>` |

---

## 1. CouchDB Installation

### Docker (empfohlen)
```bash
docker run -d --name couchdb \
  -p 5984:5984 \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=<sicheres-passwort> \
  -v couchdb_data:/opt/couchdb/data \
  couchdb:3
```

### Systemdienst (Debian/Ubuntu)
```bash
sudo apt install couchdb
sudo systemctl enable couchdb
sudo systemctl start couchdb
```

---

## 2. Benutzerverwaltung

### Neuen Benutzer anlegen
```bash
curl -X PUT http://admin:password@localhost:5984/_users/org.couchdb.user:<username> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<username>",
    "password": "<passwort>",
    "roles": [],
    "type": "user"
  }'
```

### Benutzer löschen
```bash
# Erst Revision holen
REV=$(curl -s http://admin:password@localhost:5984/_users/org.couchdb.user:<username> | jq -r '._rev')

# Dann löschen
curl -X DELETE "http://admin:password@localhost:5984/_users/org.couchdb.user:<username>?rev=$REV"
```

### Alle Benutzer auflisten
```bash
curl http://admin:password@localhost:5984/_users/_all_docs
```

---

## 3. Notizbuch-Datenbanken

### Datenbank für Benutzer erstellen
```bash
# Datenbank erstellen
curl -X PUT http://admin:password@localhost:5984/excalinote_<username>

# Benutzerrechte setzen
curl -X PUT http://admin:password@localhost:5984/excalinote_<username>/_security \
  -H "Content-Type: application/json" \
  -d '{
    "admins": { "names": [], "roles": [] },
    "members": { "names": ["<username>"], "roles": [] }
  }'
```

### Alle Datenbanken auflisten
```bash
curl http://admin:password@localhost:5984/_all_dbs
```

### Datenbank löschen
```bash
curl -X DELETE http://admin:password@localhost:5984/excalinote_<username>
```

---

## 4. Komplettes Setup für neuen Benutzer

```bash
#!/bin/bash
USERNAME="max.mustermann"
PASSWORD="geheimes-passwort"
ADMIN="admin:admin-password"
SERVER="http://localhost:5984"

# 1. Benutzer anlegen
curl -X PUT "$SERVER/_users/org.couchdb.user:$USERNAME" \
  -u "$ADMIN" -H "Content-Type: application/json" \
  -d "{\"name\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"roles\":[],\"type\":\"user\"}"

# 2. Datenbank erstellen
curl -X PUT "$SERVER/excalinote_$USERNAME" -u "$ADMIN"

# 3. Rechte setzen
curl -X PUT "$SERVER/excalinote_$USERNAME/_security" \
  -u "$ADMIN" -H "Content-Type: application/json" \
  -d "{\"members\":{\"names\":[\"$USERNAME\"],\"roles\":[]}}"

echo "Benutzer $USERNAME eingerichtet!"
```

---

## 5. Backup & Restore

### Datenbank exportieren
```bash
curl http://admin:password@localhost:5984/excalinote_<username>/_all_docs?include_docs=true \
  > backup_<username>.json
```

### Datenbank importieren
```bash
curl -X POST http://admin:password@localhost:5984/excalinote_<username>/_bulk_docs \
  -H "Content-Type: application/json" \
  -d @backup_<username>.json
```

### Docker-Volume sichern
```bash
docker run --rm -v couchdb_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/couchdb_backup_$(date +%Y%m%d).tar.gz /data
```

---

## 6. Monitoring & Wartung

### Server-Status prüfen
```bash
curl http://localhost:5984/
```

### Datenbank-Info
```bash
curl http://admin:password@localhost:5984/excalinote_<username>
```

### Kompaktierung (Speicher freigeben)
```bash
curl -X POST http://admin:password@localhost:5984/excalinote_<username>/_compact \
  -H "Content-Type: application/json"
```

### Alle Datenbanken kompaktieren
```bash
for db in $(curl -s http://admin:password@localhost:5984/_all_dbs | jq -r '.[]'); do
  curl -X POST "http://admin:password@localhost:5984/$db/_compact" \
    -H "Content-Type: application/json"
done
```

---

## 7. CORS für Web-Zugriff

Falls ExcaliNote von einer anderen Domain zugreift:

```bash
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors \
  -d '"true"'

curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins \
  -d '"*"'

curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials \
  -d '"true"'

curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods \
  -d '"GET, PUT, POST, DELETE"'

curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers \
  -d '"accept, authorization, content-type, origin, referer"'
```

---

## 8. Troubleshooting

| Problem | Lösung |
|---------|--------|
| 401 Unauthorized | Benutzername/Passwort prüfen |
| 403 Forbidden | `_security` der Datenbank prüfen |
| CORS-Fehler | CORS-Konfiguration (Abschnitt 7) |
| Sync hängt | Datenbank-Kompaktierung durchführen |
| Speicher voll | Alte Revisionen löschen, kompaktieren |

### Logs prüfen (Docker)
```bash
docker logs couchdb --tail 100
```

### Logs prüfen (System)
```bash
journalctl -u couchdb -f
```

---

## 9. Sicherheitsempfehlungen

1. **Admin-Passwort ändern** - Niemals Standard-Passwörter verwenden
2. **HTTPS verwenden** - Reverse-Proxy (nginx/traefik) davor schalten
3. **Firewall** - Port 5984 nur intern erreichbar machen
4. **Regelmäßige Backups** - Automatisiert per Cron-Job
5. **Updates** - CouchDB regelmäßig aktualisieren

### Beispiel: nginx Reverse-Proxy
```nginx
server {
    listen 443 ssl;
    server_name couchdb.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5984;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
