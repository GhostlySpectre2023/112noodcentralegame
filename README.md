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
- **Regiokeuze**: heel België, volledige provincies of losse steden (bv. enkel Brugge of Roeselare) – 72 steden in 11 provincies/gewesten.
- Per stad een brandweerpost, ambulancepost, ziekenhuis (MUG) en politiekantoor.
- Voertuigen: Ziekenwagen, MUG, Autopomp, Autoladder, Tankwagen, Hulpverleningswagen, Politie.
- 16 incidenttypes (onwel persoon, hartstilstand, woningbrand, ongeval met geknelde, gaslek, industriebrand, …), sommige pas vanaf een hoger level.
- Valse oproepen herkennen, patiënttransport naar het dichtstbijzijnde ziekenhuis, statussen 1–5.
- Echte routes over de weg via OSRM (met terugval op een rechte lijn).
- Krediet verdienen, extra voertuigen kopen en nieuwe posten bouwen. De voortgang wordt in je browser bewaard.
- Spelsnelheid pauze/1x/2x/4x (spatiebalk = pauze).
