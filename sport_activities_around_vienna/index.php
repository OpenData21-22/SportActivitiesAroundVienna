<html>
<head>
    <meta charset="UTF-8">
    <title>SportActivitesAroundVienna</title>
    <link rel="stylesheet" href="node_modules/leaflet/dist/leaflet.css">
    <link rel="stylesheet" href="index.css">
    <script src="node_modules/leaflet/dist/leaflet.js"></script>
</head>
<body>
</table>
<div id="map"></div>

<div id="widget-containers">
    <div id="openweathermap-widget-13"></div>

    <div id="filter-table">
        <label for="indoor-outdoor-selector">Indoor / Outdoor: </label>
        <select id="indoor-outdoor-selector" onchange="fillSportsData(null)">
            <option>Keine Angabe</option>
            <option>Indoor</option>
            <option>Outdoor</option>
        </select>

        <div class="spacer"></div>
        <label for="sport-type-selector">Sportart: </label>
        <select id="sport-type-selector" onchange="fillSportsData(true)"></select>

        <div class="spacer"></div>
        <label for="all-sport-type-selector">Sonstige Sportarten</label>
        <select id="all-sport-type-selector" onchange="fillSportsData(false)"></select>
    </div>
</div>
<script src="map.js"></script>
<script>
    window.myWidgetParam ? window.myWidgetParam : window.myWidgetParam = [];
    window.myWidgetParam.push({
        id: 13,
        cityid: '2761369',
        appid: '946349af7aa68f133051d047315060ad',
        units: 'metric',
        containerid: 'openweathermap-widget-13',
    });
    (function () {
        var script = document.createElement('script');
        script.async = true;
        script.charset = "utf-8";
        script.src = "//openweathermap.org/themes/openweathermap/assets/vendor/owm/js/weather-widget-generator.js";
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(script, s);
    })();
</script>
</body>
</html>
