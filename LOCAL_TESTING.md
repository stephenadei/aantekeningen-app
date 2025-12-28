# Local Testing Before Push

Om te voorkomen dat errors pas in CI/CD worden opgevangen, kun je lokaal dezelfde checks draaien voordat je pusht.

## Snelle Pre-Push Check

Voer deze command uit voordat je `git push` doet:

```bash
npm run test:pre-push
```

Dit draait:
- ESLint checks
- Unit tests
- Integration tests  
- Security tests

## Volledige CI/CD Pipeline Test

Voor een volledige check (zoals GitHub Actions):

```bash
./scripts/test-ci-local.sh
```

Of:

```bash
npm run test:ci
```

## Waarom dit belangrijk is

1. **Snellere feedback**: Je ziet errors direct, niet pas na push
2. **Minder CI/CD runs**: Bespaart tijd en resources
3. **Betere code quality**: Fix errors voordat ze in de main branch komen

## Pre-Push Hook (Optioneel)

Je kunt ook een git pre-push hook instellen die automatisch tests draait:

```bash
# Maak een pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
npm run test:pre-push
EOF

chmod +x .git/hooks/pre-push
```

**Let op**: Dit kan pushen vertragen. Je kunt altijd `git push --no-verify` gebruiken om de hook te omzeilen (niet aanbevolen).

## Troubleshooting

### Tests falen lokaal maar werken in CI

- Check of je dezelfde Node.js versie gebruikt
- Check of alle dependencies geïnstalleerd zijn: `npm install`
- Check of environment variables correct zijn ingesteld

### Tests werken lokaal maar falen in CI

- Check of je alle bestanden hebt gecommit
- Check of je dezelfde test command gebruikt
- Check CI logs voor specifieke errors


