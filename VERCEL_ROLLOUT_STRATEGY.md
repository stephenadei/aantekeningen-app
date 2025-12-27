# Vercel Rollout Strategie - Wanneer Verwijderen?

## 🎯 Korte Antwoord

**Nee, verwijder de app NIET direct uit Vercel.** Laat beide versies eerst naast elkaar draaien om te testen.

## 📋 Aanbevolen Aanpak

### Fase 1: Test Self-Hosted (1-2 weken)

**Laat beide versies draaien:**
- ✅ Vercel: `https://aantekeningen-app.vercel.app` (of je custom domain)
- ✅ Self-hosted: `https://stephensprive.app`

**Waarom?**
- Je kunt testen of self-hosted goed werkt
- Als er problemen zijn, kun je terug naar Vercel
- Geen downtime voor gebruikers

### Fase 2: DNS Switch (Na Testen)

**Als self-hosted goed werkt:**

1. **Update DNS** om `stephensprive.app` naar je server te laten wijzen:
   - Verwijder CNAME record naar Vercel (als die er is)
   - Voeg A record toe: `stephensprive.app` → `144.91.127.229`

2. **Test opnieuw** met de nieuwe DNS

3. **Monitor** voor een paar dagen

### Fase 3: Vercel Cleanup (Optioneel)

**Na 1-2 weken succesvolle self-hosted deployment:**

Je hebt 2 opties:

#### Optie A: Vercel Behouden als Backup (Aanbevolen)
- ✅ Laat Vercel deployment staan
- ✅ Gebruik als backup/fallback
- ✅ Geen extra kosten als je binnen gratis tier blijft
- ✅ Handig voor testing nieuwe features

#### Optie B: Vercel Verwijderen
- ❌ Verwijder project uit Vercel Dashboard
- ❌ Bespaar op Vercel kosten (als je betaalt)
- ⚠️ Geen backup meer

## ⚠️ Belangrijke Overwegingen

### DNS Configuratie

**Huidige situatie:**
- Als `stephensprive.app` nog een CNAME naar Vercel heeft, wijst het nog naar Vercel
- Self-hosted draait op `localhost:3001` maar is niet publiek bereikbaar via domain

**Na DNS switch:**
- `stephensprive.app` wijst naar je server
- Self-hosted wordt de actieve versie
- Vercel blijft beschikbaar op `aantekeningen-app.vercel.app` (als je die URL gebruikt)

### Google OAuth Redirect URIs

**Je kunt beide redirect URIs behouden:**
- `https://stephensprive.app/api/auth/callback/google` (self-hosted)
- `https://aantekeningen-app.vercel.app/api/auth/callback/google` (Vercel backup)

Dit geeft je flexibiliteit om tussen beide te switchen.

## 📝 Checklist

### Nu (Test Fase)
- [ ] Self-hosted app deployed en werkend
- [ ] Test self-hosted versie lokaal: `curl http://localhost:3001/health`
- [ ] Test via domain (als DNS al is aangepast)
- [ ] Monitor logs: `docker-compose logs -f`
- [ ] Laat Vercel deployment staan

### Na Testen (1-2 weken)
- [ ] Self-hosted werkt stabiel
- [ ] Update DNS naar self-hosted server
- [ ] Test met nieuwe DNS
- [ ] Monitor voor problemen

### Na Stabiliteit (Optioneel)
- [ ] Besluit: Vercel behouden of verwijderen
- [ ] Als verwijderen: Backup environment variables eerst
- [ ] Verwijder project uit Vercel (als gekozen)

## 🔄 Rollback Plan

**Als self-hosted problemen heeft:**

1. **DNS terugzetten:**
   - Verwijder A record naar server
   - Voeg CNAME terug naar Vercel

2. **Vercel deployment blijft werken:**
   - Geen actie nodig in Vercel
   - App is direct weer beschikbaar

3. **Fix self-hosted problemen:**
   - Check logs
   - Fix issues
   - Test opnieuw

## 💡 Best Practice

**Aanbevolen: Laat Vercel staan als backup**

**Voordelen:**
- ✅ Geen downtime risico
- ✅ Eenvoudig rollback
- ✅ Testomgeving voor nieuwe features
- ✅ Geen extra kosten (gratis tier)

**Nadelen:**
- ⚠️ Mogelijk verwarring over welke versie actief is
- ⚠️ Environment variables moeten in beide systemen worden bijgewerkt (als je beide gebruikt)

## 🎯 Conclusie

**Doe dit NIET nu:**
- ❌ Verwijder project uit Vercel
- ❌ Stop Vercel deployment

**Doe dit WEL:**
- ✅ Test self-hosted eerst
- ✅ Laat beide draaien tijdens test fase
- ✅ Switch DNS pas na succesvolle testen
- ✅ Besluit later of je Vercel wilt behouden

## 📞 Hulp

Als je vragen hebt over de rollout strategie, check:
- `DEPLOYMENT_GUIDE.md` - Voor deployment instructies
- `VERCEL_TO_SELF_HOSTED_MIGRATION.md` - Voor migratie details

