import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface NotificationSettings {
  notify_before_minutes: number;
  notify_on_due: boolean;
  notify_on_overdue: boolean;
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_before_minutes: 30,
    notify_on_due: true,
    notify_on_overdue: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkPushSupport();
    loadSettings();
  }, []);

  const checkPushSupport = async () => {
    try {
      const supported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;
      
      if (supported) {
        // Check if service worker is registered
        const registration = await navigator.serviceWorker.ready;
        if (!registration) {
          setPushSupported(false);
          return;
        }
        
        // Check if push subscription is possible
        const permission = await Notification.permission;
        if (permission === 'denied') {
          setPushSupported(false);
          return;
        }
        
        setPushSupported(true);
      } else {
        setPushSupported(false);
      }
    } catch (err) {
      console.error('Error checking push support:', err);
      setPushSupported(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          notify_before_minutes: data.notify_before_minutes,
          notify_on_due: data.notify_on_due,
          notify_on_overdue: data.notify_on_overdue
        });
        setPushEnabled(!!data.push_subscription);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Starting save process...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }
      console.log('User found:', user.id);

      // First check if settings exist
      const { data: existingSettings, error: checkError } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking settings:', checkError);
        throw checkError;
      }

      console.log('Existing settings:', existingSettings);

      if (existingSettings) {
        console.log('Updating existing settings...');
        // Update existing settings
        const { error: updateError } = await supabase
          .from('notification_settings')
          .update({
            notify_before_minutes: settings.notify_before_minutes,
            notify_on_due: settings.notify_on_due,
            notify_on_overdue: settings.notify_on_overdue
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        console.log('Settings updated successfully');
      } else {
        console.log('Creating new settings...');
        // Insert new settings
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            notify_before_minutes: settings.notify_before_minutes,
            notify_on_due: settings.notify_on_due,
            notify_on_overdue: settings.notify_on_overdue
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('Settings created successfully');
      }

      // Show success message
      setError(null);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('notification_settings')
          .upsert({
            user_id: user.id,
            push_subscription: subscription.toJSON()
          });

        if (error) throw error;
        setPushEnabled(true);
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-800">Notification Settings</h2>
      
      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      {!pushSupported && (
        <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
          Push notifications are not supported in your browser
        </div>
      )}

      {pushSupported && !pushEnabled && (
        <button
          onClick={requestNotificationPermission}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Enable Push Notifications
        </button>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Notify before due time (minutes)
          </label>
          <input
            type="number"
            value={settings.notify_before_minutes}
            onChange={(e) => setSettings({ ...settings, notify_before_minutes: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="1440"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notify_on_due"
            checked={settings.notify_on_due}
            onChange={(e) => setSettings({ ...settings, notify_on_due: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="notify_on_due" className="text-sm font-medium text-zinc-700">
            Notify when task is due
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notify_on_overdue"
            checked={settings.notify_on_overdue}
            onChange={(e) => setSettings({ ...settings, notify_on_overdue: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="notify_on_overdue" className="text-sm font-medium text-zinc-700">
            Notify when task is overdue
          </label>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
} 