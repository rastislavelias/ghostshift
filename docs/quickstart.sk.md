# Ghostshift: rýchly štart

Na počítači alebo serveri potrebuješ Git a Docker s Docker Compose.

```sh
git clone https://github.com/rastislavelias/ghostshift.git
cd ghostshift
docker compose up --build -d --wait
```

Otvor http://localhost:3000. Pri prvom spustení Docker stiahne obrazy, zostaví aplikáciu,
pripraví databázu a spustí konzolu. V konzole môžeš vytvoriť projekt a uložiť jeho zadanie.
Zatiaľ sa tým nespustia agenti ani platené AI volania.

Ak aplikácia beží na serveri, na svojom počítači otvor SSH tunel:

```sh
ssh -N -L 3000:127.0.0.1:3000 pouzivatel@server
```

Potom otvor http://localhost:3000. Konzola zatiaľ nemá prihlasovanie, preto sa sprístupňuje
len lokálne. Databáza nemá otvorený port do siete.

`docker compose down` služby zastaví a zachová dáta. Opätovne ich spustíš cez
`docker compose up -d --wait`. Prepínač `-v` pri `down` vymaže aj databázový volume.

Po preinštalovaní servera repozitár vytvorí nový prázdny systém. Pôvodné projekty treba
obnoviť zo zálohy podľa [návodu](operations.md). Samotný GitHub databázu neobsahuje.

`README.md` je pre používateľov a recruiterov. `AGENTS.md` určuje pravidlá pre AI nástroje
a prispievateľov. Kód a hlavná dokumentácia sú v angličtine.
