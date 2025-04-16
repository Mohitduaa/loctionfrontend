import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const categoryOptions = [
  { label: "Electronics", value: "electronics_store" },
  { label: "Grocery", value: "grocery_or_supermarket" },
  { label: "Clothing", value: "clothing_store" },
  { label: "Restaurants", value: "restaurant" },
  { label: "Retail", value: "Retail" },
  { label: "Hotel", value: "Hotel" },
  


];

const GOOGLE_API_KEY = "AIzaSyBgptuoGhCr21LMSdv2-YDWDPyXNNjuQTI";

export default function NearbyStoreFinder() {
  const [manualLocation, setManualLocation] = useState("");
  const [category, setCategory] = useState("electronics_store");
  const [radius, setRadius] = useState(2); 
  const [stores, setStores] = useState([]);
  const inputRef = useRef(null);

  // Get photo URL from photo_reference
  const getPhotoUrl = (photoReference) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
  };

  // Setup Google Places Autocomplete
  useEffect(() => {
    if (window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setManualLocation(place.formatted_address);
        } else if (place.name) {
          setManualLocation(place.name);
        }
      });
    }
  }, []);

  // Use current location to get address
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const response = await axios.get(
              "https://maps.googleapis.com/maps/api/geocode/json",
              {
                params: {
                  latlng: `${latitude},${longitude}`,
                  key: GOOGLE_API_KEY,
                },
              }
            );

            const address = response.data.results[0]?.formatted_address;
            if (address) {
              setManualLocation(address);
            } else {
              alert("Location address not found.");
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            alert("Error getting address from location.");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to access location.");
        }
      );
    } else {
      alert("Geolocation not supported in this browser.");
    }
  };

  const fetchNearbyStores = async () => {
    if (!manualLocation) return alert("Enter a location");
  
    try {
      // Step 1: Get user location coordinates
      const geoRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address: manualLocation,
          key: GOOGLE_API_KEY,
        },
      });
  
      const userLocation = geoRes.data.results[0]?.geometry.location;
      if (!userLocation) return alert("Could not get user coordinates");
  
      const res = await axios.get("https://loaction.onrender.com/api/nearby-stores", {
        params: {
          address: manualLocation,
          radius: radius * 1000,
          type: category,
        },
      });
  
      // Step 2: Calculate distance for each store
      const storesWithDistance = res.data.results.map((store) => {
        const storeLocation = store.geometry.location;
        const distance = Math.sqrt(
          Math.pow(userLocation.lat - storeLocation.lat, 2) +
          Math.pow(userLocation.lng - storeLocation.lng, 2)
        );
        return { ...store, distance };
      });
  
      // Step 3: Sort by distance
      const sortedStores = storesWithDistance.sort((a, b) => a.distance - b.distance);
  
      setStores(sortedStores);
    } catch (err) {
      console.error("Error fetching stores:", err);
      alert("Error fetching nearby stores.");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Find Nearby Stores</h2>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <input
          ref={inputRef}
          className="p-2 border rounded flex-1"
          type="text"
          placeholder="Enter location (e.g. Hisar, Haryana)"
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
        />
        <button
          onClick={getCurrentLocation}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Use My Location
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select
          className="p-2 border rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categoryOptions.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <input
          className="p-2 border rounded w-28"
          type="number"
          placeholder="Radius (km)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />
        <button
          onClick={fetchNearbyStores}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {stores.length > 0 ? (
        <div className="space-y-4">
          {stores.map((store, index) => (
            <div
              key={index}
              className="border p-4 rounded shadow hover:bg-gray-50"
            >
              {store.photos && (
                <img
                  src={getPhotoUrl(store.photos[0].photo_reference)}
                  alt={store.name}
                  className="w-full h-48 object-cover rounded mb-2"
                />
              )}
              <h3 className="font-semibold text-lg">{store.name}</h3>
              <p>{store.vicinity}</p>
              {store.rating && <p>⭐ {store.rating}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No stores found or search not triggered.</p>
      )}
    </div>
  );
}
