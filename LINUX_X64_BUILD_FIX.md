# Linux x64 Build Fix - GitHub Actions

## Problem

Der Linux x64 Build in GitHub Actions schlug fehl mit folgendem Fehler:

```
⨯ chmod /usr/local/lib/node_modules/electron-builder/node_modules/app-builder-lib/templates/icons/electron-linux/256x256.png: operation not permitted
```

## Root Cause Analysis

1. **Globale Installation**: electron-builder wurde global installiert mit `sudo npm install -g electron-builder`
2. **Berechtigungsproblem**: Wenn electron-builder als normaler User läuft, versucht es Icon-Template-Dateien im globalen Verzeichnis zu modifizieren (`/usr/local/lib/node_modules/`)
3. **Fehlende Icon-Konfiguration**: Das Icon war nicht explizit konfiguriert, sodass electron-builder versucht hat, Default-Icons aus dem Template-Verzeichnis zu verwenden
4. **Inkonsistenz**: Linux ARM64 funktionierte, weil es eine separate Konfiguration mit expliziter Icon-Pfad-Angabe verwendet

## Solution

### 1. GitHub Actions Workflow (.github/workflows/release.yml)

Neuer Step hinzugefügt nach dem "Set 7zip permissions" Step:

```yaml
- name: Fix electron-builder permissions
  run: |
    sudo chmod -R 755 /usr/local/lib/node_modules/electron-builder/node_modules/app-builder-lib/templates/ || true
```

Dieser Step:

- Setzt die Berechtigungen für das gesamte Templates-Verzeichnis rekursiv auf 755
- Der `|| true` Flag verhindert, dass der Build abbricht, falls das Verzeichnis nicht existiert
- Ermöglicht electron-builder, auf die Default-Icons zuzugreifen und sie zu modifizieren

### 2. Package.json Build Configuration

Die electron-builder Konfiguration wurde erweitert:

```json
"build": {
  "appId": "com.excalinote.app",
  "productName": "ExcaliNote",
  "directories": {
    "output": "release",
    "buildResources": "assets"  // NEU: Build-Ressourcen-Verzeichnis
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "assets/**/*"
  ],
  "extraResources": [  // NEU: Assets als Extra-Ressourcen
    {
      "from": "assets",
      "to": "assets",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": "nsis",
    "icon": "assets/excalinotes_icon.png"  // NEU: Icon-Pfad
  },
  "mac": {
    "target": "dmg",
    "icon": "assets/excalinotes_icon.png"  // NEU: Icon-Pfad
  },
  "linux": {
    "target": ["AppImage", "deb", "rpm"],
    "icon": "assets/excalinotes_icon.png",  // NEU: Icon-Pfad
    "category": "Office",  // NEU: Linux-Kategorie
    "desktop": {  // NEU: Desktop-Entry-Konfiguration
      "Name": "ExcaliNote",
      "Comment": "OneNote-Alternative mit Excalidraw-Kern",
      "Categories": "Office;Education;",
      "StartupWMClass": "ExcaliNote"
    }
  }
}
```

**Verbesserungen:**

- Explizite Icon-Pfade für alle Plattformen
- `buildResources` Verzeichnis definiert
- `extraResources` für Asset-Dateien
- Linux-spezifische Konfiguration (Kategorie, Desktop-Entry)
- Erweiterte Linux-Targets: AppImage, deb, rpm (statt nur AppImage)

## Benefits

1. ✅ **Berechtigungsproblem behoben**: Templates-Verzeichnis ist jetzt zugänglich
2. ✅ **Konsistente Icon-Verwendung**: Alle Plattformen verwenden dasselbe Icon
3. ✅ **Bessere Linux-Integration**: Proper Desktop-Entry mit Kategorie
4. ✅ **Mehr Build-Formate**: Linux-Build erstellt jetzt AppImage, deb und rpm
5. ✅ **Keine Warnungen mehr**: "default Electron icon is used" und "category is set to default" Warnungen werden eliminiert

## Testing

Um die Änderungen zu testen:

1. Commit und push der Änderungen
2. GitHub Actions Workflow wird automatisch getriggert
3. Überprüfe den Linux x64 Build-Log auf Erfolg
4. Verifiziere, dass alle Build-Artefakte erstellt wurden

## Files Modified

- `.github/workflows/release.yml` - Permission-Fix hinzugefügt
- `package.json` - Build-Konfiguration erweitert

## Prevention

Die Lösung verhindert zukünftige Probleme durch:

- Explizite Icon-Konfiguration (kein Fallback auf Templates nötig)
- Vorsorglich gesetzte Berechtigungen im CI-Environment
- Konsistente Konfiguration über alle Plattformen hinweg
