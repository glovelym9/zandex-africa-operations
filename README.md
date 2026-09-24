# ZandEx Africa Operations

Application de gestion d’un bureau de distribution : achats, stock, agents terrain, ventes, trésorerie, inventaires et rapports.

## État actuel

- Noyau de stock traçable, affectations, ventes terrain et ventes directes.
- Dépenses, clôture journalière, inventaires justifiés, commissions, retours et versements.
- Modèle PostgreSQL et contrôle de droits Direction/Gestionnaire.
- Tests automatisés du noyau métier.

## Démarrage

```bash
npm install
npm run dev
```

Pour utiliser PostgreSQL, définir `DATABASE_URL` puis exécuter la migration Prisma avant le déploiement.
