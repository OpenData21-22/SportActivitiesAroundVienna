var map = L.map('map').setView([48, 16], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let sportsUrl = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:SPORTSTAETTENOGD&srsName=EPSG:4326&outputFormat=json"
let sportsJSONData;

fillSportsData();

async function fetchSportsData() {
    let localCopy = "../resources/SportstaettenData.json";
    let localRes = await fetch(localCopy);

    if (localRes.ok) {
        let fetchedJSONData = await localRes.json();
        sportsJSONData = fetchedJSONData.data;

        //Calculate difference of days between saving and today
        let dateOfSaving = Date.parse(fetchedJSONData.date);
        let currentDate = new Date();
        let timeDifference = currentDate - dateOfSaving;
        let differenceInDays =  timeDifference / (1000 * 3600 * 24);

        if (differenceInDays < 7) return;
    }

    //Fetch file remotely and persist it.
    let remoteRes = await fetch(sportsUrl);
    sportsJSONData = await remoteRes.json();
    writeToFile("SportstaettenData.json", sportsJSONData);
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

    function writeToFile(fileName, jsonData) {
        let xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("POST", "/persistence.php", true);
        xmlHttpRequest.setRequestHeader("Content-Type", "application/json");

        xmlHttpRequest.send(JSON.stringify({
            fileName: fileName,
            date: new Date(),
            data: jsonData
        }));
    }