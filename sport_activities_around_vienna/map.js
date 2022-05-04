var map = L.map('map').setView([48, 16], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

fillSportsData();

async function fillSportsData() {
    let sportsUrl = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:SPORTSTAETTENOGD&srsName=EPSG:4326&outputFormat=json"
    let response = await fetch(sportsUrl);
    let jsonData = await response.json();
    
    jsonData.features.forEach(feature => {
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

