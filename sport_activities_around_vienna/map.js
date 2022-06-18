var map = L.map('map').setView([48.218555285982625, 16.368826418913358], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let sportsUrl = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:SPORTSTAETTENOGD&srsName=EPSG:4326&outputFormat=json"
let sportsJSONData, cleanedSportsJSONLookupTable, sportsJSONLookupTable;
let sportsJSONDataKey = "sportsJSONDataKey";
let cleanedSportsJSONLookupTableKey = "cleanedSportsJSONLookupTable";
let sportsJSONLookupTableKey = "sportsJSONLookupTableKey";

let nullSelectorValue = "Bitte wählen";

displayFilter();

async function fetchSportsData() {
    let localStorageSaveCode = () => {
        localStorage.setItem(sportsJSONDataKey, JSON.stringify(sportsJSONData));
        localStorage.setItem(cleanedSportsJSONLookupTableKey, JSON.stringify(cleanedSportsJSONLookupTable));
        localStorage.setItem(sportsJSONLookupTableKey, JSON.stringify(sportsJSONLookupTable));
    }

    let localCopy = "../resources/SportstaettenData.json";
    let localRes = await fetch(localCopy);

    if (localRes.ok) {
        let fetchedJSONData = await localRes.json();
        sportsJSONData = fetchedJSONData.data;
        cleanedSportsJSONLookupTable = fetchedJSONData.cleanedLookupTable;
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
    cleanedSportsJSONLookupTable = fetchedJSONData.lookupTable;
    sportsJSONLookupTable = fetchedJSONData.lookupTable;
    cleanJsonData(sportsJSONData);
    writeToFile("SportstaettenData.json");

    localStorageSaveCode();
}

async function fillSportsData(isCleanedData) {
    if (isCleanedData === null) {
        isCleanedData = document.getElementById("all-sport-type-selector").value === nullSelectorValue;
    }
    Object.entries(map._layers).forEach((layer, index) => {
        if (index != 0) {
            map.removeLayer(layer[1]);
        }
    })
    sportsJSONData = JSON.parse(localStorage.getItem(sportsJSONDataKey));
    let lookupTable = JSON.parse(localStorage.getItem(isCleanedData ? cleanedSportsJSONLookupTableKey : sportsJSONLookupTableKey));

    if (!sportsJSONData || !lookupTable) {
        alert("Data is not yet loaded!");
        return;
    }

    let indoorOutdoor = document.getElementById("indoor-outdoor-selector").value.toLowerCase();
    let sportType = document.getElementById(isCleanedData ? "sport-type-selector" : "all-sport-type-selector").value;
    document.getElementById(isCleanedData ? "all-sport-type-selector" : "sport-type-selector").value = nullSelectorValue;

    let features = [];
    if (sportType === nullSelectorValue) return;

    lookupTable[sportType].forEach(tableIndex => {
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
    const outputGenerator = (lookupTable) => {
        let output = `<option>${nullSelectorValue}</option>`

        Object.keys(lookupTable).forEach(key => {
            output += `<option>${key}</option>`;
        })
        return output;
    }
    await fetchSportsData();


    let sportTypeSelector = document.getElementById("sport-type-selector");
    sportTypeSelector.innerHTML = outputGenerator(cleanedSportsJSONLookupTable);

    let allSportTypeSelector = document.getElementById("all-sport-type-selector");
    allSportTypeSelector.innerHTML = outputGenerator(sportsJSONLookupTable);
}

function writeToFile(fileName) {
    let xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("POST", "/persistence.php", true);
    xmlHttpRequest.setRequestHeader("Content-Type", "application/json");
    xmlHttpRequest.send(JSON.stringify({
        fileName: fileName,
        date: new Date(),
        data: sportsJSONData,
        cleanedLookupTable: cleanedSportsJSONLookupTable,
        lookupTable: sportsJSONLookupTable
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
    cleanedSportsJSONLookupTable = new Map();
    sportsJSONLookupTable = new Map();

    formattedJsonData.features.forEach((feature, index) => {
        feature.properties.SPORTSTAETTEN_ART.split(',').forEach(category => {
            category = category.replaceAll(/(\s*?\d*?\s*?)m²/g, ""); //Replace all m² and corresponding symbols with nothing

            category = category.replace(/\d+(?!-)/, "");
            category = category.trim();
            let sportKind = sportKinds.find(sportKind => category.toLowerCase().includes(sportKind.toLowerCase()));
            if (sportKind) {
                if (replaceNameArray[sportKind]) sportKind = replaceNameArray[sportKind];
                if (cleanedSportsJSONLookupTable[sportKind]) {
                    cleanedSportsJSONLookupTable[sportKind].push(index);
                } else cleanedSportsJSONLookupTable[sportKind] = [index];
            }
            if (sportsJSONLookupTable[category]) {
                sportsJSONLookupTable[category].push(index);
            } else sportsJSONLookupTable[category] = [index];
        });
    })

    cleanedSportsJSONLookupTable = Object.keys(cleanedSportsJSONLookupTable).sort().reduce((result, key) => {
        result[key] = cleanedSportsJSONLookupTable[key];
        return result;
    }, {});

    sportsJSONLookupTable = Object.keys(sportsJSONLookupTable).sort().reduce((result, key) => {
        result[key] = sportsJSONLookupTable[key];
        return result;
    }, {});
}