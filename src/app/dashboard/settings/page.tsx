"use client";

import { useContext } from 'react';
import { SidebarContext } from '../layout';
import NotificationSettings from '@/components/NotificationSettings';

export default function SettingsPage() {
  const { isSidebarOpen } = useContext(SidebarContext);

  return (
    <div className="flex flex-col">
      <div className={`sticky top-0 w-full h-full py-6 px-10 z-40 transition-shadow duration-200 ${!isSidebarOpen ? '' : ''}`}>
        <div className={`flex justify-between items-center pt-14 xl:pt-0`}>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">Settings</h1>
            <p className="text-zinc-600 mt-1">Manage your notification preferences</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-6">
            <NotificationSettings />
          </div>
        </div>
      </div>
    </div>
  );
} 