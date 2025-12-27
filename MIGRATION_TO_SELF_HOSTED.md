# Migratie van Vercel naar Self-Hosted

Deze guide helpt je bij het migreren van de Aantekeningen App van Vercel naar self-hosted deployment.

## Overzicht

**Van:** Vercel (serverless)  
**Naar:** Self-hosted (Docker + nginx)

## Belangrijke Notities

### Database
De app gebruikt **Firebase/Firestore**, niet PostgreSQL. Er is **geen database migratie nodig** - Firebase werkt hetzelfde op Vercel en self-hosted.

### Environment Variables
Alle environment variables blijven hetzelfde, alleen de URLs moeten worden aangepast:
- `NEXTAUTH_URL`: van `https://stephensprive.app` (Vercel) naar `https://stephensprive.app` (self-hosted)
- `GOOGLE_REDIRECT_URI`: moet worden bijgewerkt in Google Cloud Console

## Stap 1: Exporteer Environment Variables van Vercel

1. Ga naar Vercel Dashboard → Je project → Settings → Environment Variables
2. Exporteer alle variabelen naar een bestand (of noteer ze)
3. Belangrijke variabelen om te exporteren:
   - Firebase configuratie
   - Google OAuth credentials
   - NextAuth secret
   - OpenAI API key
   - MinIO configuratie (als gebruikt)

## Stap 2: Maak .env.local Bestand

1. Kopieer `env.example` naar `.env.local`:
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   cp env.example .env.local
   ```

2. Vul alle waarden in vanuit Vercel:
   ```bash
   nano .env.local
   ```

3. **Belangrijk:** Update deze URLs:
   - `NEXTAUTH_URL=https://stephensprive.app`
   - `GOOGLE_REDIRECT_URI=https://stephensprive.app`

## Stap 3: Update Google OAuth Redirect URI

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate naar: APIs & Services → Credentials
3. Open je OAuth 2.0 Client ID
4. Voeg toe aan "Authorized redirect URIs":
   - `https://stephensprive.app/api/auth/callback/google`
5. Verwijder oude Vercel redirect URIs (optioneel, maar aanbevolen)

## Stap 4: Deploy met Docker

1. Zorg dat Docker draait:
   ```bash
   docker info
   ```

2. Run het deployment script:
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   ./deploy-docker.sh
   ```

Het script doet automatisch:
- ✅ Build Docker image
- ✅ Start container
- ✅ Setup nginx configuratie
- ✅ Setup SSL certificaat (Certbot)

## Stap 5: Verifieer Deployment

1. **Check container status:**
   ```bash
   docker ps | grep aantekeningen-app
   ```

2. **Check logs:**
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   docker-compose logs -f
   ```

3. **Test de app:**
   ```bash
   curl -I https://stephensprive.app
   ```

4. **Test health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

## Stap 6: Update DNS (Als Nodig)

Als je domain nog naar Vercel wijst:

1. Ga naar je DNS provider
2. Verwijder CNAME record naar Vercel (als die er is)
3. Voeg A record toe:
   - Name: `stephensprive.app` (of `@`)
   - Type: `A`
   - Value: `144.91.127.229` (je server IP)

4. Verifieer DNS:
   ```bash
   dig stephensprive.app
   ```

## Stap 7: Disable Vercel Deployment (Optioneel)

Als alles werkt op self-hosted:

1. Ga naar Vercel Dashboard → Settings
2. Je kunt het project behouden voor backup
3. Of verwijder het project als je het niet meer nodig hebt

## Troubleshooting

### Container start niet
```bash
# Check logs
docker-compose logs

# Check .env.local
cat .env.local | grep -v "^#" | grep "="
```

### Nginx geeft 502 Bad Gateway
```bash
# Check of container draait
docker ps | grep aantekeningen-app

# Check of app luistert op port 3001
curl http://localhost:3001/health

# Check nginx config
sudo nginx -t
```

### SSL certificaat werkt niet
```bash
# Herhaal SSL setup
sudo certbot --nginx -d stephensprive.app --force-renewal
```

### Firebase errors
- Check of `FIREBASE_PRIVATE_KEY` correct is (moet `\n` characters bevatten)
- Check of `FIREBASE_PROJECT_ID` correct is
- Check Firebase Console voor service account status

## Rollback naar Vercel

Als je terug wilt naar Vercel:

1. Stop Docker container:
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   docker-compose down
   ```

2. Update DNS terug naar Vercel (CNAME record)

3. Deploy opnieuw via Vercel (git push)

## Checklist

- [ ] Environment variables geëxporteerd van Vercel
- [ ] `.env.local` aangemaakt en ingevuld
- [ ] Google OAuth redirect URI bijgewerkt
- [ ] Docker deployment succesvol
- [ ] Nginx configuratie correct
- [ ] SSL certificaat geïnstalleerd
- [ ] DNS bijgewerkt (als nodig)
- [ ] App getest en werkend
- [ ] Vercel deployment disabled (optioneel)

## Hulp

Voor problemen:
- Check logs: `docker-compose logs -f`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check container status: `docker ps`

