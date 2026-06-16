import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../api/hooks/useSettings';
import { showSuccess, showError } from '../../../utils/toast';
import { ViewfinderCircleIcon } from "@heroicons/react/24/outline";

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

const GeoFencingSettings: React.FC = () => {
  const { data: response, isLoading, createMutation, updateMutation } = useSettings({ limit: 100 });
  
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [radius, setRadius] = useState<number | ''>('');
  const [isLocating, setIsLocating] = useState(false);

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
      showError(null, 'Harap isi semua bidang (Garis Lintang, Garis Bujur, Radius)');
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

      showSuccess('Pengaturan Geo-Fencing berhasil disimpan!');
    } catch (err) {
      showError(err, 'Gagal menyimpan pengaturan geo-fencing');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError(null, "Geolokasi tidak didukung oleh browser Anda.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsLocating(false);
        showSuccess("Lokasi diperbarui ke posisi Anda saat ini.");
      },
      (error) => {
        console.error("Geolocation error:", error);
        showError(null, "Tidak dapat mengambil lokasi Anda. Pastikan izin lokasi diberikan.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const center: [number, number] = (lat !== '' && lng !== '') ? [lat, lng] : DEFAULT_CENTER;

  if (isLoading) return <div className="p-4 text-center text-gray-500">Memuat Pengaturan Geo-Fencing...</div>;

  return (
    <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3 mb-4">
        <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500"></span>
            Pengaturan Geo-Fencing Global
        </h5>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-colors shadow-sm"
        >
          <ViewfinderCircleIcon className={`size-4 ${isLocating ? "animate-spin" : ""}`} />
          {isLocating ? "Mencari lokasi..." : "Dapatkan Lokasi Saat Ini"}
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-6">
        Koordinat ini menentukan titik pusat sekolah. Siswa harus berada dalam radius yang diizinkan agar berhasil check in saat kebijakan "Wajibkan Lokasi Geografis" diaktifkan.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Garis Lintang
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
              Garis Bujur
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
              Radius yang Diizinkan (Meter)
            </label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value !== '' ? parseFloat(e.target.value) : '')}
              placeholder="50"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading || updateMutation.isPending || createMutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 mt-4"
          >
            {updateMutation.isPending || createMutation.isPending ? 'Menyimpan...' : 'Simpan Geo-Fencing'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700" style={{ height: '350px' }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow border border-gray-200 text-xs font-medium text-gray-700 pointer-events-none">
            Klik peta untuk mengatur pusat
          </div>
          <MapContainer 
            key={lat !== '' ? 'loaded' : 'default'}
            center={center} 
            zoom={16} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
  );
};

export default GeoFencingSettings;
