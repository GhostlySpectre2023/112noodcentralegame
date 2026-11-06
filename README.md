# Meldkamer 112 – dispatch-simulator

Een browsergame waarin je de 112-noodcentrale bemant: oproepen beantwoorden, incidenten aanmaken en de juiste hulpdiensten alarmeren op een echte kaart van België.

## Spelen
Open `index.html` via een lokale webserver, bv.:

```bash
python3 -m http.server 8000
# ga naar http://localhost:8000
```

(Of zet de map op GitHub Pages.)

## Functies
- **Startscherm**: naam, dag (werkdag/weekend), starttijd en de keuze van centrales (112 Brugge, Gent, Antwerpen, Leuven, Hasselt, Brussel, …). Via *Verfijnen* kies je enkel bepaalde steden, bv. alleen Brugge of Roeselare. 72 steden in 11 provincies/gewesten.
- **Oproep aannemen**: stel vragen aan de beller (adres, bewustzijn, ademhaling, gevaar…), kies het juiste protocol en de dringendheid (Prio 1–3). Ophangen bij valse oproepen, of doorschakelen naar een buurcentrale als het te druk is.
- **Middelen sturen**: ziekenwagen, PIT, MUG, brandweer (AP, AL, TW, HV) en politie. Je ziet de afstand en de rijtijd over de weg (OSRM), met kleuren voor de aanrijnorm.
- **Verkeerd protocol?** De eerste ploeg ter plaatse meldt de echte situatie en vraagt bijkomende middelen.
- **Radioverkeer**: ploegen melden zich ter plaatse en vrij. Antwoord met een klik of met **push-to-talk** (knop of T-toets, spraakherkenning van je browser: zeg "begrepen" of de naam van een ziekenhuis). Stemmen via de spraakfunctie van je browser.
- **Afvoer**: kies het ziekenhuis (bezetting open/druk/volzet, cathlab, stroke unit, trauma).
- **Aanrijnorm**: 15/20/30 minuten per prioriteit, met een percentage in de bovenbalk.
- **Hulp van een buurcentrale** als je zelf geen middelen meer hebt.
- Krediet verdienen, extra voertuigen kopen en nieuwe posten bouwen. Voortgang wordt in je browser bewaard.
- Spelsnelheid pauze/1x/2x/4x (spatiebalk = pauze).

Simulatiespel: alle meldingen en personen zijn fictief. Bij echte nood: bel 112.
