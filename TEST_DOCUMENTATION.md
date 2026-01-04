# API Tests Documentation

Ovaj dokument opisuje sve dostupne testove za Helpdesk API.

## Testovi

### Unit Tests - Tickets Controller

Lokacija: `src/tickets/tickets.controller.spec.ts`

Testovi pokrivaju sve Tickets API endpointe sa mock servisima.

**Pokrenite testove sa:**
```bash
npm test -- tickets.controller
```

#### Pokriveni Testovi (22 test-a):

1. **POST /tickets - Create Ticket**
   - ✓ Kreiranje nove tiket-a
   - ✓ Pozivanje `ticketsService.create`

2. **GET /tickets - Get All Tickets**
   - ✓ Vraćanje niza tiket-a
   - ✓ Vraćanje praznog niza ako nema tiket-a

3. **GET /tickets/:id - Get Single Ticket**
   - ✓ Vraćanje tiket-a po ID-u
   - ✓ Prosleđivanje ispravnog ID-a servisu

4. **GET /tickets/:id/sla-status - Get SLA Status**
   - ✓ Vraćanje SLA statusa
   - ✓ Rukovanje ispravnim ticket ID-om

5. **PUT /tickets/:id - Update Ticket**
   - ✓ Ažuriranje tiket-a
   - ✓ Prosleđivanje ispravnih parametara servisu

6. **PUT /tickets/:id/close - Close Ticket**
   - ✓ Zatvaranje tiket-a
   - ✓ Pozivanje `resolveSLA` i `updateStatus`

7. **PUT /tickets/:id/assign/:userId - Assign Ticket**
   - ✓ Dodeljeivanje tiket-a korisniku
   - ✓ Konverzija string ID-eva u brojeve

8. **DELETE /tickets/:id - Delete Ticket**
   - ✓ Brisanje tiket-a
   - ✓ Prosleđivanje ispravnog ID-a servisu

9. **GET /tickets/sla/breached - Get Breached Tickets**
   - ✓ Vraćanje tiket-a sa SLA prekršajima
   - ✓ Vraćanje praznog niza ako nema prekršaja

10. **POST /tickets/sla/monitor - Monitor SLA Breaches**
    - ✓ Pokretanje SLA monitoringa
    - ✓ Vraćanje poruke o uspehu

11. **Integration Scenarios**
    - ✓ Kompletan životni ciklus tiket-a (kreiranje → dodela → zatvaranje)
    - ✓ Ažuriranje i proveravanje SLA-a

### E2E Tests

Lokacija: `test/tickets.e2e-spec.ts`

Ovi testovi zahtevaju aktivnu bazu podataka i pokrivaju sve API endpointe kroz HTTP zahteve.

**Napomena:** Za pokretanje E2E testova trebate:
1. Aktivna PostgreSQL baza podataka
2. Migracije izvršene (`npx prisma migrate deploy`)
3. Test data kreirani u bazi

**Pokrenite E2E testove sa:**
```bash
npm run test:e2e
```

## API Endpointi

### 1. Kreiranje Tiket-a
```http
POST /tickets
Content-Type: application/json

{
  "title": "Bug Report",
  "description": "Application crashes on startup",
  "priority": "high",
  "statusId": 1,
  "queueId": 1,
  "createdById": 1,
  "assignedToId": 1,
  "dueAt": "2026-01-05T10:00:00Z"
}
```

**Odgovor (201 Created):**
```json
{
  "id": 1,
  "title": "Bug Report",
  "description": "Application crashes on startup",
  "priority": "high",
  "statusId": 1,
  "queueId": 1,
  "createdById": 1,
  "assignedToId": 1,
  "createdAt": "2026-01-04T10:00:00Z",
  "updatedAt": "2026-01-04T10:00:00Z",
  "dueAt": "2026-01-05T10:00:00Z",
  "slaBreached": false,
  "slaNotified": false
}
```

### 2. Preuzimanje Svih Tiket-a
```http
GET /tickets
```

