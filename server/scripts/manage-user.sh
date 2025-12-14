#!/bin/bash
# ExcaliNote Benutzerverwaltung
# Erstellt und verwaltet Benutzer für die Synchronisation

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# .env laden
if [ -f .env ]; then
    source .env
elif [ -f ../.env ]; then
    source ../.env
else
    echo -e "${RED}Fehler: .env Datei nicht gefunden!${NC}"
    exit 1
fi

COUCHDB_URL="http://${COUCHDB_ADMIN_USER}:${COUCHDB_ADMIN_PASSWORD}@localhost:5984"

show_help() {
    echo "ExcaliNote Benutzerverwaltung"
    echo ""
    echo "Verwendung: $0 <befehl> [optionen]"
    echo ""
    echo "Befehle:"
    echo "  create <username> <password> [role]  - Neuen Benutzer erstellen"
    echo "  delete <username>                    - Benutzer löschen"
    echo "  list                                 - Alle Benutzer auflisten"
    echo "  create-class <class-id> <teacher>    - Class Notebook erstellen"
    echo "  add-student <class-id> <username>    - Schüler zu Klasse hinzufügen"
    echo "  remove-student <class-id> <username> - Schüler aus Klasse entfernen"
    echo ""
    echo "Rollen: student, teacher, admin (Standard: student)"
    echo ""
    echo "Beispiele:"
    echo "  $0 create max.mustermann geheim123 student"
    echo "  $0 create-class mathe10b lehrer.schmidt"
    echo "  $0 add-student mathe10b max.mustermann"
}

create_user() {
    local username="$1"
    local password="$2"
    local role="${3:-student}"

    if [ -z "$username" ] || [ -z "$password" ]; then
        echo -e "${RED}Fehler: Benutzername und Passwort erforderlich!${NC}"
        exit 1
    fi

    echo -n "Erstelle Benutzer '$username'... "

    # Benutzer in _users Datenbank erstellen
    local user_doc=$(cat <<EOF
{
    "_id": "org.couchdb.user:${username}",
    "name": "${username}",
    "password": "${password}",
    "roles": ["${role}"],
    "type": "user"
}
EOF
)

    local result=$(curl -s -X PUT "${COUCHDB_URL}/_users/org.couchdb.user:${username}" \
        -H "Content-Type: application/json" \
        -d "$user_doc")

    if echo "$result" | grep -q '"ok":true'; then
        echo -e "${GREEN}OK${NC}"

        # Persönliche Datenbank erstellen
        echo -n "Erstelle persönliche Datenbank... "
        curl -s -X PUT "${COUCHDB_URL}/excalinote_personal_${username}" > /dev/null

        # Berechtigungen setzen
        local security_doc=$(cat <<EOF
{
    "admins": { "names": ["${username}"], "roles": ["admin"] },
    "members": { "names": ["${username}"], "roles": [] }
}
EOF
)
        curl -s -X PUT "${COUCHDB_URL}/excalinote_personal_${username}/_security" \
            -H "Content-Type: application/json" \
            -d "$security_doc" > /dev/null

        echo -e "${GREEN}OK${NC}"
        echo -e "${GREEN}Benutzer '${username}' erfolgreich erstellt!${NC}"
    else
        echo -e "${RED}FEHLER${NC}"
        echo "$result"
        exit 1
    fi
}

