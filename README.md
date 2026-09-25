# ZandEx Africa Operations

Application de gestion d’un bureau de distribution : achats, stock, agents terrain, ventes, trésorerie, inventaires et rapports.

## État actuel

- Interface reliée à l’API protégée : référentiels, achats multi-produits, transferts, rapports de vente multi-produits, dépenses, versements, inventaires et clôtures.
- Noyau serveur transactionnel pour stock et ventes, avec tests automatisés.
- Modèle PostgreSQL, migration initiale, connexion/session Direction/Gestionnaire.
- **Pas encore en production** : la base partagée n'est pas provisionnée et les parcours doivent être testés contre cette base avant ouverture aux équipes.

## Démarrage

```bash
npm install
npm run dev
```

Pour préparer PostgreSQL, définir `DATABASE_URL`, exécuter `npm run db:generate` puis `npm run db:migrate`. Le premier compte Direction se crée une seule fois avec `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12 caractères minimum) et, facultativement, `ADMIN_NAME`, via `npm run db:bootstrap`. Ne jamais enregistrer ces secrets dans Git.
