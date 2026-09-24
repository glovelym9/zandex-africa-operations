# ZandEx Africa Operations

Application métier pour le circuit : **achats → stock → agents → ventes → encaissements → dépenses → clôture → rapports**.

## Démarrage

1. Copier `.env.example` vers `.env` et définir une base PostgreSQL.
2. Installer les dépendances : `npm install`.
3. Générer et appliquer le schéma : `npx prisma generate` puis `npx prisma migrate dev`.
4. Démarrer : `npm run dev`.

## Rôles

- **Direction** : contrôle global, achats, référentiels et utilisateurs.
- **Gestionnaire** : opérations quotidiennes, agents, ventes, dépenses, inventaires et rapports.

Les opérations critiques doivent être validées côté serveur et inscrites au journal d’audit.
