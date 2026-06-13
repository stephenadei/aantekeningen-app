# Local CI/CD Testing

## Overzicht

Voordat je code pusht naar GitHub, kun je dezelfde checks lokaal draaien die GitHub Actions zou draaien. Dit voorkomt dat je broken code pusht.

## Quick Start

```bash
# Run alle CI checks lokaal
./scripts/test-ci-local.sh
```

## Wat wordt getest?

Het script test dezelfde dingen als GitHub Actions:

1. **Node.js versie check** - Verifieert dat je Node.js 20+ gebruikt
2. **Dependencies** - Installeert/update dependencies indien nodig
3. **ESLint** - Code quality checks
4. **TypeScript** - Type checking
5. **Build** - Verifieert dat de app kan builden
6. **Unit tests** - Unit test suite
7. **Integration tests** - Integration test suite
8. **Security tests** - Security test suite
9. **Security audit** - `npm audit` voor vulnerabilities
10. **Performance tests** - Optioneel (geskipt in quick check)
11. **E2E tests** - Optioneel (geskipt, vereist Playwright setup)

## Automatische Pre-Push Hook

Er is een Git pre-push hook geïnstalleerd die automatisch de CI checks draait voordat je pusht:

```bash
# Normale push (draait automatisch checks)
git push

# Push zonder checks (niet aanbevolen)
git push --no-verify
```

## Handmatig Testen

### Alleen linting
```bash
npm run lint
```

### Alleen build
```bash
npm run build
```

### Alleen unit tests
```bash
npm run test:unit
```

### Alle tests (zoals CI)
```bash
npm run test:ci
```

### Volledige CI check (inclusief build)
```bash
./scripts/test-ci-local.sh
```

## Troubleshooting

### Script faalt op TypeScript check
```bash
# Fix type errors
npx tsc --noEmit

# Of skip type check tijdelijk (niet aanbevolen)
# Verwijder de type check stap uit test-ci-local.sh
```

### Script faalt op build
```bash
# Test build handmatig
npm run build

# Check voor errors in de output
```

### Tests falen
```bash
# Run tests individueel om te zien welke faalt
npm run test:unit
npm run test:integration
npm run test:security
```

### Pre-push hook werkt niet
```bash
# Verifieer dat de hook executable is
chmod +x .git/hooks/pre-push

# Test de hook handmatig
.git/hooks/pre-push
```

## CI/CD Workflow

De GitHub Actions workflow draait deze jobs:

1. **test** - Lint, unit, integration, security tests + coverage
2. **e2e** - E2E tests met Playwright
3. **performance** - Performance tests
4. **smoke** - Smoke tests (disabled in CI)
5. **security-scan** - Security audit + security tests
6. **build** - Build check (draait alleen als alle tests passen)
7. **notify** - Notification job

## Best Practices

1. **Run local checks voor elke commit** - Voorkomt dat je broken code commit
2. **Fix errors lokaal** - Los problemen op voordat je pusht
3. **Test build altijd** - Build errors zijn vaak de grootste problemen
4. **Check type errors** - TypeScript errors kunnen runtime bugs veroorzaken

## Skip Checks (Niet Aanbevolen)

Als je echt moet pushen zonder checks:

```bash
# Skip pre-push hook
git push --no-verify

# Maar dit kan CI/CD failures veroorzaken!
```

## Workflow

```
1. Maak wijzigingen
2. Run: ./scripts/test-ci-local.sh
3. Fix eventuele errors
4. Commit: git commit -m "message"
5. Push: git push (draait automatisch checks)
6. Als checks falen, fix en push opnieuw
```


