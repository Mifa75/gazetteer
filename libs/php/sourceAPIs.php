<?php
header("Content-Type: application/json");
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path to your GeoJSON file (adjust the path if needed)
$jsonFilePath = __DIR__ . "/../../data/countryBorders.geo.json";

if (!file_exists($jsonFilePath)) {
    echo json_encode(["error" => "countryBorders.geo.json not found"]);
    exit;
}

$jsonData = file_get_contents($jsonFilePath);
if ($jsonData === false) {
    echo json_encode(["error" => "Failed to read countryBorders.geo.json"]);
    exit;
}

$data = json_decode($jsonData, true);
if ($data === null) {
    echo json_encode(["error" => "Invalid JSON format in countryBorders.geo.json"]);
    exit;
}

// API credentials
$geoApiKey = "8a6a15533b384e5eae2173ec47f08b59"; // OpenCage API Key
$weatherApiKey = "ead1cebb41d97a623f20e1e5d5768232"; // OpenWeatherMap API Key
$geoNamesUser = "silviascano"; // GeoNames Username
$exchangeRateAPI = "662a088d525921701c83ae01"; // Exchangerate API
$newsApiKey = "pub_700233e0aa8d422e324b69ca665d9e9c6d02a"; // Newsdata.io API

// 1. Fetch country borders by ISO code (for border display)
if (isset($_GET['iso']) && !isset($_GET['countryInfo']) && !isset($_GET['weather']) && !isset($_GET['forecast']) && !isset($_GET['from']) && !isset($_GET['news']) && !isset($_GET['weatherCapital'])) {
    $isoCode = $_GET['iso'];
    $border = null;
    
    foreach ($data['features'] as $feature) {
        if ($feature['properties']['iso_a2'] === strtoupper($isoCode)) {
            $border = $feature['geometry'];
            break;
        }
    }
    
    if ($border) {
        echo json_encode(["geometry" => $border]);
    } else {
        echo json_encode(["error" => "Country not found"]);
    }
    exit;
}

// 2. Fetch country details from GeoNames API
if (isset($_GET['countryInfo']) && isset($_GET['iso'])) {
    $isoCode = $_GET['iso'];
    $geoUrl = "http://api.geonames.org/countryInfoJSON?country={$isoCode}&username={$geoNamesUser}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $geoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $geoResponse = curl_exec($ch);
    if ($geoResponse === false) {
        echo json_encode(["error" => "Failed to fetch country data"]);
        exit;
    }
    curl_close($ch);
    
    $geoData = json_decode($geoResponse, true);
    if ($geoData && isset($geoData['geonames'][0])) {
        $countryInfo = $geoData['geonames'][0];

        $lat = isset($countryInfo['north']) ? ($countryInfo['north'] + $countryInfo['south']) / 2 : null;
        $lng = isset($countryInfo['east']) ? ($countryInfo['east'] + $countryInfo['west']) / 2 : null;

        echo json_encode([
            "continent"   => $countryInfo['continentName'],
            "capital"     => $countryInfo['capital'],
            "areaInSqKm"  => $countryInfo['areaInSqKm'],
            "currencyCode"=> $countryInfo['currencyCode'],
            "population"  => $countryInfo['population'],
            "languages"   => $countryInfo['languages'],
            "lat"         => $lat,
            "lng"         => $lng
        ]);
    } else {
        echo json_encode(["error" => "Country data not found"]);
    }
    exit;
}

// 3. Fetch location from lat/lng using OpenCage API
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $lat = $_GET['lat'];
    $lng = $_GET['lng'];
    $url = "https://api.opencagedata.com/geocode/v1/json?q={$lat}+{$lng}&key={$geoApiKey}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    if(curl_errno($ch)) {
        curl_close($ch);
        echo json_encode(["error" => "cURL Error: " . curl_error($ch)]);
        exit;
    }
    curl_close($ch);
    
    $geoData = json_decode($response, true);
    if ($geoData && !empty($geoData['results'])) {
        $result = $geoData['results'][0];
        $country = isset($result['components']['country']) ? $result['components']['country'] : "Unknown";
        $iso = isset($result['components']['ISO_3166-1_alpha-2']) ? $result['components']['ISO_3166-1_alpha-2'] : null;
        echo json_encode([
            "iso"     => $iso,
            "country" => $country,
            "currency"=> "Unknown" // Currency determination not implemented here
        ]);
    } else {
        echo json_encode(["error" => "No data received"]);
    }
    exit;
}

