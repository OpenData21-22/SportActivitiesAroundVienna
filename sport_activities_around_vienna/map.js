var map = L.map('map').setView([48, 16], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let sportsUrl = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:SPORTSTAETTENOGD&srsName=EPSG:4326&outputFormat=json"
let sportsJSONData, sportsJSONLookupTable;

fillSportsData();

async function fetchSportsData() {
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

        if (differenceInDays < 7) return;
    }

    //Fetch file remotely and persist it.
    let remoteRes = await fetch(sportsUrl);
    fetchedJSONData = await remoteRes.json();
    sportsJSONData = fetchedJSONData;
    sportsJSONLookupTable = fetchedJSONData.lookupTable;

    cleanJsonData(sportsJSONData);
    writeToFile("SportstaettenData.json", sportsJSONData, sportsJSONLookupTable);
}

async function fillSportsData() {
    await fetchSportsData();

    sportsJSONData.features.forEach(feature => {
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

function writeToFile(fileName, jsonData, lookupTable) {
    let xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("POST", "/persistence.php", true);
    xmlHttpRequest.setRequestHeader("Content-Type", "application/json");

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
    sportPlaceExtensions = ["Platz", "Plätze", "Halle", "Hallen", "Anlage", "Anlagen", "Feld", "Felder", "Lift", "Stadion"];
    sportsJSONLookupTable = new Map();

    formattedJsonData.features.forEach((feature, index) => {
        feature.properties.SPORTSTAETTEN_ART.split(',').forEach(category => {
            category = category.replaceAll(/(\s*?\d*?\s*?)m²/g, ""); //Replace all m² and corresponding symbols with nothing

            category = category.replace(/\d+(?!-)/, "");
            category = category.trim();

            if (sportsJSONLookupTable[category]) {
                sportsJSONLookupTable[category].push(index);
            }
            else sportsJSONLookupTable[category] = [index];
        });
    })
}