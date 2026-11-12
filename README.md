# LAWMA 360 Crew App (Rugged Field Scanner)

Rugged crew field operations application for Lagos Waste Management Authority (LAWMA 360). Built with React 19, TanStack Start, Vite, and Tailwind CSS; deployed to Vercel via Nitro.

Features an industrial handheld UI for field collection crews: zero-touch barcode scanning, offline-first sync queue, arrears check & supervisor override, stamped collection proof capture, and fleet monitoring dashboard.

## Development

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm run build
```

## Deployment

Configured for Vercel deployment with Nitro:
```sh
NITRO_PRESET=vercel npm run build
```

## Built with

- TanStack Start & React 19
- Vite & Nitro
- Tailwind CSS
- Lucide React & Radix UI
- [Lovable](https://lovable.dev)

## Engineering & Product Documentation

Complete technical specifications, field research, street political economy, and stakeholder defense playbooks are available in [`docs/`](docs/):

- **[Product Requirements Document (PRD)](docs/PRD.md)**: Zero-touch barcode scanning, supervisor override, biohazard reject, offline sync queue, and Solous II turnaround.
- **[UX & Field Research](docs/research.md)**: Edge connectivity analysis (2G/3G fallbacks), driver fatigue, and field ergonomics.
- **[Stakeholder Critiques & Concerns](docs/stakeholder-critiques-and-concerns.md)**: 35+ questions across 10 key Lagos stakeholders.
- **[Stakeholder Defense Master Playbook](docs/stakeholder-defense-answers.md)**: Executive defense scripts answering all critiques.
- **[Political Economy of the Streets](docs/political-economy-of-the-streets.md)**: Agbero toll-points, Wole-Wole inspectors, Baba Oja cartels, and diesel volatility.
- **[Cross-System Ecosystem Specs](docs/ecosystem-specs/)**: PRDs and data contracts for Workspace, Partner, and Resident apps.
