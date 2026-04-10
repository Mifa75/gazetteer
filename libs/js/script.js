const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.remove();
      }, 1000); 
    });
    
  }

$(document).ready(function () {

  // Define a global variable for the found country's ISO code
  var foundCountryISO = null;

  // Initialize the map
  var map = L.map("map").setView([20, 0], 2);
  
  // Define base layers
  var streets = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles &copy; Esri" }
  ).addTo(map);
  
  var satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles &copy; Esri" }
  );
  
  var basemaps = { "Streets": streets, "Satellite": satellite };
  
  // Define overlay layers and add them to marker cluster group
  var overlayMaps = {
    "Airports": L.markerClusterGroup(),
    "Cities": L.markerClusterGroup(),
    "Universities": L.markerClusterGroup(),
    "Stadiums": L.markerClusterGroup()
  };

  // Add layer control to the map
  L.control.layers(basemaps, overlayMaps).addTo(map);
  
  // Variable to hold the current country border layer
  var borderLayer;

  function clearBorderLayer() {
    if (borderLayer) {
      map.removeLayer(borderLayer);
      borderLayer = null;
    }
  }
  
    // --- Function to populate the country select from your local GeoJSON file ---
    function populateCountriesFromGeoJSON(geoJsonUrl, callback) {
      $.getJSON(geoJsonUrl, function (geoData) {
        var countries = [];
        if (geoData && geoData.features) {
          geoData.features.forEach(function (feature) {
            if (
              feature.properties &&
              feature.properties.name &&
              feature.properties.iso_a2
            ) {
              countries.push({
                name: feature.properties.name,
                iso: feature.properties.iso_a2.toUpperCase() // ensure uppercase for matching
              });
            }
          });
        }
  
        // Optional: sort alphabetically by country name
        countries.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
  
        var select = $("#countrySelect");
        select.empty();
        select.append(new Option("Select a country", ""));
        countries.forEach(function (country) {
          select.append(new Option(country.name, country.iso));
        });
  
        if (callback) callback();
      }).fail(function (jqXHR, textStatus, errorThrown) {
        if (callback) callback();
      });
    }

    function getUserLocation(isoCode) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          function (position) {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
            
            // Center the map on the user's location
            map.setView([lat, lon], 6);
    
            // Reverse geocode to get the country info
            $.ajax({
              url: `https://nominatim.openstreetmap.org/reverse`,
              data: { format: "json", lat: lat, lon: lon },
              success: function (response) {
                let countryCode = response.address.country_code.toUpperCase();
                let countryName = response.address.country; // Assuming the API returns the country name
    
                // Fallback: if isoCode is undefined, use the reverse geocoded countryCode
                isoCode = isoCode || countryCode;
    
                // Fetch and draw the country border using the determined isoCode
                fetchCountryBorder(isoCode);
                $("#countrySelect").val(isoCode).change();
              }
            });
          },
          function (error) {
            if (error.code === error.PERMISSION_DENIED) { 
              // Default map view 
              map.setView([20, 0], 2); 
              Toastify({ 
                text: "Geolocation denied. Showing default map view.", 
                duration: 3000, 
                gravity: "top", 
                position: "center", 
                style: {
                  backgroundColor: "#FF6F61",
                },
              }).showToast(); 
            }
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    }
  
    // --- Function to fetch and display a country’s border ---
    function fetchCountryBorder(isoCode) {
      $.getJSON("libs/php/sourceAPIs.php?iso=" + isoCode, function (data) {
        clearBorderLayer();
        if (data.geometry) {
          borderLayer = L.geoJSON(data.geometry, { color: "red" }).addTo(map);
          map.fitBounds(borderLayer.getBounds());
        } 
      }).fail(function(jqXHR, textStatus, errorThrown) {
          console.error("Error fetching border data:", textStatus, errorThrown);
      });
    }
  
    // --- Function to fetch overlay features (Airports, Cities, etc.) ---
    function fetchData(layerGroup, featureType, isoCode) {
      // Clear any previous markers
      layerGroup.clearLayers();
    
      // Object mapping of feature types to custom icons
      const iconMapping = {
        airports: L.ExtraMarkers.icon({
          icon: "fa-plane",
          markerColor: "orange",
          shape: "penta",
          prefix: "fa",
          svg: true
        }),
        cities: L.ExtraMarkers.icon({
          icon: "fa-city",
          markerColor: "red",
          shape: "penta",
          prefix: "fa",
          svg: true
        }),
        universities: L.ExtraMarkers.icon({
          icon: "fa-building-columns",
          markerColor: "blue",
          shape: "penta",
          prefix: "fa",
          svg: true
        }),
        stadiums: L.ExtraMarkers.icon({
          icon: "fa-futbol",
          markerColor: "green",
          shape: "penta",
          prefix: "fa",
          svg: true
        })
      };
    
      // Retrieve the icon based on the featureType key
      let icon = iconMapping[featureType] || null;
    
      // Build parameters for the API request
      let params = { type: featureType };
      if (isoCode) {
        params.country = isoCode;
      }
    
      $.getJSON("libs/php/sourceAPIs.php", params, function (response) {
        response.forEach(function (place) {
          if (place.lat && place.lng) {
            let marker = L.marker([place.lat, place.lng], { icon: icon }).bindPopup(
              `<b>${place.name}</b><br>${place.countryName}`
            );
            layerGroup.addLayer(marker);
          }
        });
      });
    }
    
    
  
    // Load overlay data (layers will appear in the layer control when selected)
    Object.entries(overlayMaps).forEach(function ([key, layerGroup]) {
      fetchData(layerGroup, key.toLowerCase());
    });
  
    // --- EasyButtons to show modals only when clicked ---
    var infoBtn = L.easyButton('<i class="fa fa-info fa-lg"></i>', function (btn, map) {
      $("#modalGazetteer").modal("show");
    }).addTo(map);
  
    var weatherBtn = L.easyButton('<i class="fa-solid fa-cloud"></i>', function (btn, map) {
      let isoCode = $("#countrySelect").val();
      if (isoCode) {
          fetchWeatherAndForecastCapital(isoCode);
      }
      $("#modalWeather").modal("show");
    }).addTo(map);
  
    var currencyBtn = L.easyButton('<i class="fa-solid fa-money-bill-transfer"></i>', function (btn, map) {
        $("#modalCurrency").modal("show");
      }
    ).addTo(map);

    var newsBtn = L.easyButton('<i class="fa fa-newspaper"></i>', function (btn, map) {
      $("#modalNews").modal("show");
    }).addTo(map);

    var wikiBtn = L.easyButton('<i class="fa-brands fa-wikipedia-w"></i>', function (btn, map) {
      $("#modalWiki").modal("show");
    }).addTo(map);
    
    function fetchWeatherAndForecastCapital(isoCode) {
      $("#pre-load").removeClass("fadeOut").show();
      $.getJSON(`libs/php/sourceAPIs.php?weatherCapital=1&iso=${isoCode}`, function(data) {
        if (data.error) {
          $("#pre-load").addClass("fadeOut");
          alert("Weather error: " + data.error);
          return;
        }
         // 1) Current Weather
        const capitalCity = data.capital;
        const countryName = $("#countrySelect option:selected").text();
        $("#weatherModalLabel").text(`${countryName} - ${capitalCity}`);
        const w = data.weather;
       
        $("#todayConditions").html(w.weather[0].description); 
        $("#todayIcon").attr("src", `http://openweathermap.org/img/wn/${w.weather[0].icon}@2x.png`);
        $("#todayMaxTemp").html(Math.round(w.main.temp_max));
        $("#todayMinTemp").html(Math.round(w.main.temp_min));
    
        // 2) 5-day Forecast data
        const f = data.forecast;
           
        // --- We only want the next 2 days. ---
        const dailyGroups = {};
        f.list.forEach(item => {
          const datePart = item.dt_txt.split(" ")[0]; // e.g. "2025-02-28"
          if (!dailyGroups[datePart]) dailyGroups[datePart] = [];
          dailyGroups[datePart].push(item);
        });
    
        const sortedDates = Object.keys(dailyGroups).sort();
        
        const todayStr = new Date().toISOString().split("T")[0];
        const futureDates = sortedDates.filter(d => d !== todayStr);
    
        const day1 = futureDates[0]; 
        const day2 = futureDates[1];
    
        // We’ll just pick the "average" or "max/min" from that day’s group
        function getDayMinMax(dateKey) {
          let group = dailyGroups[dateKey] || [];
          let temps = group.map(g => g.main.temp);
          let condition = group[0].weather[0].description; 
          let icon = group[0].weather[0].icon;
          let min = Math.round(Math.min(...temps));
          let max = Math.round(Math.max(...temps));
          return {min, max, condition, icon};
        }
    
        // Day 1
        if (day1) {
          let info1 = getDayMinMax(day1);
          $("#day1Date").text(Date.parse(day1).toString("ddd dS"));  // e.g. "Fri 1st"
          $("#day1Icon").attr("src", `http://openweathermap.org/img/wn/${info1.icon}@2x.png`);
          $("#day1MinTemp").text(info1.min);
          $("#day1MaxTemp").text(info1.max);
        }
    
        // Day 2
        if (day2) {
          let info2 = getDayMinMax(day2);
          $("#day2Date").text(Date.parse(day2).toString("ddd dS"));
          $("#day2Icon").attr("src", `http://openweathermap.org/img/wn/${info2.icon}@2x.png`);
          $("#day2MinTemp").text(info2.min);
          $("#day2MaxTemp").text(info2.max);
        }
    
        const lastUpdatedTime = new Date().toString("HH:mm, dS MMM");
        $("#lastUpdated").text(lastUpdatedTime);

        $("#pre-load").addClass("fadeOut");
      }).fail(function(jqXHR) {
        $("#pre-load").addClass("fadeOut");
        alert("Weather request failed: " + jqXHR.status + " " + jqXHR.statusText);
      });
    }

    $('#modalWeather').on('hidden.bs.modal', function (e) {
      $("#todayConditions").html("");
      $("#todayIcon").attr("src", "");
      $("#todayMaxTemp").html("");
      $("#todayMinTemp").html("");
    
      $("#day1Date").text("");
      $("#day1Icon").attr("src", "");
      $("#day1MinTemp").text("");
      $("#day1MaxTemp").text("");
    
      $("#day2Date").text("");
      $("#day2Icon").attr("src", "");
      $("#day2MinTemp").text("");
      $("#day2MaxTemp").text("");
    
      $("#lastUpdated").text("");
    });

    // --- Function to fetch country details (update modal content only) ---
    function fetchCountryDetails(isoCode) {
      $.getJSON("libs/php/sourceAPIs.php?countryInfo=1&iso=" + isoCode, function (data) {
            
        // 1) Update the Gazetteer modal with country details
        let rows = $("#modalGazetteer .modal-body table tr");
        $(rows[0]).find("td.text-end").text(data.continent);
        $(rows[1]).find("td.text-end").text(data.capital);
        $(rows[2]).find("td.text-end").text(numeral(data.areaInSqKm).format("0,0") + " km²");
        $(rows[3]).find("td.text-end").text(data.currencyCode);
        $(rows[4]).find("td.text-end").text(numeral(data.population).format("0,0"));
        $(rows[5]).find("td.text-end").text(data.languages);
    
        // 2) If a currency code is available, set #currencies to it and do an immediate conversion
        if (data.currencyCode) {
          $("#currencies").val(data.currencyCode);
          convertCurrency(); // This calls your conversion function if you want an immediate result
        }
      });
    }
    

    

    // --- Currency Conversion (unchanged) ---
    function populateCurrencyDropdown() {
      $.getJSON("libs/php/sourceAPIs.php?getCurrencyCodes=1", function (data) {
            
        let select = $("#currencies");
        select.empty();
           
        // Populate each code
        data.supported_codes.forEach(function ([code, name]) {
          select.append(new Option(`${name} (${code})`, code));
        });
      });
    }

    function convertCurrency() {
      let amount       = $("#fromAmount").val();
      let fromCurrency = "USD";               // or read from another dropdown if you like
      let toCurrency   = $("#currencies").val();
    
      // If missing, clear the result
      if (!toCurrency || !amount) {
        $("#toAmount").val("");
        return;
      }
    
      $.getJSON("libs/php/sourceAPIs.php", {
        convertCurrency: 1,
        from:   fromCurrency,
        to:     toCurrency,
        amount: amount
      })
      .done(function (data) {
        if (data.error) {
          $("#toAmount").val("");
          return;
        }
        // data.result is the final converted amount
        $("#toAmount").val(data.result);
      })
      .fail(function (err) {
        $("#toAmount").val("");
      });
    }
    
    populateCurrencyDropdown();

    // --- Fetch the newsdata.io into modal
    function fetchNews(isoCode) {
      if (!isoCode) {
        // If no country code, just clear or show a message
        $("#newsContent").html("<p>No country selected.</p>");
        return;
      }
    
      $.getJSON("libs/php/sourceAPIs.php", { news: 1, iso: isoCode }, function (data) {
        if (data.error) {
          // If the PHP returns an error key
          $("#newsContent").html("<p>" + data.error + "</p>");
          return;
        }
    
        if (!data.results || data.results.length === 0) {
          $("#newsContent").html("<p>No news available at the moment.</p>");
          return;
        }

        // Sort articles in descending order (most recent first)
        let articles = data.results;
        articles.sort((a, b) => {
          return new Date(b.pubDate) - new Date(a.pubDate);
        });
    
        // Build HTML for each article
        let html = "";
        articles.forEach((article) => {
          const title = article.title || "Untitled";
          const formattedTime = article.pubDate ? Date.parse(article.pubDate).toString('h:mm tt') : "";
          const link = article.link || "#";
          const source = article.source_id || "";
          const imageUrl = article.image_url || "";
    
          html += `<div class="mb-3">
        ${imageUrl ? `<img src="${imageUrl}" alt="Article Image" class="img-fluid mb-2">` : ""}
          <strong>${title}</strong><br>
          <small>${formattedTime}</small><br>
          <small class="text-muted">${source}</small><br>
          <a href="${link}" target="_blank">Read More...</a>
          <hr>
        </div>`;
        });
    
        $("#newsContent").html(html);
      }).fail(function (jqxhr, textStatus, error) {
         $("#newsContent").html("<p>Error loading news. Please try again later.</p>");
      });
    }

    function fetchLocationData(isoCode) {
      $.getJSON("libs/php/sourceAPIs.php?countryInfo=1&iso=" + isoCode, function (data) {
            
          let lat = data.lat;
          let lng = data.lng;
           
          // Custom markers
          var orangeMarker = L.ExtraMarkers.icon({
              icon: 'fa-plane',
              markerColor: 'orange',
              shape: 'penta',
              prefix: 'fa'
          });
  
          var redMarker = L.ExtraMarkers.icon({
              icon: 'fa-city',
              markerColor: 'red',
              shape: 'penta',
              prefix: 'fa'
          });
  
          var blueMarker = L.ExtraMarkers.icon({
              icon: 'fa-building-columns',
              markerColor: 'blue',
              shape: 'penta',
              prefix: 'fa'
          });
  
          var greenMarker = L.ExtraMarkers.icon({
              icon: 'fa-futbol',
              markerColor: 'green',
              shape: 'penta',
              prefix: 'fa'
          });
  
          // Add markers dynamically
          L.marker([lat, lng], { icon: orangeMarker }).addTo(overlayMaps["Airports"]);
          L.marker([lat, lng], { icon: redMarker }).addTo(overlayMaps["Cities"]);
          L.marker([lat, lng], { icon: blueMarker }).addTo(overlayMaps["Universities"]);
          L.marker([lat, lng], { icon: greenMarker }).addTo(overlayMaps["Stadiums"]);
      });
  }
    
  // --- Function to retrieve information from Wikipedia using the country name
