# Weather App

## 1. Panoramica del progetto

Weather App e una semplice applicazione Angular che usa le API di Open-Meteo per mostrare il meteo di una o piu citta.

L'utente inserisce una lista di citta separate da virgole. Per ogni citta l'app:

1. usa la Geocoding API di Open-Meteo per trovare la citta;
2. ottiene latitudine e longitudine;
3. usa queste coordinate per chiamare la Forecast API;
4. mostra il meteo corrente, alcune metriche aggiuntive e una previsione di 5 giorni.

L'app include caching lato browser per 1 ora, validazione dell'input e gestione degli errori per singola citta.

## 2. Installazione

### Requisiti

- Node.js installato
- npm disponibile nel sistema

### Passaggi

1. Apri il terminale nella cartella del progetto.
2. Installa le dipendenze.

```bash
npm install
```

## 3. Utilizzo

### Avvio dell'app

Per avviare il server di sviluppo:

```bash
npm start
```

Una volta avviata, l'app sara disponibile su:

```text
http://localhost:4200/
```

### Come usare l'app

1. Apri l'app nel browser.
2. Inserisci una o piu citta nel campo di input.
3. Se vuoi cercare piu citta insieme, separale con una virgola.
4. Fai clic su `Cerca meteo`.
5. L'app mostra una card per ogni citta valida o un errore per ogni citta non risolta.

### Esempio di utilizzo

- Inserisci `Roma, Milano, Napoli`
- Premi `Cerca meteo`
- L'app mostra temperatura corrente, umidita, vento, precipitazioni e previsione di 5 giorni per ogni citta trovata

## 4. Output di esempio

Esempio di oggetto restituito dal servizio meteo:

```json
{
  "city": "Roma",
  "temperatureCelsius": 22.4,
  "weatherDescription": "Parzialmente nuvoloso",
  "relativeHumidity": 61,
  "windSpeed": 14.2,
  "precipitation": 0,
  "forecast": [
    {
      "date": "2026-04-15",
      "minTemperatureCelsius": 11.2,
      "maxTemperatureCelsius": 22.8
    },
    {
      "date": "2026-04-16",
      "minTemperatureCelsius": 12.1,
      "maxTemperatureCelsius": 24.3
    }
  ]
}
```

Nota: i valori cambiano in base alla citta cercata e al momento della richiesta.

## 5. Funzionalita

- Ricerca di una o piu citta con input separato da virgole
- Geocoding di Open-Meteo per ottenere coordinate geografiche
- Forecast API di Open-Meteo usando coordinate, non il nome della citta
- Caching in `localStorage` per 1 ora per ogni citta
- Visualizzazione del meteo corrente
- Visualizzazione di umidita, vento e precipitazioni
- Previsione di 5 giorni con data, minima e massima
- Gestione degli errori per singola citta senza bloccare gli altri risultati
- Layout responsive con card per ogni risultato

## 6. Gestione degli errori

L'app gestisce questi casi:

### Input non valido

Se l'utente non inserisce nessuna citta valida, viene mostrato:

```text
Inserisci almeno una citta.
```

### Citta non trovata

Se la Geocoding API non restituisce risultati per una citta, quella card mostra:

```text
Citta non trovata. Controlla il nome inserito.
```

### Errori API

Se una chiamata HTTP verso Open-Meteo restituisce una risposta non valida, viene mostrato un messaggio dedicato per quella citta.

### Problemi di rete

Se la richiesta fallisce prima di ricevere una risposta, viene mostrato:

```text
Problema di rete. Controlla la connessione e riprova.
```

### Cache corrotta

Se i dati salvati in `localStorage` non sono parsabili o non hanno il formato corretto, vengono ignorati e l'app recupera dati freschi.

## 7. Informazioni API

L'app usa due endpoint di Open-Meteo.

### Geocoding API

Trasforma il nome della citta in coordinate geografiche.

Esempio di richiesta:

```text
https://geocoding-api.open-meteo.com/v1/search?name=Roma&count=1&language=it&format=json
```

Campi usati:

- `name`
- `latitude`
- `longitude`

### Forecast API

Recupera il meteo corrente e la previsione breve usando le coordinate ottenute dal geocoding.

Esempio di richiesta:

```text
https://api.open-meteo.com/v1/forecast?latitude=41.8919&longitude=12.5113&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation&daily=temperature_2m_min,temperature_2m_max&forecast_days=5&timezone=auto
```

L'app usa sempre latitudine e longitudine per la richiesta meteo finale.

Campi usati:

- `current.temperature_2m`
- `current.weather_code`
- `current.relative_humidity_2m`
- `current.wind_speed_10m`
- `current.precipitation`
- `daily.time`
- `daily.temperature_2m_min`
- `daily.temperature_2m_max`

## 8. Miglioramenti futuri

Possibili miglioramenti realistici:

- mostrare icone meteo per ogni descrizione
- aggiungere riordino e rimozione delle citta cercate
- usare una formattazione data piu leggibile in base alla lingua dell'utente
- aggiungere un indicatore visivo quando un risultato arriva dalla cache
- introdurre test unitari dedicati al service con mock delle API

## Script utili

```bash
npm start
npm run build
npm test -- --watch=false
```
