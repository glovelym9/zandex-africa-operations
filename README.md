# ZandEx Africa Operations

Application de gestion d’un bureau de distribution : achats, stock, agents terrain, ventes, trésorerie, inventaires et rapports.

## État actuel

- Prototype d'interface encore alimenté par le stockage local du navigateur : **ne pas utiliser en production**.
- Noyau serveur transactionnel pour achats, transferts, ventes multi-produits et dépenses, avec tests automatisés.
- Modèle PostgreSQL et premiers endpoints de connexion/session Direction/Gestionnaire.
- Les formulaires ne sont pas encore raccordés au serveur et la base partagée n'est pas provisionnée.

## Démarrage

```bash
npm install
npm run dev
```

Pour préparer PostgreSQL, définir `DATABASE_URL`, exécuter `npm run db:generate` puis `npm run db:push`. Le premier compte Direction se crée une seule fois avec `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12 caractères minimum) et, facultativement, `ADMIN_NAME`, via `npm run db:bootstrap`. Ne jamais enregistrer ces secrets dans Git.
