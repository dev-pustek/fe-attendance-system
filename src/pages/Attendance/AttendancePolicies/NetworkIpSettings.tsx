import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../api/hooks/useSettings';
import { showSuccess, showError } from '../../../utils/toast';
import { WifiIcon } from "@heroicons/react/24/outline";

const NetworkIpSettings: React.FC = () => {
  const { data: response, isLoading, createMutation, updateMutation } = useSettings({ limit: 100 });
  
  const [allowedIps, setAllowedIps] = useState<string>('');
  const [currentIp, setCurrentIp] = useState<string>('Memuat...');

  // Extract existing settings
  useEffect(() => {
    if (response?.data) {
      const ipsSetting = response.data.find((s: any) => s.key === 'ALLOWED_IPS');
      if (ipsSetting) setAllowedIps(ipsSetting.value);
    }
  }, [response]);

  // Fetch client IP
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setCurrentIp(data.ip))
      .catch(() => setCurrentIp('Tidak diketahui'));
  }, []);

  const handleSave = async () => {
    try {
      const ipsSetting = response?.data?.find((s: any) => s.key === 'ALLOWED_IPS');
      
      // Clean up string
      const cleanedIps = allowedIps.split(',')
        .map(ip => ip.trim())
        .filter(ip => ip !== '')
        .join(', ');

      if (ipsSetting) {
        await updateMutation.mutateAsync({ id: ipsSetting.id, data: { value: cleanedIps } });
      } else {
        await createMutation.mutateAsync({ 
          key: 'ALLOWED_IPS', 
          value: cleanedIps, 
          description: 'Comma-separated list of allowed network IP addresses for attendance' 
        });
      }

      setAllowedIps(cleanedIps);
      showSuccess('Pengaturan IP Jaringan berhasil disimpan!');
    } catch (err) {
      showError(err, 'Gagal menyimpan pengaturan IP Jaringan');
    }
  };

  const addCurrentIp = () => {
    if (currentIp && currentIp !== 'Tidak diketahui' && currentIp !== 'Memuat...') {
      const existing = allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip !== '');
      if (!existing.includes(currentIp)) {
        setAllowedIps(existing.length > 0 ? `${allowedIps}, ${currentIp}` : currentIp);
      }
    }
  };

  if (isLoading) return <div className="p-4 text-center text-gray-500">Memuat Pengaturan Jaringan...</div>;

  return (
    <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3 mb-4">
        <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Kebijakan IP Jaringan Global
        </h5>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <WifiIcon className="size-4" />
          IP Anda Saat Ini: <span className="font-mono text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded">{currentIp}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mb-6">
        Tentukan alamat IP jaringan mana yang diizinkan untuk check in dan check out. Jika ditentukan, pengguna akan diharuskan terhubung ke jaringan Wi-Fi sekolah. Pisahkan beberapa alamat IP dengan koma. Kosongkan atau gunakan <b>*</b> untuk mengizinkan alamat IP apa pun.
      </p>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Alamat IP yang Diizinkan
              </label>
              <button
                type="button"
                onClick={addCurrentIp}
                className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
              >
                + Tambahkan IP saya saat ini
              </button>
            </div>
            <textarea
              rows={3}
              value={allowedIps}
              onChange={(e) => setAllowedIps(e.target.value)}
              placeholder="misal. 203.0.113.1, 198.51.100.24"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white font-mono focus:border-brand-500 focus:ring-brand-500 resize-none shadow-sm"
            />
            <p className="text-xs text-gray-400 mt-2">
              Catatan: Jika server Anda berada di belakang proxy (seperti Cloudflare), pastikan header proxy diteruskan dengan benar agar ini berfungsi.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isLoading || updateMutation.isPending || createMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 text-sm font-medium transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50"
            >
              {updateMutation.isPending || createMutation.isPending ? 'Menyimpan...' : 'Simpan Kebijakan IP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkIpSettings;