**Odgovor (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Bug Report",
    "priority": "high",
    ...
  }
]
```

### 3. Preuzimanje Tiket-a po ID-u
```http
GET /tickets/:id
```

**Odgovor (200 OK):**
```json
{
  "id": 1,
  "title": "Bug Report",
  ...
}
```

### 4. Preuzimanje SLA Statusa
```http
GET /tickets/:id/sla-status
```

**Odgovor (200 OK):**
```json
{
  "ticketId": 1,
  "slaBreached": false,
  "remainingTime": 86400,
  "dueAt": "2026-01-05T10:00:00Z"
}
```

### 5. Ažuriranje Tiket-a
```http
PUT /tickets/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "priority": "low"
}
```

**Odgovor (200 OK):**
```json
{
  "id": 1,
  "title": "Updated Title",
  "priority": "low",
  ...
}
```

### 6. Dodela Tiket-a Korisniku
```http
PUT /tickets/:id/assign/:userId
```

**Odgovor (200 OK):**
```json
{
  "id": 1,
  "assignedToId": 2,
  ...
}
```

### 7. Zatvaranje Tiket-a
```http
PUT /tickets/:id/close
```

**Odgovor (200 OK):**
```json
{
  "id": 1,
  "status": "Closed",
  ...
}
```

### 8. Brisanje Tiket-a
```http
DELETE /tickets/:id
```

**Odgovor (204 No Content)**

### 9. Preuzimanje Tiket-a sa SLA Prekršajima
```http
GET /tickets/sla/breached
```

**Odgovor (200 OK):**
```json
[
  {
    "id": 1,
    "slaBreached": true,
    ...
  }
]
```

### 10. Pokretanje SLA Monitoringa
```http
POST /tickets/sla/monitor
```

**Odgovor (201 Created):**
```json
{
  "message": "SLA monitoring completed"
}
```

## Pokretanje Svih Testova

```bash
# Pokrenite samo unit testove
npm test

# Pokrenite E2E testove
npm run test:e2e

# Pokrenite testove sa poklapanjem fajla
npm test -- tickets.controller

# Pokrenite testove sa watch mode-om
npm test -- --watch
```

## Očekivani Rezultati

✓ **22 unit testova** - Sve prosljeđuje
✓ **E2E testovi** - Zahtevaju aktivnu bazu podataka

## Greške i Rešenja

### ECONNREFUSED - Baza podataka nije dostupna

**Problem:** `ECONNREFUSED` pri E2E testiranju

**Rešenje:** 
- Proverite da li je PostgreSQL server pokrenut
- Proverite `.env` fajl i `DATABASE_URL`
- Pokrenite migracije: `npx prisma migrate deploy`

### Test ne pronalazi module

**Problem:** `Cannot find module`

**Rešenje:**
- Proverite paths u import statementima
- Koristite relativne putanje od lokacije test fajla

## Arhitektura Testova

### Unit Tests

Koriste **mock servis** objekat sa `jest.fn()` za sve Tickets i SLA servisne metode. Ovo dozvoljava testiranje kontrolera u izolaciji bez potrebe za bazom podataka.

### E2E Tests

Testiraju kompletan API kroz HTTP zahteve sa realnom aplikacijom. Zahtevaju aktivnu bazu podataka.

## Best Practices

1. **Struktuirani Testovi** - Svaki test je jasno namenjen jednom slučaju
2. **Deskriptivna Imena** - Test imena jasno opisuju šta se testira
3. **Setup i Cleanup** - `beforeAll` i `afterAll` za inicijalizaciju
4. **Mock Objekti** - Korišćenje `jest.fn()` za izolovanje testova
5. **Provera Poziva** - `toHaveBeenCalledWith()` za proveru parametara

## Dodavanje Novih Testova

Za dodavanje novog testa:

1. Otvorite `src/tickets/tickets.controller.spec.ts`
2. Dodajte novi test u odgovarajući `describe` blok
3. Pokrenite: `npm test -- tickets.controller`
4. Dodajte E2E test u `test/tickets.e2e-spec.ts` ako je potrebno

Primer:

```typescript
it('should handle specific scenario', async () => {
  const input = { ... };
  const result = await controller.method(input);
  
  expect(result).toEqual(expectedOutput);
  expect(service.method).toHaveBeenCalledWith(input);
});
```

## Korisni Linkovi

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
