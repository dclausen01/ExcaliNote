# ExcaliNote 📝✨

Eine moderne OneNote-Alternative mit Excalidraw als Zeichenkern – perfekt für handschriftliche Notizen, Skizzen und Diagramme.

![ExcaliNote Banner](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

- 🎨 **Excalidraw-Integration**: Leistungsstarker Zeicheneditor für Handschrift, Skizzen und Diagramme
- 📁 **Ordnerstruktur**: Organisiere deine Notizen in Ordnern und Unterordnern
- 💾 **Auto-Save**: Automatisches Speichern alle 500ms – nie wieder Arbeit verlieren
- 🖥️ **Desktop-App**: Native Electron-Anwendung für Windows, macOS und Linux
- 🎯 **Lokale Speicherung**: Alle Daten bleiben auf deinem Computer (~/ExcaliNote)
- ⚡ **Schnell & Reaktionsschnell**: Dank React und TypeScript
- 🎨 **Modernes UI**: Mit Tailwind CSS gestaltet

## 🚀 Installation

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn

### Setup

1. Repository klonen:

```bash
git clone https://github.com/dclausen01/ExcaliNote.git
cd ExcaliNote
```

2. Abhängigkeiten installieren:

```bash
npm install
```

3. Entwicklungsserver starten:

```bash
npm run electron:dev
```

## 📦 Build

Produktions-Build erstellen:

```bash
npm run electron:build
```

Die fertigen Installationsdateien findest du im `release/` Ordner.

## 🏗️ Technologie-Stack

- **Frontend**: React 18 + TypeScript
- **Desktop-Framework**: Electron 28
- **Zeicheneditor**: @excalidraw/excalidraw
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build-Tool**: Vite
- **Icons**: Lucide React

## 📁 Projektstruktur

```
ExcaliNote/
├── electron/              # Electron-Hauptprozess
│   ├── main.ts           # Hauptprozess-Logik
│   └── preload.ts        # Preload-Skript für sichere IPC
├── src/
│   ├── components/       # React-Komponenten
│   │   ├── Editor/       # Excalidraw-Editor-Integration
│   │   └── Sidebar/      # Ordnerstruktur und Navigation
│   ├── store/            # Zustand State Management
│   ├── types/            # TypeScript-Typdefinitionen
│   ├── App.tsx           # Haupt-App-Komponente
│   └── main.tsx          # React-Einstiegspunkt
├── dist/                 # Vite Build-Ausgabe
└── dist-electron/        # Electron Build-Ausgabe
```

## 🎯 Verwendung

### Notiz erstellen

1. Klicke auf das **+**-Symbol neben "Notizen"
2. Wähle einen Ordner aus oder erstelle einen neuen
3. Gib einen Namen für die Notiz ein
4. Beginne mit dem Zeichnen!

### Ordner erstellen

1. Klicke auf das **Ordner-Symbol** in der Sidebar
2. Gib einen Namen für den neuen Ordner ein
3. Organisiere deine Notizen nach Themen

### Notizen bearbeiten

- Alle Änderungen werden automatisch gespeichert
- Nutze die Excalidraw-Tools für Freihand-Zeichnungen, Text, Formen und mehr
- Unterstützt Bilder, Pfeile und verschiedene Stiftarten

## 🔧 Entwicklung

### Verfügbare Scripts

```bash
# Entwicklungsserver mit Hot-Reload
npm run electron:dev

# Vite Dev-Server (nur Web)
npm run dev

# TypeScript-Kompilierung + Vite Build
npm run build

# Electron-App bauen
npm run electron:build
```

### Code-Struktur

- **IPC-Handler** in `electron/main.ts` für Dateisystem-Operationen
- **State Management** mit Zustand in `src/store/notebookStore.ts`
- **Komponenten** folgen dem React-Hooks-Pattern
- **TypeScript** für Type-Safety überall

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagungen

- [Excalidraw](https://excalidraw.com/) - Für den großartigen Zeicheneditor
- [Electron](https://www.electronjs.org/) - Für das Desktop-Framework
- [React](https://react.dev/) - Für die UI-Library
- [Tailwind CSS](https://tailwindcss.com/) - Für das Styling-Framework

---

Entwickelt mit ❤️ und TypeScript