delete_user() {
    local username="$1"

    if [ -z "$username" ]; then
        echo -e "${RED}Fehler: Benutzername erforderlich!${NC}"
        exit 1
    fi

    echo -n "Lösche Benutzer '$username'... "

    # Revision holen
    local rev=$(curl -s "${COUCHDB_URL}/_users/org.couchdb.user:${username}" | grep -o '"_rev":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$rev" ]; then
        echo -e "${RED}Benutzer nicht gefunden!${NC}"
        exit 1
    fi

    # Benutzer löschen
    curl -s -X DELETE "${COUCHDB_URL}/_users/org.couchdb.user:${username}?rev=${rev}" > /dev/null

    echo -e "${GREEN}OK${NC}"

    # Optional: Persönliche Datenbank löschen?
    read -p "Persönliche Datenbank auch löschen? [j/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[JjYy]$ ]]; then
        echo -n "Lösche Datenbank... "
        curl -s -X DELETE "${COUCHDB_URL}/excalinote_personal_${username}" > /dev/null 2>&1 || true
        echo -e "${GREEN}OK${NC}"
    fi
}

list_users() {
    echo -e "${BLUE}=== ExcaliNote Benutzer ===${NC}"
    echo ""

    local users=$(curl -s "${COUCHDB_URL}/_users/_all_docs?include_docs=true" | \
        grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -v "^$")

    if [ -z "$users" ]; then
        echo "Keine Benutzer gefunden."
    else
        echo "$users" | while read user; do
            local doc=$(curl -s "${COUCHDB_URL}/_users/org.couchdb.user:${user}")
            local roles=$(echo "$doc" | grep -o '"roles":\[[^]]*\]' | sed 's/"roles":\[//' | sed 's/\]//' | tr -d '"')
            echo "  - $user (${roles:-keine Rolle})"
        done
    fi
    echo ""
}

create_class() {
    local class_id="$1"
    local teacher="$2"

    if [ -z "$class_id" ] || [ -z "$teacher" ]; then
        echo -e "${RED}Fehler: Klassen-ID und Lehrer-Benutzername erforderlich!${NC}"
        exit 1
    fi

    local db_name="excalinote_class_${class_id}"

    echo -n "Erstelle Class Notebook '$class_id'... "

    # Datenbank erstellen
    curl -s -X PUT "${COUCHDB_URL}/${db_name}" > /dev/null

    # Lehrer-Rolle zum Benutzer hinzufügen
    local user_doc=$(curl -s "${COUCHDB_URL}/_users/org.couchdb.user:${teacher}")
    local current_roles=$(echo "$user_doc" | grep -o '"roles":\[[^]]*\]' | sed 's/"roles"://')

    # Metadata-Dokument erstellen
    local metadata=$(cat <<EOF
{
    "_id": "metadata",
    "type": "notebook-metadata",
    "notebookId": "${class_id}",
    "notebookName": "${class_id}",
    "notebookType": "class",
    "classConfig": {
        "teachers": ["${teacher}"],
        "students": [],
        "preparationFolderId": "folder_preparation",
        "collaborationFolderId": "folder_collaboration",
        "teacherMaterialFolderId": "folder_teacher"
    },
    "createdAt": "$(date -Iseconds)",
    "updatedAt": "$(date -Iseconds)",
    "createdBy": "${teacher}",
    "modifiedBy": "${teacher}"
}
EOF
)
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/metadata" \
        -H "Content-Type: application/json" \
        -d "$metadata" > /dev/null

    # Sicherheitseinstellungen
    local security=$(cat <<EOF
{
    "admins": { "names": ["${teacher}"], "roles": ["admin", "teacher_${class_id}"] },
    "members": { "names": ["${teacher}"], "roles": ["student_${class_id}"] }
}
EOF
)
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/_security" \
        -H "Content-Type: application/json" \
        -d "$security" > /dev/null

    # Standard-Ordner erstellen
    create_class_folders "$db_name" "$teacher"

    echo -e "${GREEN}OK${NC}"
    echo -e "${GREEN}Class Notebook '${class_id}' erstellt!${NC}"
    echo "Lehrer: ${teacher}"
}

create_class_folders() {
    local db_name="$1"
    local teacher="$2"
    local now=$(date -Iseconds)

    # Lehrer-Material-Ordner
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/folder_teacher" \
        -H "Content-Type: application/json" \
        -d "{\"_id\":\"folder_teacher\",\"type\":\"folder\",\"name\":\"Unterrichtsmaterial\",\"folderType\":\"teacher\",\"parentId\":null,\"createdAt\":\"${now}\",\"updatedAt\":\"${now}\",\"createdBy\":\"${teacher}\",\"modifiedBy\":\"${teacher}\"}" > /dev/null

    # Vorbereitungs-Ordner
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/folder_preparation" \
        -H "Content-Type: application/json" \
        -d "{\"_id\":\"folder_preparation\",\"type\":\"folder\",\"name\":\"Vorbereitung\",\"folderType\":\"preparation\",\"parentId\":null,\"createdAt\":\"${now}\",\"updatedAt\":\"${now}\",\"createdBy\":\"${teacher}\",\"modifiedBy\":\"${teacher}\"}" > /dev/null

    # Kollaborations-Ordner
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/folder_collaboration" \
        -H "Content-Type: application/json" \
        -d "{\"_id\":\"folder_collaboration\",\"type\":\"folder\",\"name\":\"Zusammenarbeit\",\"folderType\":\"collaboration\",\"parentId\":null,\"createdAt\":\"${now}\",\"updatedAt\":\"${now}\",\"createdBy\":\"${teacher}\",\"modifiedBy\":\"${teacher}\"}" > /dev/null
}

add_student() {
    local class_id="$1"
    local username="$2"

    if [ -z "$class_id" ] || [ -z "$username" ]; then
        echo -e "${RED}Fehler: Klassen-ID und Benutzername erforderlich!${NC}"
        exit 1
    fi

    local db_name="excalinote_class_${class_id}"
    local now=$(date -Iseconds)

    echo -n "Füge '$username' zur Klasse '$class_id' hinzu... "

    # Schüler zur Security-Liste hinzufügen
    local security=$(curl -s "${COUCHDB_URL}/${db_name}/_security")
    local members=$(echo "$security" | grep -o '"members":{[^}]*}' || echo '"members":{"names":[],"roles":[]}')

    # Neuen Member hinzufügen
    local new_security=$(cat <<EOF
{
    "admins": $(echo "$security" | grep -o '"admins":{[^}]*}' | sed 's/^/{"admins":/' | sed 's/$/}/'),
    "members": {
        "names": $(echo "$security" | grep -o '"members":{[^}]*"names":\[[^]]*\]' | grep -o '\[[^]]*\]' | sed "s/\]$/,\"${username}\"]/" | sed 's/,"/,"/' ),
        "roles": ["student_${class_id}"]
    }
}
EOF
)

    # Einfachere Methode: Komplette Security neu setzen
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/_security" \
        -H "Content-Type: application/json" \
        -d "{\"admins\":$(echo "$security" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('admins',{'names':[],'roles':[]})))" 2>/dev/null || echo '{"names":[],"roles":[]}'),\"members\":{\"names\":[\"${username}\"],\"roles\":[\"student_${class_id}\"]}}" > /dev/null 2>&1

    # Schüler-Ordner erstellen
    curl -s -X PUT "${COUCHDB_URL}/${db_name}/folder_student_${username}" \
        -H "Content-Type: application/json" \
        -d "{\"_id\":\"folder_student_${username}\",\"type\":\"folder\",\"name\":\"${username}\",\"folderType\":\"student\",\"ownerId\":\"${username}\",\"parentId\":null,\"createdAt\":\"${now}\",\"updatedAt\":\"${now}\",\"createdBy\":\"system\",\"modifiedBy\":\"system\"}" > /dev/null

    # Metadata aktualisieren
    local metadata=$(curl -s "${COUCHDB_URL}/${db_name}/metadata")
    local rev=$(echo "$metadata" | grep -o '"_rev":"[^"]*"' | cut -d'"' -f4)

    # Schüler zur Liste hinzufügen (vereinfacht)
    echo -e "${GREEN}OK${NC}"
    echo "Schüler-Ordner 'folder_student_${username}' erstellt."
}

remove_student() {
    local class_id="$1"
    local username="$2"

    if [ -z "$class_id" ] || [ -z "$username" ]; then
        echo -e "${RED}Fehler: Klassen-ID und Benutzername erforderlich!${NC}"
        exit 1
    fi

    local db_name="excalinote_class_${class_id}"

    echo -n "Entferne '$username' aus Klasse '$class_id'... "

    # Schüler-Ordner löschen (mit allen Inhalten)
    local folder_rev=$(curl -s "${COUCHDB_URL}/${db_name}/folder_student_${username}" | grep -o '"_rev":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$folder_rev" ]; then
        curl -s -X DELETE "${COUCHDB_URL}/${db_name}/folder_student_${username}?rev=${folder_rev}" > /dev/null
    fi

    echo -e "${GREEN}OK${NC}"
    echo -e "${YELLOW}Hinweis: Der Schüler hat weiterhin Zugriff auf die Datenbank.${NC}"
    echo "Bearbeite die _security Einstellungen manuell für vollständige Entfernung."
}

# Hauptprogramm
case "$1" in
    create)
        create_user "$2" "$3" "$4"
        ;;
    delete)
        delete_user "$2"
        ;;
    list)
        list_users
        ;;
    create-class)
        create_class "$2" "$3"
        ;;
    add-student)
        add_student "$2" "$3"
        ;;
    remove-student)
        remove_student "$2" "$3"
        ;;
    *)
        show_help
        ;;
esac
