import React, { useState, useEffect } from 'react';
import PageMeta from '../../components/atoms/PageMeta';
import PageBreadcrumb from '../../components/molecules/PageBreadcrumb';
import { useSettings } from '../../api/hooks/useSettings';
import { showSuccess, showError } from '../../utils/toast';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER: [number, number] = [-6.200000, 106.816666]; // Jakarta

const LocationMapEvents = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 0.5 });
  }, [center, map]);
  return null;
};

const LocationSettings: React.FC = () => {
  const { data: response, isLoading, createMutation, updateMutation } = useSettings();
  
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [radius, setRadius] = useState<number | ''>('');

  // Extract existing settings
  useEffect(() => {
    if (response?.data) {
      const latSetting = response.data.find((s: any) => s.key === 'SCHOOL_LATITUDE');
      const lngSetting = response.data.find((s: any) => s.key === 'SCHOOL_LONGITUDE');
      const radiusSetting = response.data.find((s: any) => s.key === 'ATTENDANCE_RADIUS');

      if (latSetting) setLat(parseFloat(latSetting.value));
      if (lngSetting) setLng(parseFloat(lngSetting.value));
      if (radiusSetting) setRadius(parseFloat(radiusSetting.value));
    }
  }, [response]);

  const handleSave = async () => {
    if (lat === '' || lng === '' || radius === '') {
      showError(null, 'Please fill in all fields (Latitude, Longitude, Radius)');
      return;
    }

    try {
      // Find IDs if they exist
      const latSetting = response?.data?.find((s: any) => s.key === 'SCHOOL_LATITUDE');
      const lngSetting = response?.data?.find((s: any) => s.key === 'SCHOOL_LONGITUDE');
      const radiusSetting = response?.data?.find((s: any) => s.key === 'ATTENDANCE_RADIUS');

      // Save Latitude
      if (latSetting) {
        await updateMutation.mutateAsync({ id: latSetting.id, data: { value: lat.toString() } });
      } else {
        await createMutation.mutateAsync({ key: 'SCHOOL_LATITUDE', value: lat.toString(), description: 'Center Latitude for Geo-fencing' });
      }

      // Save Longitude
      if (lngSetting) {
        await updateMutation.mutateAsync({ id: lngSetting.id, data: { value: lng.toString() } });
      } else {
        await createMutation.mutateAsync({ key: 'SCHOOL_LONGITUDE', value: lng.toString(), description: 'Center Longitude for Geo-fencing' });
      }

      // Save Radius
      if (radiusSetting) {
        await updateMutation.mutateAsync({ id: radiusSetting.id, data: { value: radius.toString() } });
      } else {
        await createMutation.mutateAsync({ key: 'ATTENDANCE_RADIUS', value: radius.toString(), description: 'Max allowed radius in meters for check-ins' });
      }

      showSuccess('Location settings saved successfully!');
    } catch (err) {
      showError(err, 'Failed to save location settings');
    }
  };

  const center: [number, number] = (lat !== '' && lng !== '') ? [lat, lng] : DEFAULT_CENTER;

  return (
    <>
      <PageMeta title="Location Settings | Visia" description="Configure geo-fencing policies for attendance." />
      <PageBreadcrumb pageTitle="Location Policies" />

      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geo-Fencing Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Set the central coordinates for the school and the allowed check-in radius.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 h-fit">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Coordinates</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                  placeholder="-6.200000"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                  placeholder="106.816666"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Allowed Radius (Meters)
                </label>
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                  placeholder="50"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-500 mt-1">The maximum distance in meters a user can be from the center to check in.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={isLoading || updateMutation.isPending || createMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 disabled:opacity-50"
                >
                  {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden relative" style={{ height: '500px' }}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 text-sm font-medium text-gray-700 pointer-events-none">
              Click anywhere on the map to drop a pin
            </div>
            {/* key={center.join(',')} forces map re-render on initial load from API */}
            <MapContainer 
              key={lat !== '' ? 'loaded' : 'default'}
              center={center} 
              zoom={16} 
              scrollWheelZoom={true} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {lat !== '' && lng !== '' && (
                <>
                  <Marker position={[lat, lng]} />
                  {radius !== '' && (
                    <Circle 
                      center={[lat, lng]} 
                      radius={radius} 
                      pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }}
                    />
                  )}
                </>
              )}
              <LocationMapEvents onLocationSelect={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }} />
              <MapCenterUpdater center={center} />
            </MapContainer>
          </div>

        </div>
      </div>
    </>
  );
};

export default LocationSettings;
