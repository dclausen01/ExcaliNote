# ExcaliNote Sync Server

Server-Komponente für die Synchronisation von ExcaliNote-Notizen.
Basiert auf CouchDB für Offline-First-Synchronisation.

## Voraussetzungen

- Docker & Docker Compose
- Nginx (als Reverse Proxy)
- SSL-Zertifikat (empfohlen: Let's Encrypt)

### Plesk-Server

Falls du Plesk verwendest:
1. Installiere die "Docker" Extension über Plesk Extensions
2. SSH-Zugang zum Server

## Schnellstart

### 1. Konfiguration

```bash
# In das Server-Verzeichnis wechseln
cd server

# Konfigurationsdatei erstellen
cp .env.example .env

# .env bearbeiten und sichere Passwörter setzen
nano .env
```

**Wichtig:** Ändere unbedingt `COUCHDB_ADMIN_PASSWORD`!

### 2. Server starten

```bash
# Container starten
docker-compose up -d

# Setup ausführen
chmod +x scripts/*.sh
./scripts/setup.sh
```

### 3. Nginx konfigurieren

Für Plesk:
1. Erstelle eine Subdomain (z.B. `sync.deinedomain.de`)
2. Gehe zu "Hosting & DNS" → "Apache & nginx Settings"
3. Füge den Inhalt von `nginx/excalinote-sync.conf` unter
   "Additional nginx directives" ein
4. Aktiviere SSL über Let's Encrypt

Alternativ: Kopiere `nginx/excalinote-sync.conf` nach `/etc/nginx/conf.d/`

### 4. Benutzer erstellen

```bash
# Einzelnen Benutzer erstellen
./scripts/manage-user.sh create max.mustermann geheim123

# Class Notebook erstellen (für Schulklassen)
./scripts/manage-user.sh create-class mathe10b lehrer.schmidt
./scripts/manage-user.sh add-student mathe10b max.mustermann
```

## Benutzerverwaltung

```bash
# Hilfe anzeigen
./scripts/manage-user.sh

# Benutzer auflisten
./scripts/manage-user.sh list

# Benutzer erstellen (Rollen: student, teacher, admin)
./scripts/manage-user.sh create <username> <password> [role]

# Benutzer löschen
./scripts/manage-user.sh delete <username>
```

## Class Notebooks (Schulklassen)

Class Notebooks ermöglichen die Zusammenarbeit zwischen Lehrern und Schülern:

| Ordner | Lehrer | Schüler |
|--------|--------|---------|
| Unterrichtsmaterial | Vollzugriff | Nur Lesen |
| Vorbereitung | Vollzugriff | Kein Zugriff |
| Zusammenarbeit | Vollzugriff | Vollzugriff |
| Schüler-Ordner | Vollzugriff | Nur eigener Ordner |

```bash
# Klasse erstellen
./scripts/manage-user.sh create-class <klassen-id> <lehrer-username>

# Schüler hinzufügen
./scripts/manage-user.sh add-student <klassen-id> <schüler-username>

# Schüler entfernen
./scripts/manage-user.sh remove-student <klassen-id> <schüler-username>
```

## Backup & Wiederherstellung

Backups werden automatisch erstellt (Standard: täglich um 02:00 Uhr).

```bash
# Backup-Verzeichnis
ls -la backups/

# Manuelles Backup
docker exec excalinote-backup /backup.sh

# Wiederherstellung
docker-compose down
tar -xzf backups/excalinote_backup_YYYYMMDD_HHMMSS.tar.gz -C /var/lib/docker/volumes/
docker-compose up -d
```

## Wartung

### Logs anzeigen

```bash
# CouchDB Logs
docker logs excalinote-couchdb

# Alle Container
docker-compose logs -f
```

### Neustart

```bash
docker-compose restart
```

### Update

```bash
docker-compose pull
docker-compose up -d
```

## Fehlerbehebung

### CouchDB nicht erreichbar

1. Container-Status prüfen: `docker-compose ps`
2. Logs prüfen: `docker logs excalinote-couchdb`
3. Port-Bindung prüfen: `ss -tlnp | grep 5984`

### Sync funktioniert nicht

1. CORS-Einstellungen in `couchdb/local.ini` prüfen
2. SSL-Zertifikat gültig?
3. Nginx-Konfiguration prüfen

### Performance-Probleme

1. CouchDB Indizes prüfen (Fauxton UI: `http://localhost:5984/_utils`)
2. Kompaktierung durchführen:
   ```bash
   curl -X POST http://admin:password@localhost:5984/excalinote_dbname/_compact
   ```

## Sicherheit

- Ändere das Admin-Passwort!
- Verwende HTTPS (SSL)
- Beschränke den Zugriff auf die Fauxton-UI
- Regelmäßige Backups
- Halte Docker und CouchDB aktuell

## Client-Konfiguration

In ExcaliNote:
1. Klicke auf das Cloud-Symbol in der TopBar
2. Gib die Server-URL ein: `https://sync.deinedomain.de`
3. Benutzername und Passwort eingeben
4. "Verbinden" klicken

## Support

Bei Problemen:
- GitHub Issues: https://github.com/dclausen01/ExcaliNote/issues
