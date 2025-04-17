import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const categoryOptions = [
  { 
    label: "Electronics", 
    value: "electronics_store",
    subcategories: [
      { label: "All Electronics", value: "electronics_store" },
      { label: "Mobile Phones", value: "mobile_phone_store" },
      { label: "Computer Stores", value: "computer_store" },
      { label: "Camera Stores", value: "camera_store" }
    ]
  },
  { 
    label: "Grocery", 
    value: "grocery_or_supermarket",
    subcategories: [
      { label: "All Grocery", value: "grocery_or_supermarket" },
      { label: "Supermarkets", value: "supermarket" },
      { label: "Convenience Stores", value: "convenience_store" }
    ]
  },
  { 
    label: "Clothing", 
    value: "clothing_store",
    subcategories: [
      { label: "All Clothing", value: "clothing_store" },
      { label: "Men's Clothing", value: "mens_clothing_store" },
      { label: "Women's Clothing", value: "womens_clothing_store" },
      { label: "Shoe Stores", value: "shoe_store" }
    ]
  },
  { 
    label: "Restaurants", 
    value: "restaurant",
    subcategories: [
      { label: "All Restaurants", value: "restaurant" },
      { label: "Fast Food", value: "fast_food_restaurant" },
      { label: "Indian", value: "indian_restaurant" },
      { label: "Italian", value: "italian_restaurant" },
      { label: "Chinese", value: "chinese_restaurant" },
      { label: "Mexican", value: "mexican_restaurant" }
    ]
  },
  { 
    label: "Retail", 
    value: "Retail",
    subcategories: [
      { label: "All Retail", value: "Retail" },
      { label: "Department Stores", value: "department_store" },
      { label: "Shopping Malls", value: "shopping_mall" }
    ]
  },
  { 
    label: "Hotel", 
    value: "Hotel",
    subcategories: [
      { label: "All Hotels", value: "Hotel" },
      { label: "Resorts", value: "resort" },
      { label: "Motels", value: "motel" }
    ]
  }
];

const GOOGLE_API_KEY = "AIzaSyBgptuoGhCr21LMSdv2-YDWDPyXNNjuQTI";

export default function NearbyStoreFinder() {
  const [manualLocation, setManualLocation] = useState("");
  const [category, setCategory] = useState("electronics_store");
  const [subcategory, setSubcategory] = useState("electronics_store");
  const [radius, setRadius] = useState(2);
  const [keyword, setKeyword] = useState("");
  const [stores, setStores] = useState([]);
  const inputRef = useRef(null);
  const [activeSubcategories, setActiveSubcategories] = useState([]);

  // Update subcategories when category changes
  useEffect(() => {
    const selectedCategory = categoryOptions.find(cat => cat.value === category);
    if (selectedCategory) {
      setActiveSubcategories(selectedCategory.subcategories || []);
      setSubcategory(selectedCategory.subcategories?.[0]?.value || category);
    }
  }, [category]);

  // Get photo URL from photo_reference
  const getPhotoUrl = (photoReference) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
  };

  // Calculate distance in miles between two coordinates
  const calculateDistanceInMiles = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceInKm = R * c;
    return (distanceInKm * 0.621371).toFixed(1); // Convert to miles
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
          type: subcategory,
          keyword: keyword
        },
      });
  
      // Step 2: Calculate distance for each store
      const storesWithDistance = res.data.results.map((store) => {
        const storeLocation = store.geometry.location;
        const distance = calculateDistanceInMiles(
          userLocation.lat, 
          userLocation.lng,
          storeLocation.lat,
          storeLocation.lng
        );
        return { 
          ...store, 
          distance,
          userLocation 
        };
      });
  
      // Step 3: Sort by distance
      const sortedStores = storesWithDistance.sort((a, b) => a.distance - b.distance);
  
      setStores(sortedStores);
    } catch (err) {
      console.error("Error fetching stores:", err);
      alert("Error fetching nearby stores.");
    }
  };

  // Open store in Google Maps
  const openInGoogleMaps = (store) => {
    const storeLocation = store.geometry.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${storeLocation.lat},${storeLocation.lng}`;
    window.open(url, '_blank');
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

        {activeSubcategories.length > 0 && (
          <select
            className="p-2 border rounded"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
          >
            {activeSubcategories.map((subcat) => (
              <option key={subcat.value} value={subcat.value}>
                {subcat.label}
              </option>
            ))}
          </select>
        )}

        <input
          className="p-2 border rounded w-28"
          type="number"
          placeholder="Radius (km)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />

        <input
          className="p-2 border rounded flex-1"
          type="text"
          placeholder="Keyword (e.g. pizza, wifi)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
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
              className="border p-4 rounded shadow hover:bg-gray-50 cursor-pointer"
              onClick={() => openInGoogleMaps(store)}
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
              {store.rating && <p>⭐ {store.rating} ({store.user_ratings_total || 0} reviews)</p>}
              {store.distance && <p>📍 {store.distance} miles away</p>}
              <button 
                className="mt-2 text-blue-600 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  openInGoogleMaps(store);
                }}
              >
                View on Map
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No stores found or search not triggered.</p>
      )}
    </div>
  );
}