// 4. Perform currency conversion (updated parameter names)
// A) Get the full list of currency codes
if (isset($_GET['getCurrencyCodes'])) {
    $url = "https://v6.exchangerate-api.com/v6/{$exchangeRateAPI}/codes";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $resp = curl_exec($ch);

    if (curl_errno($ch)) {
        echo json_encode(["error" => "cURL Error: " . curl_error($ch)]);
        exit;
    }
    curl_close($ch);

    $json = json_decode($resp, true);
    if (isset($json['result']) && $json['result'] === "success") {
        echo json_encode(["supported_codes" => $json['supported_codes']]);
    } else {
        echo json_encode(["error" => "Failed to retrieve currency codes."]);
    }
    exit;
}
// B) Convert Currency from=? to=? amount=?
if (isset($_GET['convertCurrency'])) {
    $from   = $_GET['from'] ?? "USD";  // default from
    $to     = $_GET['to']   ?? "";     // must come from JS <select>
    $amount = isset($_GET['amount']) ? floatval($_GET['amount']) : 1;

    if (empty($to)) {
        echo json_encode(["error" => "No target currency specified."]);
        exit;
    }

    $url = "https://v6.exchangerate-api.com/v6/{$exchangeRateAPI}/pair/{$from}/{$to}";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $resp = curl_exec($ch);

    if (curl_errno($ch)) {
        echo json_encode(["error" => "cURL Error: " . curl_error($ch)]);
        exit;
    }
    curl_close($ch);

    $json = json_decode($resp, true);
    
    if (isset($json['result']) && $json['result'] === "success") {
        $rate      = $json['conversion_rate'];
        $converted = $amount * $rate;
        echo json_encode([
            "result" => round($converted, 2),  // e.g. 83.00
            "rate"   => $rate
        ]);
    } else {
        echo json_encode(["error" => "Failed to convert currency."]);
    }
    exit;
}

// ============= Fetch WEATHER for the CAPITAL of the given country ISO ================
if (isset($_GET['weatherCapital']) && isset($_GET['iso'])) {
    $isoCode = $_GET['iso'];

    // 1) Get the capital from GeoNames
    $geoUrl = "http://api.geonames.org/countryInfoJSON?country={$isoCode}&username={$geoNamesUser}";
    $geoResponse = file_get_contents($geoUrl);
    $geoData = json_decode($geoResponse, true);

    if (!$geoData || !isset($geoData['geonames'][0]['capital'])) {
        echo json_encode(["error" => "Could not find capital for this country code"]);
        exit;
    }
    $capitalCity = $geoData['geonames'][0]['capital'];

    // 2) Geocode the capital city with OpenCage
    $capitalQuery = urlencode($capitalCity . " " . $isoCode);
    $ocUrl = "https://api.opencagedata.com/geocode/v1/json?q={$capitalQuery}&key={$geoApiKey}";
    $ocResp = file_get_contents($ocUrl);
    $ocData = json_decode($ocResp, true);

    if (!$ocData || empty($ocData['results'])) {
        echo json_encode(["error" => "Failed to geocode the capital city"]);
        exit;
    }
    $lat = $ocData['results'][0]['geometry']['lat'];
    $lng = $ocData['results'][0]['geometry']['lng'];

    // 3) Fetch current weather from OpenWeather
    $weatherUrl = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lng}&appid={$weatherApiKey}&units=metric";
    $weatherResp = file_get_contents($weatherUrl);
    $weatherData = json_decode($weatherResp, true);
    if (!$weatherData) {
        echo json_encode(["error" => "Failed to get current weather"]);
        exit;
    }

    // 4) Fetch 2-day forecast from OpenWeather
    $forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?lat={$lat}&lon={$lng}&appid={$weatherApiKey}&units=metric";
    $forecastResp = file_get_contents($forecastUrl);
    $forecastData = json_decode($forecastResp, true);
    if (!$forecastData) {
        echo json_encode(["error" => "Failed to get forecast"]);
        exit;
    }

    // Return everything in one JSON
    echo json_encode([
        "capital"  => $capitalCity,
        "lat"      => $lat,
        "lng"      => $lng,
        "weather"  => $weatherData,
        "forecast" => $forecastData
    ]);
    exit;
}

