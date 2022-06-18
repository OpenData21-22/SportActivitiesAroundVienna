var map = L.map('map').setView([48.218555285982625, 16.368826418913358], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let sportsUrl = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:SPORTSTAETTENOGD&srsName=EPSG:4326&outputFormat=json"
let sportsJSONData, sportsJSONLookupTable;
let sportsJSONDataKey = "sportsJSONDataKey";
let sportsJSONLookupTableKey = "sportsJSONLookupTable";

displayFilter();

async function fetchSportsData() {
    let localStorageSaveCode = () => {
        localStorage.setItem(sportsJSONDataKey, JSON.stringify(sportsJSONData));
        localStorage.setItem(sportsJSONLookupTableKey, JSON.stringify(sportsJSONLookupTable));
    }

    let localCopy = "../resources/SportstaettenData.json";
    let localRes = await fetch(localCopy);

    if (localRes.ok) {
        let fetchedJSONData = await localRes.json();
        sportsJSONData = fetchedJSONData.data;
        sportsJSONLookupTable = fetchedJSONData.lookupTable;

        //Calculate difference of days between saving and today
        let dateOfSaving = Date.parse(fetchedJSONData.date);
        let currentDate = new Date();
        let timeDifference = currentDate - dateOfSaving;
        let differenceInDays = timeDifference / (1000 * 3600 * 24);

        localStorageSaveCode();

        if (differenceInDays < 7) return;
    }

    //Fetch file remotely and persist it.
    let remoteRes = await fetch(sportsUrl);
    fetchedJSONData = await remoteRes.json();
    sportsJSONData = fetchedJSONData;
    sportsJSONLookupTable = fetchedJSONData.lookupTable;

    cleanJsonData(sportsJSONData);
    writeToFile("SportstaettenData.json", sportsJSONData, sportsJSONLookupTable);

    localStorageSaveCode();
}

async function fillSportsData() {
    Object.entries(map._layers).forEach((layer, index) => {
        if (index != 0) {
            map.removeLayer(layer[1]);
        }
    })
    sportsJSONData = JSON.parse(localStorage.getItem(sportsJSONDataKey));
    sportsJSONLookupTable = JSON.parse(localStorage.getItem(sportsJSONLookupTableKey));

    if (!sportsJSONData || !sportsJSONLookupTable) {
        alert("Data is not yet loaded!");
        return;
    }

    let indoorOutdoor = document.getElementById("indoor-outdoor-selector").value.toLowerCase();
    let sportType = document.getElementById("sport-type-selector").value;
    let features = [];
    if (sportType === "Bitte wählen") return;

    sportsJSONLookupTable[sportType].forEach(tableIndex => {
        let feature = sportsJSONData.features[tableIndex];
        if (indoorOutdoor === "keine angabe" || feature.properties.KATEGORIE_TXT.includes(indoorOutdoor)) {
            features.push(feature)
        }
    })

    //sportsJSONData.features.forEach(feature => {
    features.forEach(feature => {
    let coordinates = feature.geometry.coordinates;
        let type = feature.geometry.type;
        let properties = feature.properties;

        if (type === "Point") {
            let marker = L.marker([coordinates[1], coordinates[0]]).addTo(map);
            marker.bindPopup(`
            Kategorie: ${properties.KATEGORIE_TXT}<br>
            Addresse: ${properties.ADRESSE}<br>
            Website: <a href="${properties.WEBLINK1}">${properties.WEBLINK1}</a>`);
        }
    })
}

async function displayFilter() {
    await fetchSportsData();
    let output = "<option>Bitte wählen</option>"

    Object.keys(sportsJSONLookupTable).forEach(key => {
        output += `<option>${key}</option>`;
    })

    let sportTypeSelector = document.getElementById("sport-type-selector");
    sportTypeSelector.innerHTML = output;
}

function writeToFile(fileName, jsonData, lookupTable) {
    let xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("POST", "/persistence.php", true);
    xmlHttpRequest.setRequestHeader("Content-Type", "application/json");
    console.log(lookupTable);
    xmlHttpRequest.send(JSON.stringify({
        fileName: fileName,
        date: new Date(),
        data: jsonData,
        lookupTable: lookupTable
    }));
}

function cleanJsonData(jsonData) {
    //TODO: Move to php
    jsonData.features.forEach(feature => {
        let sportstaettenArt = feature.properties.SPORTSTAETTEN_ART;
        //remove all html tags
        sportstaettenArt = sportstaettenArt.replaceAll(/(?<!,\s*)(<.*?>)/g, ","); //Replace all html tags that do not have a leading comma with a comma
        sportstaettenArt = sportstaettenArt.replaceAll(/(<.*?>)/g, ""); //Replace all html tags with nothing
        sportstaettenArt = sportstaettenArt.replaceAll(/,(\s)*((?!.+))/g, ""); //Replace all commas that are not followed by a word character with nothing
        sportstaettenArt = sportstaettenArt.replaceAll(/^(?<!.+)\n/g, ""); //Replace all \n that are not lead by a character with nothing
        sportstaettenArt = sportstaettenArt.replaceAll(/\n/g, ","); //Replace all \n with a comma nothing

        feature.properties.SPORTSTAETTEN_ART = sportstaettenArt;
    })
    calculateLookupTable(jsonData);
}

function calculateLookupTable(formattedJsonData) {
    //TODO: Move to php
    //Tennis, Wasser
    replaceNameArray = {
        Rasenpl: "Rasenplatz",
        Hartpl: "Hartplatz",
        Budo: "Budosportarten",
        Fussball: "Fußball",
        Pool: "Billard",
        Soccer: "Fußball",
        Reit: "Reiten",
        Kegel: "Kegeln",
        Kletter: "Klettern",
        Inline: "Inlinesport",
        Fittness: "Fitness",
        Turn: "Turnen"
    }
    //It is important to lead with the more specific sport (Tischtennis before Tennis) for the matching to work properly.
    sportKinds = ["Badminton", "Basketball", "Volleyball", "Handball", "Rasenpl", "Fitness", "Kletter", "Leichtathletik", "Hartpl", "Tischtennis", "Tennis", "Budo", "Turnen", "Bowling", "Squash", "Minigolf", "Golf", "Fußball", "Fussball", "Pool", "Billard", "Soccer", "Kegel", "Reit", "Eissport", "Inline", "Turn", "Hundesport", "Fittness"];
    sportsJSONLookupTable = new Map();

    formattedJsonData.features.forEach((feature, index) => {
        feature.properties.SPORTSTAETTEN_ART.split(',').forEach(category => {
            category = category.replaceAll(/(\s*?\d*?\s*?)m²/g, ""); //Replace all m² and corresponding symbols with nothing

            category = category.replace(/\d+(?!-)/, "");
            category = category.trim();
            let sportKind = sportKinds.find(sportKind => category.toLowerCase().includes(sportKind.toLowerCase()));
            if (sportKind) {
                if (replaceNameArray[sportKind]) sportKind = replaceNameArray[sportKind];
                if (sportsJSONLookupTable[sportKind]) {
                    sportsJSONLookupTable[sportKind].push(index);
                } else sportsJSONLookupTable[sportKind] = [index];
            }

        });
    })

    sportsJSONLookupTable = Object.keys(sportsJSONLookupTable).sort().reduce((result, key) => {
        result[key] = sportsJSONLookupTable[key];
        return result;
    }, {});
}