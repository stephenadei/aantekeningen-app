# Admin Login - Aantekeningen App

## 🔐 Inloggen

De aantekeningen-app gebruikt **dezelfde database** als het privelessen-dashboard, dus je kunt inloggen met dezelfde credentials!

### Standaard Login Credentials

Gebaseerd op het privelessen-dashboard seed bestand:

**Email:** `admin@stephensprivelessen.nl`  
**Password:** `admin123` (tijdelijk - verander na eerste login!)

Of:

**Email:** `tutor@stephensprivelessen.nl`  
**Password:** `admin123` (tijdelijk - verander na eerste login!)

### Stappen om in te loggen:

1. **Start de development server:**
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   npm run dev
   ```

2. **Ga naar de admin login pagina:**
   ```
   http://localhost:3000/admin/login
   ```

3. **Voer je credentials in:**
   - Email: `admin@stephensprivelessen.nl`
   - Password: `admin123`

4. **Klik op "Inloggen"**

### ⚠️ Belangrijk

- De password check werkt momenteel met een tijdelijke fallback (`admin123`)
- Als je een user hebt met een bcrypt hash in de database, wordt die gebruikt
- Als er geen hash is, wordt de tijdelijke password check gebruikt
- **Verander je password na eerste login!**

### Database Check

Als je wilt checken welke users er zijn:

```bash
cd /home/stephen/projects/aantekeningen-app
npx prisma studio
```

Of via SQL:
```sql
SELECT email, name, role, password IS NOT NULL as has_password 
FROM users;
```

### Nieuwe User Aanmaken (optioneel)

Als je een nieuwe user wilt aanmaken specifiek voor de aantekeningen-app:

```bash
cd /home/stephen/projects/aantekeningen-app
node scripts/create-admin-user.mjs your-email@example.com your-password "Your Name"
```

Maar dit is **niet nodig** als je al users hebt in het privelessen-dashboard!



## 🔐 Inloggen

De aantekeningen-app gebruikt **dezelfde database** als het privelessen-dashboard, dus je kunt inloggen met dezelfde credentials!

### Standaard Login Credentials

Gebaseerd op het privelessen-dashboard seed bestand:

**Email:** `admin@stephensprivelessen.nl`  
**Password:** `admin123` (tijdelijk - verander na eerste login!)

Of:

**Email:** `tutor@stephensprivelessen.nl`  
**Password:** `admin123` (tijdelijk - verander na eerste login!)

### Stappen om in te loggen:

1. **Start de development server:**
   ```bash
   cd /home/stephen/projects/aantekeningen-app
   npm run dev
   ```

2. **Ga naar de admin login pagina:**
   ```
   http://localhost:3000/admin/login
   ```

3. **Voer je credentials in:**
   - Email: `admin@stephensprivelessen.nl`
   - Password: `admin123`

4. **Klik op "Inloggen"**

### ⚠️ Belangrijk

- De password check werkt momenteel met een tijdelijke fallback (`admin123`)
- Als je een user hebt met een bcrypt hash in de database, wordt die gebruikt
- Als er geen hash is, wordt de tijdelijke password check gebruikt
- **Verander je password na eerste login!**

### Database Check

Als je wilt checken welke users er zijn:

```bash
cd /home/stephen/projects/aantekeningen-app
npx prisma studio
```

Of via SQL:
```sql
SELECT email, name, role, password IS NOT NULL as has_password 
FROM users;
```

### Nieuwe User Aanmaken (optioneel)

Als je een nieuwe user wilt aanmaken specifiek voor de aantekeningen-app:

```bash
cd /home/stephen/projects/aantekeningen-app
node scripts/create-admin-user.mjs your-email@example.com your-password "Your Name"
```

Maar dit is **niet nodig** als je al users hebt in het privelessen-dashboard!