// 7. Fetch data for Layers (Airports, Cities, Universities, Stadiums)
if (isset($_GET['type'])) {
    $type = $_GET['type'];

    $featureCodes = [
        'airports'     => 'AIRP',
        'cities'       => 'P',
        'universities' => 'UNIV', 
        'stadiums'     => 'STDM'
    ];

    if (!array_key_exists($type, $featureCodes)) {
        echo json_encode([]);
        exit;
    }

    $url = "http://api.geonames.org/searchJSON?featureClass=S&featureCode={$featureCodes[$type]}&maxRows=100&username={$geoNamesUser}";
    
    // Add country filter if provided
    if (isset($_GET['type'])) {
        $type = $_GET['type'];
    
        switch ($type) {
            case 'airports':
                $url = "http://api.geonames.org/searchJSON?featureClass=S&featureCode=AIRP";
                break;
            case 'universities':
                $url = "http://api.geonames.org/searchJSON?featureClass=S&featureCode=UNIV";
                break;
            case 'stadiums':
                $url = "http://api.geonames.org/searchJSON?featureClass=S&featureCode=STDM";
                break;
            case 'cities':
                // EITHER
                $url = "http://api.geonames.org/searchJSON?featureClass=P";
                // OR
                $url = "http://api.geonames.org/searchJSON?cities=cities15000";
                break;
            default:
                echo json_encode([]);
                exit;
        }
    
        $url .= "&maxRows=10&username={$geoNamesUser}";
    
        // Optional country filter
        if (!empty($_GET['country'])) {
            $url .= "&country=" . $_GET['country'];
        }
    
        $response = file_get_contents($url);
        $dataResponse = json_decode($response, true);
    
        // Build JSON output
        $results = [];
        if (!empty($dataResponse['geonames'])) {
            foreach ($dataResponse['geonames'] as $place) {
                if (isset($place['lat']) && isset($place['lng'])) {
                    $results[] = [
                        'name'        => $place['name'],
                        'lat'         => $place['lat'],
                        'lng'         => $place['lng'],
                        'countryName' => $place['countryName'] ?? ''
                    ];
                }
            }
        }
        echo json_encode($results);
        exit;
    }
}    

// 8. Fetch Latest News (cURL) 
if (isset($_GET['news']) && isset($_GET['iso'])) {
    $isoCode = strtolower($_GET['iso']); // e.g. "us", "gb", etc.

    $url = "https://newsdata.io/api/1/latest?apikey={$newsApiKey}&country={$isoCode}&language=en&image=1";


    // Initialize cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $resp = curl_exec($ch);
    if (curl_errno($ch)) {
        echo json_encode(["error" => "cURL Error: " . curl_error($ch)]);
        exit;
    }
    curl_close($ch);

    // Decode the JSON response
    $newsData = json_decode($resp, true);

    // Check for articles
    if (isset($newsData['results'])) {
        $articles = array_slice($newsData['results'], 0, 5);
        echo json_encode(["results" => $articles]);
    } else {
        echo json_encode(["error" => "No results found"]);
    }
    exit;
}

// 9. Fetch Wikipedia information via GeoNames API using country name
if (isset($_GET['wikipedia']) && isset($_GET['countryName'])) {
    $countryName = $_GET['countryName'];
    $countryName = urlencode($countryName);
    $wikipediaUrl = "http://api.geonames.org/wikipediaSearchJSON?title={$countryName}&maxRows=1&username={$geoNamesUser}";
    
    $response = file_get_contents($wikipediaUrl);
    if ($response === false) {
        echo json_encode(["error" => "Failed to fetch Wikipedia data"]);
        exit;
    }
    $wikiData = json_decode($response, true);
    if (isset($wikiData['geonames']) && count($wikiData['geonames']) > 0) {
        $article = $wikiData['geonames'][0];
        $wikipediaUrlResult = $article['wikipediaUrl'];
        // Ensure URL is complete (prepend https:// if necessary)
        if (strpos($wikipediaUrlResult, "http") !== 0) {
            $wikipediaUrlResult = "https://" . $wikipediaUrlResult;
        }
        $result = [
            "title"         => $article['title'],
            "summary"       => $article['summary'],
            "wikipediaUrl"  => $wikipediaUrlResult
        ];
        echo json_encode(["articles" => [$result]]);
    } else {
        echo json_encode(["error" => "No Wikipedia data found"]);
    }
    exit;
}

// 10. Fallback: Return list of all countries
$countries = [];
foreach ($data['features'] as $feature) {
    $countries[] = [
        "iso"  => $feature['properties']['iso_a2'],
        "name" => $feature['properties']['name']
    ];
}

echo json_encode($countries);
exit;
?>