function fetchWikipedia() {
  // Get the country name from the dropdown (assuming the option text holds the country name)
  var countryName = $("#countrySelect option:selected").text();
  if (!countryName || countryName === "Select a country") {
    $("#wikiContent").html("<p>No country selected (missing country name).</p>");
    return;
  }

  $("#wikiContent").html("<p>Loading Wikipedia information...</p>");
  
  $.getJSON("libs/php/sourceAPIs.php", { wikipedia: 1, countryName: countryName }, function (data) {
    if (data.error) {
      $("#wikiContent").html("<p>" + data.error + "</p>");
    } else if (data.articles && data.articles.length > 0) {
      var article = data.articles[0];
      $("#wikiContent").html(`
        <h4>${article.title}</h4>
        <p>${article.summary}</p>
        <a href="${article.wikipediaUrl}" target="_blank">Read more on Wikipedia</a>
      `);
    } else {
      $("#wikiContent").html("<p>No Wikipedia information found.</p>");
    }
  }).fail(function () {
    $("#wikiContent").html("<p>Error fetching Wikipedia information.</p>");
  });
}

  // When any modal starts to hide, blur the active element
  $('.modal').on('hide.bs.modal', function () {
    document.activeElement.blur();
  });
    
    // --- Combined event handler for when a country is selected from the dropdown ---
    $("#countrySelect").on("change", function () {
      let isoCode = $(this).val();
      if (!isoCode) return;
      fetchCountryBorder(isoCode);
      fetchCountryDetails(isoCode);
      fetchWeatherAndForecastCapital(isoCode);
      fetchNews(isoCode);
      fetchLocationData(isoCode);
      fetchWikipedia(); 

      // Re-fetch overlay data for the new country
      Object.entries(overlayMaps).forEach(function ([key, layerGroup]) {
        fetchData(layerGroup, key.toLowerCase(), isoCode);
      });
    });

    
  
    $("#cur1").on("input", convertCurrency);
    $("#fromAmount, #currencies").on("input change", convertCurrency);
    // --- Initialize: Populate country select from GeoJSON, then get user location ---
    populateCountriesFromGeoJSON("data/countryBorders.geo.json", getUserLocation);

  });
  