# Frontend Navodila - SLA Prekršeni Števec

## Kontekst
Backend aplikacija (NestJS + Prisma) ima nov endpoint za pridobivanje števila prekršenih SLA-jev.

## Backend Endpoint
```
GET http://localhost:3000/tickets/sla/breached/count
```

**Response format:**
```json
{
  "count": 4
}
```

## Zahteve za Frontend

### 1. Dinamični Prikaz Števca
Na glavni strani, kjer je trenutno prikazan tekst "SLA Prekršeni", je potrebno:

1. **Dodati števec v oklepajih** zraven teksta
   - Format: `SLA Prekršeni (4)`
   - Številka naj se dinamično posodablja

2. **Implementirati periodično posodabljanje**
   - Števec naj se posodablja vsako minuto (polling)
   - Ali uporabite WebSocket/Server-Sent Events če je že implementirano
   - Začetni fetch naj se izvede ob nalaganju komponente

3. **Vizualni prikaz**
   - Števec naj bo jasno viden
   - Razmislite o barvni kodi (npr. rdeča če > 0)
   - Dodajte loading state med prvim fetchom

### 2. Primer Implementacije (React/Vue)

#### React Example:
```javascript
import { useState, useEffect } from 'react';

function SLAWidget() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSLACount = async () => {
    try {
      const response = await fetch('http://localhost:3000/tickets/sla/breached/count');
      const data = await response.json();
      setCount(data.count);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SLA count:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSLACount();

    // Set up polling every 60 seconds
    const interval = setInterval(fetchSLACount, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sla-widget">
      <span>SLA Prekršeni</span>
      {loading ? (
        <span> (...)</span>
      ) : (
        <span style={{ color: count > 0 ? 'red' : 'green' }}>
          {' '}({count})
        </span>
      )}
    </div>
  );
}
```

#### Vue 3 Example:
```vue
<template>
  <div class="sla-widget">
    <span>SLA Prekršeni</span>
    <span v-if="loading"> (...)</span>
    <span v-else :style="{ color: count > 0 ? 'red' : 'green' }">
      ({{ count }})
    </span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const count = ref(null);
const loading = ref(true);
let interval = null;

const fetchSLACount = async () => {
  try {
    const response = await fetch('http://localhost:3000/tickets/sla/breached/count');
    const data = await response.json();
    count.value = data.count;
    loading.value = false;
  } catch (error) {
    console.error('Error fetching SLA count:', error);
  }
};

onMounted(() => {
  fetchSLACount();
  interval = setInterval(fetchSLACount, 60000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
```

### 3. Dodatne Priporočila

1. **Error Handling**
   - Če API ne deluje, prikaži zadnjo znano vrednost
   - Dodaj retry logiko po X sekundah

2. **Performance**
   - Interval lahko prilagodite glede na potrebe (30s, 60s, 2min)
   - Če uporabnik ni aktiven na strani, lahko ustavite polling

3. **UX Izboljšave**
   - Dodajte tooltip z dodatnimi informacijami
   - Omogočite klik na widget za prikaz seznama prekršenih SLA
   - Dodajte animacijo pri posodobitvi številke

4. **Povezava z obstoječim seznamom**
   - Če že obstaja seznam SLA prekršenih ticketov, lahko uporabite isti API:
   ```
   GET http://localhost:3000/tickets/sla/breached
   ```
   - In preprosto preštejete elemente v response

### 4. Testiranje

1. Testirajte posodabljanje:
   - Ustvarite nov ticket z visoko prioriteto
   - Počakajte 1 minuto (SLA deadline)
   - Preverite, da se števec poveča

2. Preverite edge case-e:
   - Kaj se zgodi, ko je count = 0?
   - Kaj se zgodi pri network erroru?
   - Ali se števec pravilno posodobi po refreshu strani?

## Backend Kontekst

- SLA se prekrši za tickete z visoko prioriteto po 1 minuti
- Zaprte karte (status "Closed") se ne štejejo kot prekršene
- Backend ima scheduled task, ki vsako minuto preverja SLA
- Polje `slaBreached` v bazi se posodobi avtomatsko

## Dodatni Endpointi

Če potrebujete več podatkov:
```
GET /tickets/sla/breached - seznam vseh prekršenih ticketov
GET /tickets/:id/sla-status - SLA status specifičnega ticketa
```
